import { useState, useMemo } from "react";
import {
  items,
  buildings,
  itemsList,
  recipesByProduct,
  recipesByIngredient,
  ratePerMin,
  displayName,
  meta,
} from "./data";
import type { Item, Recipe } from "./data/types";
import "./App.css";

function RecipeCard({ recipe }: { recipe: Recipe }) {
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

function ItemDetail({ item }: { item: Item }) {
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

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itemsList;
    return itemsList.filter(
      (i) =>
        (i.nameRu ?? "").toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.className.toLowerCase().includes(q),
    );
  }, [query]);

  const selected = selectedClass ? (items[selectedClass] ?? null) : null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>SatisfactoryTool</h1>
          <div className="brand-meta">
            {meta.counts.items} предметов · {meta.counts.recipes} рецептов
            ({meta.counts.alternateRecipes} альт.)
          </div>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Поиск (рус / англ / className)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="item-list">
          {filtered.length === 0 && (
            <div className="empty pad">Ничего не найдено</div>
          )}
          {filtered.map((i) => (
            <button
              key={i.className}
              type="button"
              className={`item-row ${selectedClass === i.className ? "is-active" : ""}`}
              onClick={() => setSelectedClass(i.className)}
            >
              <span className={`dot form-${i.form}`} />
              <span className="item-names">
                <span className="ru">{displayName(i)}</span>
                {i.nameRu && <span className="en">{i.name}</span>}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <main className="detail">
        {selected ? (
          <ItemDetail item={selected} />
        ) : (
          <div className="placeholder">
            <p>Выбери предмет в списке слева.</p>
            <p className="hint">
              Поиск работает по русскому и английскому названию или ClassName.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
