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
  effectiveMachines: number;
  machines: number;
  clockPercent: number;
  inputs: Flow[];
  outputs: Flow[];
  powerMW: number;
}

export interface SourceUsage {
  item: string;
  available: number;
  consumed: number;
  // > 1 means we don't have enough; the chain will be scaled down.
  utilisation: number;
}

export interface Solution {
  targets: Flow[]; // achieved rates (may be < requested if scaled down)
  requestedTargets: Flow[]; // what the user asked for
  scale: number; // 1.0 = at full request; < 1 = scaled down by source bottleneck
  steps: ProductionStep[];
  rawInputs: Flow[]; // resources the chain demands
  sourceUsage: SourceUsage[]; // declared sources with consumption
  byproducts: Flow[];
  totalPowerMW: number;
  warnings: string[];
}

export interface SystemSpec {
  targets: Flow[];
  sources: Flow[];
}

// Average power per machine for a recipe in its building, at 100% clock.
function basePowerMW(recipe: Recipe, building: Building): number {
  const { constant, factor } = recipe.variablePower;
  const recipeOverridesPower = constant !== 0 || factor !== 1;
  if (recipeOverridesPower) return constant + factor / 2;
  if (building.variablePower) {
    return (building.variablePower.min + building.variablePower.max) / 2;
  }
  return building.powerMW;
}

export type ClockMode = "snap5" | "fixed100";

const CLOCK_SNAP_PERCENT = 5;
const CEIL_EPSILON = 1e-6;

function ceilWhole(x: number): number {
  return Math.ceil(x - CEIL_EPSILON);
}

function snapClockPercent(rawFraction: number): number {
  if (rawFraction <= 0) return 0;
  const stepsNeeded = Math.ceil(
    (rawFraction * 100) / CLOCK_SNAP_PERCENT - CEIL_EPSILON,
  );
  return Math.min(stepsNeeded * CLOCK_SNAP_PERCENT, 100);
}

function physicalConfig(
  cyclesPerMin: number,
  recipe: Recipe,
  building: Building | null,
  clockMode: ClockMode,
) {
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

// Core expansion: given a set of demanded items × rates, recursively expand
// using default recipes, aggregating cycles per recipe and crediting
// byproducts. Returns the steps plus the raw input rates.
function expandDemand(
  initialDemand: Flow[],
  clockMode: ClockMode,
): {
  steps: ProductionStep[];
  rawInputs: Map<string, number>;
  byproducts: Map<string, number>;
  warnings: string[];
} {
  const stepsByRecipe = new Map<string, ProductionStep>();
  const rawInputs = new Map<string, number>();
  const byproductCredits = new Map<string, number>();
  const warnings: string[] = [];

  const demand = new Map<string, number>();
  for (const t of initialDemand) {
    if (t.ratePerMin > 0) {
      demand.set(t.item, (demand.get(t.item) ?? 0) + t.ratePerMin);
    }
  }

  let iter = 0;
  while (demand.size) {
    if (++iter > MAX_ITERATIONS) {
      warnings.push(
        `Превышен лимит итераций (${MAX_ITERATIONS}) — возможен цикл в рецептах.`,
      );
      break;
    }

    const entry = demand.entries().next().value;
    if (!entry) break;
    const [item, requestedRate] = entry;
    demand.delete(item);
    if (requestedRate <= 1e-9) continue;

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
      rawInputs.set(item, (rawInputs.get(item) ?? 0) + needed);
      continue;
    }

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

    for (const ing of recipe.ingredients) {
      demand.set(ing.item, (demand.get(ing.item) ?? 0) + ing.amount * deltaCycles);
    }
    for (const prod of recipe.products) {
      if (prod.item === item) continue;
      byproductCredits.set(
        prod.item,
        (byproductCredits.get(prod.item) ?? 0) + prod.amount * deltaCycles,
      );
    }
  }

  return {
    steps: [...stepsByRecipe.values()],
    rawInputs,
    byproducts: byproductCredits,
    warnings,
  };
}

const itemKey = (c: string) => items[c]?.nameRu ?? items[c]?.name ?? c;
const itemName = (c: string) => items[c]?.nameRu ?? items[c]?.name ?? c;
const collator = new Intl.Collator("ru", { sensitivity: "base" });

// Wraps expandDemand and packages a Solution. `clockMode` determines whether
// machines are snapped to 5%-stepped underclocks or pinned at 100%.
function buildSolution(
  achievedTargets: Flow[],
  requestedTargets: Flow[],
  scale: number,
  declaredSources: Flow[],
  clockMode: ClockMode,
  extraWarnings: string[],
): Solution {
  const expansion = expandDemand(achievedTargets, clockMode);

  const rawList: Flow[] = [...expansion.rawInputs.entries()].map(
    ([item, ratePerMin]) => ({ item, ratePerMin }),
  );
  rawList.sort((a, b) => collator.compare(itemKey(a.item), itemKey(b.item)));

  const byproducts: Flow[] = [];
  for (const [item, rate] of expansion.byproducts) {
    if (rate > 1e-6) byproducts.push({ item, ratePerMin: rate });
  }
  byproducts.sort((a, b) => collator.compare(itemKey(a.item), itemKey(b.item)));

  const sourceUsage: SourceUsage[] = declaredSources.map((src) => {
    const consumed = expansion.rawInputs.get(src.item) ?? 0;
    const utilisation = src.ratePerMin > 0 ? consumed / src.ratePerMin : 0;
    return {
      item: src.item,
      available: src.ratePerMin,
      consumed,
      utilisation,
    };
  });
  sourceUsage.sort((a, b) => collator.compare(itemKey(a.item), itemKey(b.item)));

  const totalPowerMW = expansion.steps.reduce((sum, s) => sum + s.powerMW, 0);

  return {
    targets: achievedTargets,
    requestedTargets,
    scale,
    steps: expansion.steps,
    rawInputs: rawList,
    sourceUsage,
    byproducts,
    totalPowerMW,
    warnings: [...extraWarnings, ...expansion.warnings],
  };
}

// Solve a system spec. If `sources` is empty, behaves like classic target mode
// (snap5 clocking). If sources are declared, runs at fixed-100% clocks; if any
// declared source is insufficient at the requested target rates, ALL targets
// are scaled down proportionally so the bottleneck source is exactly met.
export function solveSystem(spec: SystemSpec): Solution {
  const targets = spec.targets.filter((t) => t.item && t.ratePerMin > 0);
  const sources = spec.sources.filter((s) => s.item && s.ratePerMin > 0);

  if (targets.length === 0) {
    return {
      targets: [],
      requestedTargets: [],
      scale: 1,
      steps: [],
      rawInputs: [],
      sourceUsage: sources.map((s) => ({
        item: s.item,
        available: s.ratePerMin,
        consumed: 0,
        utilisation: 0,
      })),
      byproducts: [],
      totalPowerMW: 0,
      warnings: [],
    };
  }

  if (sources.length === 0) {
    return buildSolution(targets, targets, 1, sources, "snap5", []);
  }

  // Probe: how much of each declared source the chain consumes at the
  // requested target rates.
  const probe = expandDemand(targets, "snap5");

  let maxRatio = 0;
  let limiting: Flow | null = null;
  for (const src of sources) {
    const consumed = probe.rawInputs.get(src.item) ?? 0;
    if (consumed <= 0) continue;
    const ratio = consumed / src.ratePerMin;
    if (ratio > maxRatio) {
      maxRatio = ratio;
      limiting = src;
    }
  }

  const warnings: string[] = [];
  let scale = 1;
  if (maxRatio > 1 && limiting) {
    scale = 1 / maxRatio;
    warnings.push(
      `Цепочка масштабирована до ${(scale * 100).toFixed(1)}% запрошенного из-за лимита по «${itemName(limiting.item)}».`,
    );
  }

  const achieved =
    scale === 1
      ? targets
      : targets.map((t) => ({ item: t.item, ratePerMin: t.ratePerMin * scale }));

  // When the user is mixing sources into the spec they're planning around
  // hard input limits — keep clocks at 100% for predictability.
  return buildSolution(achieved, targets, scale, sources, "fixed100", warnings);
}
