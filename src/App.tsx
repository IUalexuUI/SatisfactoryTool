import { useEffect, useMemo, useState } from "react";
import { items, itemsList, meta } from "./data";
import {
  loadSystems,
  newSystem,
  saveSystems,
  type ProductionSystem,
} from "./systems";
import { ItemDetail } from "./components/ItemDetail";
import { SystemView } from "./components/SystemView";
import { useI18n, format, type Lang } from "./i18n/index.tsx";
import "./App.css";

type Selection =
  | { kind: "none" }
  | { kind: "item"; itemClass: string }
  | { kind: "system"; systemId: string };

export default function App() {
  const { t, name, lang, setLang } = useI18n();
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

  function summary(s: ProductionSystem): string {
    const ts = s.targets.filter((tg) => tg.item);
    const ss = s.sources.filter((sr) => sr.item);
    if (ts.length === 0) return t.sidebar.notConfigured;
    const head = ts
      .slice(0, 2)
      .map((tg) => {
        const it = items[tg.item as string];
        return `${tg.ratePerMin} ${it ? name(it) : (tg.item ?? "?")}`;
      })
      .join(", ");
    const more = ts.length > 2 ? ` +${ts.length - 2}` : "";
    const srcSuffix = ss.length > 0 ? ` ← ${ss.length} ${t.sidebar.sourcesShort}` : "";
    return head + more + srcSuffix;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-name">SatisfactoryTool</span>
          <span className="app-brand-meta">
            {format(t.statsTemplate, {
              items: meta.counts.items,
              recipes: meta.counts.recipes,
              alts: meta.counts.alternateRecipes,
            })}
          </span>
        </div>
        <LangSwitch lang={lang} onChange={setLang} />
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="section-head">
            <span>{t.sidebar.systems}</span>
            <button
              type="button"
              className="add-btn"
              onClick={addSystem}
              title={t.sidebar.addSystemTitle}
              aria-label={t.sidebar.addSystemAria}
            >
              <PlusIcon />
            </button>
          </div>
          <div className="system-list">
            {systems.length === 0 && (
              <div className="empty pad">{t.sidebar.noSystems}</div>
            )}
            {systems.map((s) => {
              const isActive =
                selection.kind === "system" && selection.systemId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`system-row ${isActive ? "is-active" : ""}`}
                  onClick={() =>
                    setSelection({ kind: "system", systemId: s.id })
                  }
                >
                  <span className="system-name-label">{s.name}</span>
                  <span className="system-target">{summary(s)}</span>
                </button>
              );
            })}
          </div>

          <div className="section-head">
            <span>{t.sidebar.items}</span>
          </div>
          <input
            className="search"
            type="search"
            placeholder={t.sidebar.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="item-list">
            {filteredItems.length === 0 && (
              <div className="empty pad">{t.sidebar.nothingFound}</div>
            )}
            {filteredItems.map((i) => {
              const isActive =
                selection.kind === "item" &&
                selection.itemClass === i.className;
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
                    <span className="ru">{name(i)}</span>
                    {(lang === "ru" ? i.nameRu : null) && (
                      <span className="en">{i.name}</span>
                    )}
                    {lang === "en" && i.nameRu && (
                      <span className="en">{i.nameRu}</span>
                    )}
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
              <p>{t.placeholder.pickFromSidebar}</p>
              <p>{t.placeholder.orCreate}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 1 L6 11 M1 6 L11 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LangSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  const langs: Lang[] = ["ru", "en"];
  return (
    <div className="lang-switch" role="radiogroup" aria-label="Language">
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          className={`lang-btn ${lang === l ? "is-active" : ""}`}
          onClick={() => onChange(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
