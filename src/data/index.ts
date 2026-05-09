import itemsJson from "./items.json";
import recipesJson from "./recipes.json";
import buildingsJson from "./buildings.json";
import extractorsJson from "./extractors.json";
import generatorsJson from "./generators.json";
import metaJson from "./meta.json";
import type {
  Item,
  Recipe,
  Building,
  Extractor,
  Generator,
  DataMeta,
} from "./types";

export const items = itemsJson as Record<string, Item>;
export const recipes = recipesJson as Record<string, Recipe>;
export const buildings = buildingsJson as Record<string, Building>;
export const extractors = extractorsJson as Record<string, Extractor>;
export const generators = generatorsJson as Record<string, Generator>;
export const meta = metaJson as DataMeta;

const collator = new Intl.Collator("ru", { sensitivity: "base" });

export const itemsList: Item[] = Object.values(items).sort((a, b) =>
  collator.compare(a.nameRu ?? a.name, b.nameRu ?? b.name),
);

function buildIndex(pick: (r: Recipe) => ItemAmountLike[]): Map<string, Recipe[]> {
  const idx = new Map<string, Recipe[]>();
  for (const r of Object.values(recipes)) {
    for (const e of pick(r)) {
      const list = idx.get(e.item);
      if (list) list.push(r);
      else idx.set(e.item, [r]);
    }
  }
  return idx;
}

interface ItemAmountLike {
  item: string;
  amount: number;
}

export const recipesByProduct: Map<string, Recipe[]> = buildIndex((r) => r.products);
export const recipesByIngredient: Map<string, Recipe[]> = buildIndex(
  (r) => r.ingredients,
);

export function ratePerMin(amount: number, durationSec: number): number {
  if (!durationSec) return 0;
  return (amount * 60) / durationSec;
}

export function displayName(it: { nameRu: string | null; name: string }): string {
  return it.nameRu ?? it.name;
}
