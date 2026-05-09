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
  machineCount: number;
  inputs: Flow[];
  outputs: Flow[]; // includes byproducts
  powerMW: number; // total for all machines in this step
}

export interface Solution {
  target: Flow;
  steps: ProductionStep[];
  rawInputs: Flow[]; // resources to extract
  byproducts: Flow[]; // surplus outputs not consumed downstream
  totalPowerMW: number;
  warnings: string[];
}

// Average power per machine for a recipe in its building.
// Variable-power recipes encode their range as (constant, factor):
//   power(x) = constant + factor * x, where x is uniform on [0, 1].
//   so mean = constant + factor / 2.
// For non-variable recipes (factor == 1, constant == 0 by default), use the
// building's static powerMW or — for variable-power buildings without recipe-
// specific encoding — the midpoint of the building's min/max range.
function recipePowerMW(recipe: Recipe, building: Building): number {
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

const MAX_ITERATIONS = 5000;

export function solveTarget(
  targetItem: string,
  targetRatePerMin: number,
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
    const machineCount = (newCycles * recipe.durationSec) / 60;
    const powerPerMachine = building ? recipePowerMW(recipe, building) : 0;

    stepsByRecipe.set(recipe.className, {
      recipe,
      building,
      cyclesPerMin: newCycles,
      machineCount,
      powerMW: powerPerMachine * machineCount,
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
