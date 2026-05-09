import { useEffect, useMemo, useState } from "react";
import { items, itemsList, displayName, meta } from "./data";
import {
  loadSystems,
  newSystem,
  saveSystems,
  type ProductionSystem,
} from "./systems";
import { ItemDetail } from "./components/ItemDetail";
import { SystemView } from "./components/SystemView";
import "./App.css";

type Selection =
  | { kind: "none" }
  | { kind: "item"; itemClass: string }
  | { kind: "system"; systemId: string };

function systemSummary(s: ProductionSystem): string {
  const ts = s.targets.filter((t) => t.item);
  const ss = s.sources.filter((src) => src.item);
  if (ts.length === 0) return "не настроена";
  const head = ts
    .slice(0, 2)
    .map((t) => {
      const it = items[t.item as string];
      return `${t.ratePerMin} ${it ? displayName(it) : (t.item ?? "?")}`;
    })
    .join(", ");
  const more = ts.length > 2 ? ` +${ts.length - 2}` : "";
  const srcSuffix = ss.length > 0 ? ` ← ${ss.length} источ.` : "";
  return head + more + srcSuffix;
}

export default function App() {
  const [systems, setSystems] = useState<ProductionSystem[]>(() => loadSystems());
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    saveSystems(systems);
  }, [systems]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itemsList;
    return itemsList.filter(
      (i) =>
        (i.nameRu ?? "").toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.className.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedSystem =
    selection.kind === "system"
      ? (systems.find((s) => s.id === selection.systemId) ?? null)
      : null;
  const selectedItem =
    selection.kind === "item" ? (items[selection.itemClass] ?? null) : null;

  function addSystem() {
    const sys = newSystem();
    setSystems((prev) => [...prev, sys]);
    setSelection({ kind: "system", systemId: sys.id });
  }

  function updateSystem(next: ProductionSystem) {
    setSystems((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }

  function deleteSystem(id: string) {
    setSystems((prev) => prev.filter((s) => s.id !== id));
    if (selection.kind === "system" && selection.systemId === id) {
      setSelection({ kind: "none" });
    }
  }

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

        <div className="section-head">
          <span>Системы</span>
          <button
            type="button"
            className="add-btn"
            onClick={addSystem}
            title="Создать новую систему"
            aria-label="Создать систему"
          >
            +
          </button>
        </div>
        <div className="system-list">
          {systems.length === 0 && (
            <div className="empty pad">
              Нажми «+» — создай первую цепочку.
            </div>
          )}
          {systems.map((s) => {
            const isActive =
              selection.kind === "system" && selection.systemId === s.id;
            const summary = systemSummary(s);
            return (
              <button
                key={s.id}
                type="button"
                className={`system-row ${isActive ? "is-active" : ""}`}
                onClick={() => setSelection({ kind: "system", systemId: s.id })}
              >
                <span className="system-name-label">{s.name}</span>
                <span className="system-target">{summary}</span>
              </button>
            );
          })}
        </div>

        <div className="section-head">
          <span>Предметы</span>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Поиск (рус / англ / className)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="item-list">
          {filteredItems.length === 0 && (
            <div className="empty pad">Ничего не найдено</div>
          )}
          {filteredItems.map((i) => {
            const isActive =
              selection.kind === "item" && selection.itemClass === i.className;
            return (
              <button
                key={i.className}
                type="button"
                className={`item-row ${isActive ? "is-active" : ""}`}
                onClick={() =>
                  setSelection({ kind: "item", itemClass: i.className })
                }
              >
                <span className={`dot form-${i.form}`} />
                <span className="item-names">
                  <span className="ru">{displayName(i)}</span>
                  {i.nameRu && <span className="en">{i.name}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="detail">
        {selectedSystem && (
          <SystemView
            system={selectedSystem}
            onChange={updateSystem}
            onDelete={() => deleteSystem(selectedSystem.id)}
          />
        )}
        {selectedItem && <ItemDetail item={selectedItem} />}
        {!selectedSystem && !selectedItem && (
          <div className="placeholder">
            <p>Выбери систему или предмет в сайдбаре,</p>
            <p>либо нажми «+», чтобы создать новую цепочку.</p>
          </div>
        )}
      </main>
    </div>
  );
}
