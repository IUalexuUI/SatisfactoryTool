import { items, recipesByProduct, buildings } from "./data";
import type { Recipe, Building } from "./data/types";

// Pick a deterministic default recipe for an item.
// Preference order:
//   1. Raw resources (FGResourceDescriptor — ores, water, oil, gas) are
//      always extracted, never crafted. Returning null routes them to the
//      raw-input list. Without this, the solver would pick exotic Converter
//      recipes (e.g. "Iron Ore from Limestone via SAM") which are valid
//      recipes in 1.0 but never the default expectation.
//   2. Non-alternate where this item is the FIRST product (e.g. Plastic
//      recipe for Desc_Plastic_C, not via some byproduct path).
//   3. Any non-alternate that lists this item as a product.
//   4. Any recipe (last resort: alt-only items).
// Returns null for items with no recipe (raw resources / equipment / etc.).
export function pickDefaultRecipe(itemClassName: string): Recipe | null {
  if (items[itemClassName]?.kind === "FGResourceDescriptor") return null;
  const candidates = recipesByProduct.get(itemClassName);
  if (!candidates?.length) return null;
  const primaryNonAlt = candidates.find(
    (r) => !r.alternate && r.products[0]?.item === itemClassName,
  );
  if (primaryNonAlt) return primaryNonAlt;
  const anyNonAlt = candidates.find((r) => !r.alternate);
  if (anyNonAlt) return anyNonAlt;
  return candidates[0] ?? null;
}

export interface Flow {
  item: string;
  ratePerMin: number;
}

export interface ProductionStep {
  recipe: Recipe;
  building: Building | null;
  cyclesPerMin: number;
  // Continuous/ideal machine count to satisfy demand at 100% clock — useful as
  // a diagnostic, but never built physically.
  effectiveMachines: number;
  // Whole machines actually constructed (ceil of effectiveMachines).
  machines: number;
  // Clock percent rounded UP to a multiple of CLOCK_SNAP_PERCENT (5%).
  // 5..100. The physical setup runs slightly faster than strictly needed,
  // capacity is left as headroom.
  clockPercent: number;
  inputs: Flow[]; // demand-side rates (logical, what the chain consumes)
  outputs: Flow[]; // demand-side rates (includes byproducts)
  powerMW: number; // total for all machines × clock^exponent
}

export interface Solution {
  target: Flow;
  steps: ProductionStep[];
  rawInputs: Flow[]; // resources to extract
  byproducts: Flow[]; // surplus outputs not consumed downstream
  totalPowerMW: number;
  warnings: string[];
}

// Average power per machine for a recipe in its building, at 100% clock.
// Variable-power recipes encode their range as (constant, factor):
//   power(x) = constant + factor * x, where x is uniform on [0, 1].
//   so mean = constant + factor / 2.
// For non-variable recipes (factor == 1, constant == 0 by default), use the
// building's static powerMW or — for variable-power buildings without recipe-
// specific encoding — the midpoint of the building's min/max range.
function basePowerMW(recipe: Recipe, building: Building): number {
  const { constant, factor } = recipe.variablePower;
  const recipeOverridesPower = constant !== 0 || factor !== 1;
  if (recipeOverridesPower) {
    return constant + factor / 2;
  }
  if (building.variablePower) {
    return (building.variablePower.min + building.variablePower.max) / 2;
  }
  return building.powerMW;
}

// Clock rate snapping. Players can only configure clocks in 5% increments
// in the game UI (and round numbers tend to be the practical defaults).
const CLOCK_SNAP_PERCENT = 5;
const CEIL_EPSILON = 1e-6;

function ceilWhole(x: number): number {
  return Math.ceil(x - CEIL_EPSILON);
}

function snapClockPercent(rawFraction: number): number {
  if (rawFraction <= 0) return 0;
  // Round UP to the nearest multiple of CLOCK_SNAP_PERCENT.
  const stepsNeeded = Math.ceil(
    (rawFraction * 100) / CLOCK_SNAP_PERCENT - CEIL_EPSILON,
  );
  const snapped = stepsNeeded * CLOCK_SNAP_PERCENT;
  // Don't auto-overclock past 100% — that would require power shards.
  return Math.min(snapped, 100);
}

// `snap5` snaps clock UP to nearest 5%; minimal capacity headroom.
// `fixed100` runs every machine at 100% (capacity exceeds demand — input-limited
//   chains effectively under-produce, but the user has chosen to plan this way).
export type ClockMode = "snap5" | "fixed100";

function physicalConfig(
  cyclesPerMin: number,
  recipe: Recipe,
  building: Building | null,
  clockMode: ClockMode,
): {
  effectiveMachines: number;
  machines: number;
  clockPercent: number;
  powerMW: number;
} {
  const effective = (cyclesPerMin * recipe.durationSec) / 60;
  const machines = Math.max(ceilWhole(effective), effective > 0 ? 1 : 0);
  if (machines === 0) {
    return { effectiveMachines: 0, machines: 0, clockPercent: 0, powerMW: 0 };
  }
  const clockPercent =
    clockMode === "fixed100" ? 100 : snapClockPercent(effective / machines);
  if (!building) {
    return { effectiveMachines: effective, machines, clockPercent, powerMW: 0 };
  }
  const base = basePowerMW(recipe, building);
  const clockFrac = clockPercent / 100;
  const powerPerMachine = base * Math.pow(clockFrac, building.powerExponent);
  return {
    effectiveMachines: effective,
    machines,
    clockPercent,
    powerMW: powerPerMachine * machines,
  };
}

const MAX_ITERATIONS = 5000;

export function solveTarget(
  targetItem: string,
  targetRatePerMin: number,
  clockMode: ClockMode = "snap5",
): Solution {
  const stepsByRecipe = new Map<string, ProductionStep>();
  const rawInputs = new Map<string, number>();
  const byproductCredits = new Map<string, number>(); // available surplus
  const warnings: string[] = [];

  // Aggregate demand still to satisfy.
  const demand = new Map<string, number>();
  demand.set(targetItem, targetRatePerMin);

  let iter = 0;
  while (demand.size) {
    if (++iter > MAX_ITERATIONS) {
      warnings.push(
        `Превышен лимит итераций (${MAX_ITERATIONS}) — возможен цикл в рецептах.`,
      );
      break;
    }

    // Pop one demand entry.
    const entry = demand.entries().next().value;
    if (!entry) break;
    const [item, requestedRate] = entry;
    demand.delete(item);

    if (requestedRate <= 1e-9) continue;

    // Try to satisfy from byproduct surplus first.
    let needed = requestedRate;
    const credit = byproductCredits.get(item) ?? 0;
    if (credit > 0) {
      const used = Math.min(credit, needed);
      byproductCredits.set(item, credit - used);
      needed -= used;
      if (needed <= 1e-9) continue;
    }

    const recipe = pickDefaultRecipe(item);
    if (!recipe) {
      rawInputs.set(item, (rawInputs.get(item) ?? 0) + needed);
      continue;
    }

    const productEntry = recipe.products.find((p) => p.item === item);
    if (!productEntry || productEntry.amount <= 0) {
      // Should not happen — pickDefaultRecipe filters, but be safe.
      rawInputs.set(item, (rawInputs.get(item) ?? 0) + needed);
      continue;
    }

    // Cycles per minute we need to add to satisfy the remaining demand.
    const deltaCycles = needed / productEntry.amount;
    const existing = stepsByRecipe.get(recipe.className);
    const newCycles = (existing?.cyclesPerMin ?? 0) + deltaCycles;
    const buildingClass = recipe.producedIn[0] ?? null;
    const building = buildingClass ? (buildings[buildingClass] ?? null) : null;
    const phys = physicalConfig(newCycles, recipe, building, clockMode);

    stepsByRecipe.set(recipe.className, {
      recipe,
      building,
      cyclesPerMin: newCycles,
      effectiveMachines: phys.effectiveMachines,
      machines: phys.machines,
      clockPercent: phys.clockPercent,
      powerMW: phys.powerMW,
      inputs: recipe.ingredients.map((i) => ({
        item: i.item,
        ratePerMin: i.amount * newCycles,
      })),
      outputs: recipe.products.map((p) => ({
        item: p.item,
        ratePerMin: p.amount * newCycles,
      })),
    });

    // Add delta-worth of ingredient demand.
    for (const ing of recipe.ingredients) {
      const add = ing.amount * deltaCycles;
      demand.set(ing.item, (demand.get(ing.item) ?? 0) + add);
    }

    // Credit the delta-worth of byproducts (i.e. products other than `item`).
    for (const prod of recipe.products) {
      if (prod.item === item) continue;
      const made = prod.amount * deltaCycles;
      byproductCredits.set(
        prod.item,
        (byproductCredits.get(prod.item) ?? 0) + made,
      );
    }
  }

  // Any remaining byproduct surplus that we didn't consume becomes output.
  const byproducts: Flow[] = [];
  for (const [item, rate] of byproductCredits) {
    if (rate > 1e-6) byproducts.push({ item, ratePerMin: rate });
  }

  const steps = [...stepsByRecipe.values()];
  const rawInputsList: Flow[] = [...rawInputs.entries()].map(
    ([item, ratePerMin]) => ({ item, ratePerMin }),
  );
  const totalPowerMW = steps.reduce((sum, s) => sum + s.powerMW, 0);

  // Sort raw inputs and byproducts by item display name for stable rendering.
  const collator = new Intl.Collator("ru", { sensitivity: "base" });
  const itemKey = (c: string) => items[c]?.nameRu ?? items[c]?.name ?? c;
  rawInputsList.sort((a, b) => collator.compare(itemKey(a.item), itemKey(b.item)));
  byproducts.sort((a, b) => collator.compare(itemKey(a.item), itemKey(b.item)));

  return {
    target: { item: targetItem, ratePerMin: targetRatePerMin },
    steps,
    rawInputs: rawInputsList,
    byproducts,
    totalPowerMW,
    warnings,
  };
}

// Source mode: given a fixed supply of one raw input, compute the chain at
// fixed-100% clock and the maximum sustainable target rate.
//
// We probe the chain with a unit-rate target solve to discover how much of
// the source resource a single unit of the target consumes, then scale.
// All other raw resources required by the chain are reported as additional
// inputs the player must arrange — they are not constraints here.
export function solveSource(
  sourceItem: string,
  sourceRatePerMin: number,
  targetItem: string,
): Solution {
  const itemName = (c: string) =>
    items[c]?.nameRu ?? items[c]?.name ?? c;

  if (sourceRatePerMin <= 0) {
    return emptySolution(targetItem, [
      "Скорость подачи сырья должна быть больше нуля.",
    ]);
  }

  const probe = solveTarget(targetItem, 1, "snap5");
  const sourceUsage = probe.rawInputs.find((r) => r.item === sourceItem);
  if (!sourceUsage || sourceUsage.ratePerMin <= 0) {
    return emptySolution(targetItem, [
      `«${itemName(targetItem)}» не использует «${itemName(sourceItem)}» в качестве сырья.`,
    ]);
  }

  const targetRate = sourceRatePerMin / sourceUsage.ratePerMin;
  return solveTarget(targetItem, targetRate, "fixed100");
}

function emptySolution(targetItem: string, warnings: string[]): Solution {
  return {
    target: { item: targetItem, ratePerMin: 0 },
    steps: [],
    rawInputs: [],
    byproducts: [],
    totalPowerMW: 0,
    warnings,
  };
}
