import { useMemo } from "react";
import { items, displayName } from "../data";
import { solveTarget, solveSource } from "../solver";
import {
  switchMode,
  type ProductionSystem,
  type SystemMode,
} from "../systems";
import { ItemPicker } from "./ItemPicker";
import { SolutionView } from "./SolutionView";

interface Props {
  system: ProductionSystem;
  onChange: (next: ProductionSystem) => void;
  onDelete: () => void;
}

const isRawResource = (className: string) =>
  items[className]?.kind === "FGResourceDescriptor";

export function SystemView({ system, onChange, onDelete }: Props) {
  const solution = useMemo(() => {
    if (system.mode === "target") {
      if (!system.targetItem || system.targetRatePerMin <= 0) return null;
      return solveTarget(system.targetItem, system.targetRatePerMin);
    }
    if (
      !system.sourceItem ||
      !system.targetItem ||
      system.sourceRatePerMin <= 0
    )
      return null;
    return solveSource(
      system.sourceItem,
      system.sourceRatePerMin,
      system.targetItem,
    );
  }, [system]);

  const targetItem = system.targetItem ? items[system.targetItem] : null;
  const isReady =
    system.mode === "target"
      ? Boolean(system.targetItem && system.targetRatePerMin > 0)
      : Boolean(
          system.sourceItem && system.targetItem && system.sourceRatePerMin > 0,
        );

  return (
    <>
      <header className="detail-head system-head">
        <input
          className="system-name"
          type="text"
          value={system.name}
          onChange={(e) => onChange({ ...system, name: e.target.value })}
          aria-label="Название системы"
        />
        <button
          className="system-delete"
          type="button"
          onClick={() => {
            if (confirm(`Удалить систему «${system.name}»?`)) onDelete();
          }}
        >
          Удалить
        </button>
      </header>

      <div className="mode-switcher" role="radiogroup" aria-label="Режим">
        {(["target", "source"] as SystemMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={system.mode === m}
            className={`mode-btn ${system.mode === m ? "is-active" : ""}`}
            onClick={() => onChange(switchMode(system, m))}
          >
            {m === "target" ? "Цель" : "От сырья"}
          </button>
        ))}
      </div>

      <section className="system-form">
        {system.mode === "target" ? (
          <TargetForm system={system} onChange={onChange} />
        ) : (
          <SourceForm system={system} onChange={onChange} />
        )}
      </section>

      {!isReady && (
        <p className="empty pad">
          {system.mode === "target"
            ? "Выбери целевой предмет, чтобы рассчитать цепочку."
            : "Выбери источник, скорость подачи и целевой предмет."}
        </p>
      )}

      {isReady && solution && (
        <SolutionView
          solution={solution}
          targetLabel={
            targetItem ? displayName(targetItem) : (system.targetItem ?? "")
          }
          mode={system.mode}
        />
      )}
    </>
  );
}

// ---------- per-mode forms ----------

function TargetForm({
  system,
  onChange,
}: {
  system: Extract<ProductionSystem, { mode: "target" }>;
  onChange: (next: ProductionSystem) => void;
}) {
  return (
    <>
      <div className="form-row">
        <label className="form-label">Целевой предмет</label>
        <ItemPicker
          value={system.targetItem}
          onChange={(className) =>
            onChange({ ...system, targetItem: className })
          }
          placeholder="Что делаем?"
        />
      </div>
      <div className="form-row">
        <label className="form-label" htmlFor={`rate-${system.id}`}>
          Скорость, шт/мин
        </label>
        <input
          id={`rate-${system.id}`}
          className="form-input"
          type="number"
          min="0"
          step="any"
          value={system.targetRatePerMin}
          onChange={(e) =>
            onChange({
              ...system,
              targetRatePerMin: Number(e.target.value) || 0,
            })
          }
        />
      </div>
    </>
  );
}

function SourceForm({
  system,
  onChange,
}: {
  system: Extract<ProductionSystem, { mode: "source" }>;
  onChange: (next: ProductionSystem) => void;
}) {
  return (
    <>
      <div className="form-row">
        <label className="form-label">Сырьё</label>
        <ItemPicker
          value={system.sourceItem}
          onChange={(className) =>
            onChange({ ...system, sourceItem: className })
          }
          placeholder="Какой ресурс есть?"
          filterFn={isRawResource}
        />
      </div>
      <div className="form-row">
        <label className="form-label" htmlFor={`src-rate-${system.id}`}>
          Подача сырья, ед/мин
        </label>
        <input
          id={`src-rate-${system.id}`}
          className="form-input"
          type="number"
          min="0"
          step="any"
          value={system.sourceRatePerMin}
          onChange={(e) =>
            onChange({
              ...system,
              sourceRatePerMin: Number(e.target.value) || 0,
            })
          }
        />
      </div>
      <div className="form-row">
        <label className="form-label">Целевой предмет</label>
        <ItemPicker
          value={system.targetItem}
          onChange={(className) =>
            onChange({ ...system, targetItem: className })
          }
          placeholder="Что делаем из сырья?"
        />
      </div>
    </>
  );
}
