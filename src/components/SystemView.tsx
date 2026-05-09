import { useMemo } from "react";
import { items, displayName } from "../data";
import { solveTarget } from "../solver";
import type { ProductionSystem } from "../systems";
import { ItemPicker } from "./ItemPicker";
import { SolutionView } from "./SolutionView";

interface Props {
  system: ProductionSystem;
  onChange: (next: ProductionSystem) => void;
  onDelete: () => void;
}

export function SystemView({ system, onChange, onDelete }: Props) {
  const solution = useMemo(() => {
    if (!system.targetItem || system.targetRatePerMin <= 0) return null;
    return solveTarget(system.targetItem, system.targetRatePerMin);
  }, [system.targetItem, system.targetRatePerMin]);

  const targetItem = system.targetItem ? items[system.targetItem] : null;

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

      <section className="system-form">
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
      </section>

      {!targetItem && (
        <p className="empty pad">Выбери целевой предмет, чтобы рассчитать цепочку.</p>
      )}

      {targetItem && solution && (
        <SolutionView
          solution={solution}
          targetLabel={displayName(targetItem)}
        />
      )}
    </>
  );
}
