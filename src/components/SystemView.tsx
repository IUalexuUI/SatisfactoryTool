import { useMemo } from "react";
import { solveSystem, type SystemSpec } from "../solver";
import {
  emptyFlow,
  type FlowEntry,
  type ProductionSystem,
} from "../systems";
import { useI18n, format } from "../i18n/index.tsx";
import { ItemPicker } from "./ItemPicker";
import { SolutionView } from "./SolutionView";

interface Props {
  system: ProductionSystem;
  onChange: (next: ProductionSystem) => void;
  onDelete: () => void;
}

export function SystemView({ system, onChange, onDelete }: Props) {
  const { t } = useI18n();

  const spec: SystemSpec = useMemo(
    () => ({
      targets: system.targets
        .filter((tg) => tg.item)
        .map((tg) => ({
          item: tg.item as string,
          ratePerMin: tg.ratePerMin,
          fill: tg.fill ?? false,
        })),
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
          aria-label={t.system.nameAria}
        />
        <button
          className="system-delete"
          type="button"
          onClick={() => {
            if (confirm(format(t.system.confirmDelete, { name: system.name }))) {
              onDelete();
            }
          }}
        >
          {t.system.delete}
        </button>
      </header>

      <FlowEditor
        title={t.system.targets}
        helper={t.system.targetsHelper}
        flows={system.targets}
        showFill
        onAdd={() => updateList("targets", (l) => [...l, emptyFlow()])}
        onUpdate={(idx, patch) =>
          updateList("targets", (l) =>
            l.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
          )
        }
        onRemove={(idx) =>
          updateList("targets", (l) => l.filter((_, i) => i !== idx))
        }
        unit={t.system.unitItems}
      />

      <FlowEditor
        title={t.system.sources}
        helper={t.system.sourcesHelper}
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
        emptyMessage={t.system.sourcesEmpty}
        unit={t.system.unitRaw}
      />

      {!solution && <p className="empty pad">{t.system.needTarget}</p>}

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
  unit?: string;
  showFill?: boolean;
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
  unit,
  showFill,
}: FlowEditorProps) {
  const { t } = useI18n();
  const unitLabel = unit ?? t.units.perMin;
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
          aria-label={t.system.add}
          title={t.system.add}
        >
          <svg
            width="11"
            height="11"
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
        </button>
      </header>
      {flows.length === 0 && emptyMessage && (
        <p className="empty">{emptyMessage}</p>
      )}
      {flows.map((f, idx) => (
        <div
          key={f.id}
          className={`flow-row ${showFill ? "with-fill" : ""}`}
        >
          <ItemPicker
            value={f.item}
            onChange={(c) => onUpdate(idx, { item: c })}
            filterFn={filterFn}
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
              disabled={Boolean(f.fill)}
              aria-label={format(t.system.rateAria, { unit: unitLabel })}
            />
            <span className="flow-rate-unit">{unitLabel}</span>
          </div>
          {showFill && (
            <label className="fill-toggle" title={t.system.fillTooltip}>
              <input
                type="checkbox"
                checked={Boolean(f.fill)}
                onChange={(e) =>
                  onUpdate(idx, { fill: e.target.checked || undefined })
                }
              />
              <span>{t.system.fillLabel}</span>
            </label>
          )}
          <button
            type="button"
            className="flow-remove"
            onClick={() => onRemove(idx)}
            aria-label={t.system.remove}
            title={t.system.remove}
          >
            ×
          </button>
        </div>
      ))}
    </section>
  );
}
