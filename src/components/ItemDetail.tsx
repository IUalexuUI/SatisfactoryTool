import { recipesByProduct, recipesByIngredient } from "../data";
import type { Item } from "../data/types";
import { useI18n } from "../i18n/index.tsx";
import { RecipeCard } from "./RecipeCard";

export function ItemDetail({ item }: { item: Item }) {
  const { t, name, lang } = useI18n();
  const producedBy = recipesByProduct.get(item.className) ?? [];
  const usedIn = recipesByIngredient.get(item.className) ?? [];
  const subtitle = lang === "ru" ? item.name : item.nameRu;

  return (
    <>
      <header className="detail-head">
        <h2>{name(item)}</h2>
        {subtitle && subtitle !== name(item) && (
          <div className="subtitle">{subtitle}</div>
        )}
        <div className="badges">
          <span className={`badge form-${item.form}`}>{item.form}</span>
          {item.sinkPoints > 0 && (
            <span className="badge">⨺ {item.sinkPoints}</span>
          )}
          {item.energyMJ > 0 && (
            <span className="badge">
              ⚡ {item.energyMJ} {t.units.energyMJ}
            </span>
          )}
          {item.radioactive && (
            <span className="badge badge-danger">☢ {t.item.radioactive}</span>
          )}
        </div>
        {item.description && <p className="desc">{item.description}</p>}
      </header>

      <section className="recipe-group">
        <h3>
          {t.item.produces} <span className="count">{producedBy.length}</span>
        </h3>
        {producedBy.length === 0 && (
          <p className="empty">{t.item.producedEmpty}</p>
        )}
        {producedBy.map((r) => (
          <RecipeCard key={r.className} recipe={r} />
        ))}
      </section>

      <section className="recipe-group">
        <h3>
          {t.item.usedIn} <span className="count">{usedIn.length}</span>
        </h3>
        {usedIn.length === 0 && <p className="empty">{t.item.usedEmpty}</p>}
        {usedIn.map((r) => (
          <RecipeCard key={r.className} recipe={r} />
        ))}
      </section>
    </>
  );
}
