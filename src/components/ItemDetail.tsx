import {
  recipesByProduct,
  recipesByIngredient,
  displayName,
} from "../data";
import type { Item } from "../data/types";
import { RecipeCard } from "./RecipeCard";

export function ItemDetail({ item }: { item: Item }) {
  const producedBy = recipesByProduct.get(item.className) ?? [];
  const usedIn = recipesByIngredient.get(item.className) ?? [];

  return (
    <>
      <header className="detail-head">
        <h2>{displayName(item)}</h2>
        {item.nameRu && <div className="subtitle">{item.name}</div>}
        <div className="badges">
          <span className={`badge form-${item.form}`}>{item.form}</span>
          {item.sinkPoints > 0 && (
            <span className="badge">⨺ {item.sinkPoints}</span>
          )}
          {item.energyMJ > 0 && (
            <span className="badge">⚡ {item.energyMJ} МДж</span>
          )}
          {item.radioactive && (
            <span className="badge badge-danger">☢ радиоактивно</span>
          )}
        </div>
        {item.description && <p className="desc">{item.description}</p>}
      </header>

      <section className="recipe-group">
        <h3>
          Производится <span className="count">{producedBy.length}</span>
        </h3>
        {producedBy.length === 0 && (
          <p className="empty">Сырьё либо предмет добывается экстрактором.</p>
        )}
        {producedBy.map((r) => (
          <RecipeCard key={r.className} recipe={r} />
        ))}
      </section>

      <section className="recipe-group">
        <h3>
          Используется <span className="count">{usedIn.length}</span>
        </h3>
        {usedIn.length === 0 && (
          <p className="empty">Не входит ни в один производственный рецепт.</p>
        )}
        {usedIn.map((r) => (
          <RecipeCard key={r.className} recipe={r} />
        ))}
      </section>
    </>
  );
}
