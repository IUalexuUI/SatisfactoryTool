import { items } from "../data";
import type {
  Solution,
  ProductionStep,
  Flow,
  SourceUsage,
  SolverWarning,
} from "../solver";
import { useI18n, format } from "../i18n/index.tsx";

function formatNumber(n: number, decimals = 2): string {
  if (Math.abs(n) < 1e-9) return "0";
  return Number(n.toFixed(decimals)).toString();
}

function ItemLabel({ className }: { className: string }) {
  const { name } = useI18n();
  const it = items[className];
  return (
    <>
      <span className={`dot form-${it?.form ?? "solid"}`} />
      <span className="ent-name">{it ? name(it) : className}</span>
    </>
  );
}

function StepCard({ step }: { step: ProductionStep }) {
  const { t, name } = useI18n();
  const buildingName = step.building
    ? name(step.building)
    : (step.recipe.producedIn[0] ?? "—");

  return (
    <article className={`step ${step.recipe.alternate ? "is-alt" : ""}`}>
      <header className="step-head">
        <div className="step-machine-count">
          <span className="big">{step.machines}</span>
          <span className="times">×</span>
          <span className="building">{buildingName}</span>
          <span className="clock">
            {t.solution.clockLabel} {step.clockPercent}%
          </span>
        </div>
        <div className="step-meta">
          <span className="recipe-name">{name(step.recipe)}</span>
          <span className="step-power">
            ⚡ {formatNumber(step.powerMW, 2)} {t.units.powerMW}
          </span>
        </div>
      </header>
      <div className="step-hint">
        {format(t.solution.idealHint, {
          ideal: formatNumber(step.effectiveMachines, 3),
        })}
      </div>
      <div className="step-flow">
        <ul className="flow-side">
          {step.inputs.map((f) => (
            <li key={f.item}>
              <ItemLabel className={f.item} />
              <span className="ent-rate">
                {formatNumber(f.ratePerMin)}
                {t.units.perMin}
              </span>
            </li>
          ))}
        </ul>
        <span className="arrow" aria-hidden="true">
          →
        </span>
        <ul className="flow-side">
          {step.outputs.map((f) => (
            <li key={f.item}>
              <ItemLabel className={f.item} />
              <span className="ent-rate">
                {formatNumber(f.ratePerMin)}
                {t.units.perMin}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function FlowList({ flows, empty }: { flows: Flow[]; empty: string }) {
  const { t } = useI18n();
  if (flows.length === 0) return <p className="empty">{empty}</p>;
  return (
    <ul className="flat-list">
      {flows.map((f) => (
        <li key={f.item}>
          <ItemLabel className={f.item} />
          <span className="ent-rate">
            {formatNumber(f.ratePerMin)}
            {t.units.perMin}
          </span>
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

function formatWarning(
  w: SolverWarning,
  t: ReturnType<typeof useI18n>["t"],
  itemName: (id: string) => string,
): string {
  switch (w.code) {
    case "fixed-scaled":
      return format(t.warnings["fixed-scaled"], {
        percent: w.percent.toFixed(1),
        item: itemName(w.itemId),
      });
    case "chain-scaled":
      return format(t.warnings["chain-scaled"], {
        percent: w.percent.toFixed(1),
        item: itemName(w.itemId),
      });
    case "fill-requires-source":
      return t.warnings["fill-requires-source"];
    case "fill-no-source":
      return format(t.warnings["fill-no-source"], {
        item: itemName(w.itemId),
        rate: w.rate,
      });
    case "not-enough-source":
      return w.exhaustedId
        ? format(t.warnings["not-enough-source-exhausted"], {
            item: itemName(w.itemId),
            exhausted: itemName(w.exhaustedId),
          })
        : format(t.warnings["not-enough-source"], {
            item: itemName(w.itemId),
          });
    case "iteration-limit":
      return format(t.warnings["iteration-limit"], { n: w.n });
  }
}

export function SolutionView({ solution }: { solution: Solution }) {
  const { t, name } = useI18n();
  const totalMachines = solution.steps.reduce((sum, s) => sum + s.machines, 0);
  const isScaledDown = solution.scale < 0.9999;

  const itemName = (id: string) => {
    const it = items[id];
    return it ? name(it) : id;
  };

  const targetsLine = solution.targets
    .map((tg) => `${formatNumber(tg.ratePerMin)}${t.units.perMin} ${itemName(tg.item)}`)
    .join(" + ");

  return (
    <>
      <section className="solution-summary">
        <div className="summary-item summary-targets">
          <div className="summary-label">
            {isScaledDown ? t.solution.achievable : t.solution.targets}
          </div>
          <div className="summary-value">{targetsLine}</div>
          {isScaledDown && (
            <div className="summary-sub">
              {format(t.solution.scaleSubText, {
                percent: (solution.scale * 100).toFixed(1),
              })}
            </div>
          )}
        </div>
        <div className="summary-item">
          <div className="summary-label">{t.solution.buildings}</div>
          <div className="summary-value">{totalMachines}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">{t.solution.power}</div>
          <div className="summary-value">
            {formatNumber(solution.totalPowerMW, 1)} {t.units.powerMW}
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-label">{t.solution.steps}</div>
          <div className="summary-value">{solution.steps.length}</div>
        </div>
      </section>

      {solution.warnings.length > 0 && (
        <div className="warnings">
          {solution.warnings.map((w, i) => (
            <div key={i} className="warning">
              ⚠ {formatWarning(w, t, itemName)}
            </div>
          ))}
        </div>
      )}

      {solution.sourceUsage.length > 0 && (
        <section className="recipe-group">
          <h3>
            {t.solution.sources}{" "}
            <span className="count">{solution.sourceUsage.length}</span>
          </h3>
          <SourceUsageList sources={solution.sourceUsage} />
        </section>
      )}

      <section className="recipe-group">
        <h3>
          {t.solution.production}{" "}
          <span className="count">{solution.steps.length}</span>
        </h3>
        {solution.steps.map((step) => (
          <StepCard key={step.recipe.className} step={step} />
        ))}
      </section>

      <section className="recipe-group">
        <h3>
          {t.solution.raw}{" "}
          <span className="count">{solution.rawInputs.length}</span>
        </h3>
        <FlowList flows={solution.rawInputs} empty={t.solution.rawEmpty} />
      </section>

      {solution.byproducts.length > 0 && (
        <section className="recipe-group">
          <h3>
            {t.solution.byproducts}{" "}
            <span className="count">{solution.byproducts.length}</span>
          </h3>
          <FlowList
            flows={solution.byproducts}
            empty={t.solution.byproductsEmpty}
          />
        </section>
      )}
    </>
  );
}
