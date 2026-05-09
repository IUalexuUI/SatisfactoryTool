import { items, buildings, ratePerMin, displayName } from "../data";
import type { Recipe } from "../data/types";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const machineRefs = recipe.producedIn
    .map((c) => buildings[c])
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  const machineLabel = machineRefs.length
    ? machineRefs.map((m) => displayName(m)).join(", ")
    : recipe.producedIn.join(", ");

  return (
    <article className={`recipe ${recipe.alternate ? "is-alt" : ""}`}>
      <header className="recipe-head">
        <span className="recipe-name">{displayName(recipe)}</span>
        <span className="recipe-meta">
          <span className="machine">{machineLabel}</span>
          <span className="duration">{recipe.durationSec}с</span>
        </span>
      </header>
      <div className="recipe-flow">
        <ul className="flow-side">
          {recipe.ingredients.map((ing) => {
            const it = items[ing.item];
            return (
              <li key={ing.item}>
                <span className={`dot form-${it?.form ?? "solid"}`} />
                <span className="ent-name">
                  {it ? displayName(it) : ing.item}
                </span>
                <span className="ent-rate">
                  {ing.amount} ({ratePerMin(ing.amount, recipe.durationSec).toFixed(1)}/мин)
                </span>
              </li>
            );
          })}
        </ul>
        <span className="arrow" aria-hidden="true">→</span>
        <ul className="flow-side">
          {recipe.products.map((p) => {
            const it = items[p.item];
            return (
              <li key={p.item}>
                <span className={`dot form-${it?.form ?? "solid"}`} />
                <span className="ent-name">
                  {it ? displayName(it) : p.item}
                </span>
                <span className="ent-rate">
                  {p.amount} ({ratePerMin(p.amount, recipe.durationSec).toFixed(1)}/мин)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}
