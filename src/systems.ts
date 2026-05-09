// Production systems persisted in localStorage. Each system holds lists of
// desired targets and (optionally) constrained sources. The solver decides
// how to interpret them based on which lists are populated.

const STORAGE_KEY = "satisfactory-tool/systems/v1";

export interface FlowEntry {
  id: string;
  item: string | null;
  ratePerMin: number;
  // Targets with `fill: true` are scaled by the solver to consume any source
  // budget left after fixed-rate targets have been satisfied. Ignored on
  // sources (no semantics there).
  fill?: boolean;
}

export interface ProductionSystem {
  id: string;
  name: string;
  targets: FlowEntry[];
  sources: FlowEntry[];
}

export function newSystem(): ProductionSystem {
  return {
    id: cryptoRandomId(),
    name: "Новая система",
    targets: [emptyFlow()],
    sources: [],
  };
}

export function emptyFlow(): FlowEntry {
  return { id: cryptoRandomId(), item: null, ratePerMin: 60 };
}

export function loadSystems(): ProductionSystem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(migrate)
      .filter((s): s is ProductionSystem => s !== null);
  } catch {
    return [];
  }
}

export function saveSystems(systems: ProductionSystem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
  } catch {
    // Storage may be full or disabled (private mode). Silently ignore.
  }
}

// Migrate any prior schema to the current one. We have seen:
//   - v1a: { id, name, targetItem, targetRatePerMin } (single target, no mode)
//   - v1b: discriminated mode union — target/source variants
//   - v1c: current — { id, name, targets[], sources[] }
function migrate(raw: unknown): ProductionSystem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;

  // Already current schema?
  if (Array.isArray(o.targets) && Array.isArray(o.sources)) {
    return {
      id: o.id,
      name: o.name,
      targets: (o.targets as unknown[]).map(toFlow).filter(notNull),
      sources: (o.sources as unknown[]).map(toFlow).filter(notNull),
    };
  }

  // Legacy: pull single target/source descriptors.
  const targets: FlowEntry[] = [];
  const sources: FlowEntry[] = [];

  if ("targetItem" in o || "targetRatePerMin" in o) {
    targets.push({
      id: cryptoRandomId(),
      item: typeof o.targetItem === "string" ? o.targetItem : null,
      ratePerMin:
        typeof o.targetRatePerMin === "number" ? o.targetRatePerMin : 60,
    });
  }
  if (o.mode === "source") {
    sources.push({
      id: cryptoRandomId(),
      item: typeof o.sourceItem === "string" ? o.sourceItem : null,
      ratePerMin:
        typeof o.sourceRatePerMin === "number" ? o.sourceRatePerMin : 120,
    });
  }
  if (targets.length === 0) targets.push(emptyFlow());

  return { id: o.id, name: o.name, targets, sources };
}

function toFlow(raw: unknown): FlowEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    id: typeof o.id === "string" ? o.id : cryptoRandomId(),
    item: typeof o.item === "string" || o.item === null ? o.item : null,
    ratePerMin: typeof o.ratePerMin === "number" ? o.ratePerMin : 60,
    fill: o.fill === true ? true : undefined,
  };
}

function notNull<T>(x: T | null): x is T {
  return x !== null;
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
