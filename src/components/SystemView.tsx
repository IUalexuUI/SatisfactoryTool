import { useMemo } from "react";
import { items } from "../data";
import { solveSystem, type SystemSpec } from "../solver";
import {
  emptyFlow,
  type FlowEntry,
  type ProductionSystem,
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
  const spec: SystemSpec = useMemo(
    () => ({
      targets: system.targets
        .filter((t) => t.item)
        .map((t) => ({ item: t.item as string, ratePerMin: t.ratePerMin })),
      sources: system.sources
        .filter((s) => s.item)
        .map((s) => ({ item: s.item as string, ratePerMin: s.ratePerMin })),
    }),
    [system.targets, system.sources],
  );

  const solution = useMemo(
    () => (spec.targets.length > 0 ? solveSystem(spec) : null),
    [spec],
  );

  function updateList(
    key: "targets" | "sources",
    fn: (list: FlowEntry[]) => FlowEntry[],
  ) {
    onChange({ ...system, [key]: fn(system[key]) });
  }

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

      <FlowEditor
        title="Конечные предметы"
        helper="Что хочешь получать на выходе и в каком количестве"
        flows={system.targets}
        onAdd={() => updateList("targets", (l) => [...l, emptyFlow()])}
        onUpdate={(idx, patch) =>
          updateList("targets", (l) =>
            l.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
          )
        }
        onRemove={(idx) =>
          updateList("targets", (l) => l.filter((_, i) => i !== idx))
        }
        ratePlaceholder="шт/мин"
      />

      <FlowEditor
        title="Сырьё (необязательно)"
        helper="Если задано — solver масштабирует выход под доступное сырьё. Здания работают на 100%."
        flows={system.sources}
        onAdd={() => updateList("sources", (l) => [...l, emptyFlow()])}
        onUpdate={(idx, patch) =>
          updateList("sources", (l) =>
            l.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
          )
        }
        onRemove={(idx) =>
          updateList("sources", (l) => l.filter((_, i) => i !== idx))
        }
        filterFn={isRawResource}
        emptyMessage="Сырьё не ограничено — добавь «+», если хочешь задать лимит"
        ratePlaceholder="ед/мин"
      />

      {!solution && (
        <p className="empty pad">Добавь конечный предмет, чтобы рассчитать цепочку.</p>
      )}

      {solution && solution.targets.length > 0 && (
        <SolutionView solution={solution} />
      )}
    </>
  );
}

interface FlowEditorProps {
  title: string;
  helper?: string;
  flows: FlowEntry[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<FlowEntry>) => void;
  onRemove: (index: number) => void;
  filterFn?: (className: string) => boolean;
  emptyMessage?: string;
  ratePlaceholder?: string;
}

function FlowEditor({
  title,
  helper,
  flows,
  onAdd,
  onUpdate,
  onRemove,
  filterFn,
  emptyMessage,
  ratePlaceholder,
}: FlowEditorProps) {
  return (
    <section className="flow-editor">
      <header className="flow-editor-head">
        <div>
          <h3>{title}</h3>
          {helper && <p className="flow-editor-helper">{helper}</p>}
        </div>
        <button
          type="button"
          className="add-btn small"
          onClick={onAdd}
          aria-label={`Добавить в «${title}»`}
          title="Добавить"
        >
          +
        </button>
      </header>
      {flows.length === 0 && emptyMessage && (
        <p className="empty">{emptyMessage}</p>
      )}
      {flows.map((f, idx) => (
        <div key={f.id} className="flow-row">
          <ItemPicker
            value={f.item}
            onChange={(c) => onUpdate(idx, { item: c })}
            filterFn={filterFn}
            placeholder="Выбери предмет…"
          />
          <div className="flow-rate-group">
            <input
              type="number"
              min="0"
              step="any"
              className="form-input flow-rate"
              value={f.ratePerMin}
              onChange={(e) =>
                onUpdate(idx, { ratePerMin: Number(e.target.value) || 0 })
              }
              aria-label={`Скорость, ${ratePlaceholder ?? "/мин"}`}
            />
            <span className="flow-rate-unit">{ratePlaceholder ?? "/мин"}</span>
          </div>
          <button
            type="button"
            className="flow-remove"
            onClick={() => onRemove(idx)}
            aria-label="Удалить"
            title="Удалить"
          >
            ×
          </button>
        </div>
      ))}
    </section>
  );
}
