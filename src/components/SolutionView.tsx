import { items, displayName } from "../data";
import type { Solution, ProductionStep, Flow } from "../solver";

function formatNumber(n: number, decimals = 2): string {
  if (Math.abs(n) < 1e-9) return "0";
  // Trim trailing zeros while respecting decimals limit.
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
  const machinesNeeded = Math.ceil(step.machineCount);
  const clockPercent =
    machinesNeeded > 0 ? (step.machineCount / machinesNeeded) * 100 : 0;
  const buildingName = step.building
    ? displayName(step.building)
    : (step.recipe.producedIn[0] ?? "—");

  return (
    <article className={`step ${step.recipe.alternate ? "is-alt" : ""}`}>
      <header className="step-head">
        <div className="step-machine-count">
          <span className="big">{formatNumber(step.machineCount, 3)}</span>
          <span className="times">×</span>
          <span className="building">{buildingName}</span>
        </div>
        <div className="step-meta">
          <span className="recipe-name">{displayName(step.recipe)}</span>
          <span className="step-power">⚡ {formatNumber(step.powerMW, 2)} МВт</span>
        </div>
      </header>
      <div className="step-hint">
        Минимум {machinesNeeded} зданий @ {formatNumber(clockPercent, 1)}% такта
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

export function SolutionView({
  solution,
  targetLabel,
}: {
  solution: Solution;
  targetLabel: string;
}) {
  const totalMachines = solution.steps.reduce(
    (sum, s) => sum + Math.ceil(s.machineCount),
    0,
  );

  return (
    <>
      <section className="solution-summary">
        <div className="summary-item">
          <div className="summary-label">Цель</div>
          <div className="summary-value">
            {formatNumber(solution.target.ratePerMin)}/мин {targetLabel}
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Зданий (мин.)</div>
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
