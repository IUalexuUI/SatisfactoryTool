import { items, displayName } from "../data";
import type {
  Solution,
  ProductionStep,
  Flow,
  SourceUsage,
} from "../solver";

function formatNumber(n: number, decimals = 2): string {
  if (Math.abs(n) < 1e-9) return "0";
  return Number(n.toFixed(decimals)).toString();
}

function ItemLabel({ className }: { className: string }) {
  const it = items[className];
  return (
    <>
      <span className={`dot form-${it?.form ?? "solid"}`} />
      <span className="ent-name">{it ? displayName(it) : className}</span>
    </>
  );
}

function StepCard({ step }: { step: ProductionStep }) {
  const buildingName = step.building
    ? displayName(step.building)
    : (step.recipe.producedIn[0] ?? "—");

  return (
    <article className={`step ${step.recipe.alternate ? "is-alt" : ""}`}>
      <header className="step-head">
        <div className="step-machine-count">
          <span className="big">{step.machines}</span>
          <span className="times">×</span>
          <span className="building">{buildingName}</span>
          <span className="clock">такт {step.clockPercent}%</span>
        </div>
        <div className="step-meta">
          <span className="recipe-name">{displayName(step.recipe)}</span>
          <span className="step-power">⚡ {formatNumber(step.powerMW, 2)} МВт</span>
        </div>
      </header>
      <div className="step-hint">
        Идеально {formatNumber(step.effectiveMachines, 3)} зданий @ 100% — округлено вверх
      </div>
      <div className="step-flow">
        <ul className="flow-side">
          {step.inputs.map((f) => (
            <li key={f.item}>
              <ItemLabel className={f.item} />
              <span className="ent-rate">{formatNumber(f.ratePerMin)}/мин</span>
            </li>
          ))}
        </ul>
        <span className="arrow" aria-hidden="true">→</span>
        <ul className="flow-side">
          {step.outputs.map((f) => (
            <li key={f.item}>
              <ItemLabel className={f.item} />
              <span className="ent-rate">{formatNumber(f.ratePerMin)}/мин</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function FlowList({ flows, empty }: { flows: Flow[]; empty: string }) {
  if (flows.length === 0) return <p className="empty">{empty}</p>;
  return (
    <ul className="flat-list">
      {flows.map((f) => (
        <li key={f.item}>
          <ItemLabel className={f.item} />
          <span className="ent-rate">{formatNumber(f.ratePerMin)}/мин</span>
        </li>
      ))}
    </ul>
  );
}

function SourceUsageList({ sources }: { sources: SourceUsage[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="flat-list">
      {sources.map((s) => {
        const pct = s.utilisation * 100;
        const isFull = s.utilisation >= 0.999;
        const statusClass =
          s.utilisation > 1.0001
            ? "over"
            : isFull
              ? "full"
              : s.utilisation > 0
                ? "partial"
                : "unused";
        return (
          <li key={s.item} className={`source-row source-${statusClass}`}>
            <ItemLabel className={s.item} />
            <span className="ent-rate">
              {formatNumber(s.consumed)}/{formatNumber(s.available)}
              <span className="util">{formatNumber(pct, 1)}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SolutionView({ solution }: { solution: Solution }) {
  const totalMachines = solution.steps.reduce((sum, s) => sum + s.machines, 0);
  const isScaledDown = solution.scale < 0.9999;
  const targetsLine = solution.targets
    .map((t) => `${formatNumber(t.ratePerMin)}/мин ${itemLabel(t.item)}`)
    .join(" + ");

  return (
    <>
      <section className="solution-summary">
        <div className="summary-item summary-targets">
          <div className="summary-label">
            {isScaledDown ? "Достижимо" : "Цели"}
          </div>
          <div className="summary-value">{targetsLine}</div>
          {isScaledDown && (
            <div className="summary-sub">
              {(solution.scale * 100).toFixed(1)}% от запрошенного
            </div>
          )}
        </div>
        <div className="summary-item">
          <div className="summary-label">Зданий</div>
          <div className="summary-value">{totalMachines}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Энергия</div>
          <div className="summary-value">
            {formatNumber(solution.totalPowerMW, 1)} МВт
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Шагов</div>
          <div className="summary-value">{solution.steps.length}</div>
        </div>
      </section>

      {solution.warnings.length > 0 && (
        <div className="warnings">
          {solution.warnings.map((w, i) => (
            <div key={i} className="warning">⚠ {w}</div>
          ))}
        </div>
      )}

      {solution.sourceUsage.length > 0 && (
        <section className="recipe-group">
          <h3>
            Источники <span className="count">{solution.sourceUsage.length}</span>
          </h3>
          <SourceUsageList sources={solution.sourceUsage} />
        </section>
      )}

      <section className="recipe-group">
        <h3>
          Производство <span className="count">{solution.steps.length}</span>
        </h3>
        {solution.steps.map((step) => (
          <StepCard key={step.recipe.className} step={step} />
        ))}
      </section>

      <section className="recipe-group">
        <h3>
          Сырьё <span className="count">{solution.rawInputs.length}</span>
        </h3>
        <FlowList
          flows={solution.rawInputs}
          empty="Цепочка не требует внешнего сырья."
        />
      </section>

      {solution.byproducts.length > 0 && (
        <section className="recipe-group">
          <h3>
            Излишки (побочные продукты){" "}
            <span className="count">{solution.byproducts.length}</span>
          </h3>
          <FlowList
            flows={solution.byproducts}
            empty="Нет неиспользованных побочных продуктов."
          />
        </section>
      )}
    </>
  );
}

function itemLabel(className: string): string {
  const it = items[className];
  return it ? displayName(it) : className;
}
