// Production systems persisted in localStorage. Each system is a saved
// planning scenario in one of two modes:
//   - target: "I want X of item Y per minute" — solver computes inputs
//   - source: "I have N of resource X per minute, what's the max output of Y?"

const STORAGE_KEY = "satisfactory-tool/systems/v1";

export type SystemMode = "target" | "source";

export interface BaseSystem {
  id: string;
  name: string;
  mode: SystemMode;
}

export interface TargetSystem extends BaseSystem {
  mode: "target";
  targetItem: string | null;
  targetRatePerMin: number;
}

export interface SourceSystem extends BaseSystem {
  mode: "source";
  sourceItem: string | null;
  sourceRatePerMin: number;
  targetItem: string | null;
}

export type ProductionSystem = TargetSystem | SourceSystem;

export function newTargetSystem(): TargetSystem {
  return {
    id: cryptoRandomId(),
    name: "Новая система",
    mode: "target",
    targetItem: null,
    targetRatePerMin: 60,
  };
}

export function newSourceSystem(): SourceSystem {
  return {
    id: cryptoRandomId(),
    name: "Новая система",
    mode: "source",
    sourceItem: null,
    sourceRatePerMin: 120,
    targetItem: null,
  };
}

// Convert a system between modes, preserving id/name and any reusable state.
export function switchMode(s: ProductionSystem, mode: SystemMode): ProductionSystem {
  if (s.mode === mode) return s;
  if (mode === "target") {
    return {
      id: s.id,
      name: s.name,
      mode: "target",
      targetItem: s.targetItem ?? null,
      targetRatePerMin: 60,
    };
  }
  return {
    id: s.id,
    name: s.name,
    mode: "source",
    sourceItem: null,
    sourceRatePerMin: 120,
    targetItem: s.targetItem ?? null,
  };
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
    // Storage may be full or disabled (private mode). Silently ignore —
    // the in-memory state still works for the session.
  }
}

// Accept legacy schema (no `mode` field — was always target-mode) and the
// current discriminated-union schema. Drops anything we can't recognise.
function migrate(raw: unknown): ProductionSystem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;

  const mode = o.mode === "source" ? "source" : "target";
  if (mode === "target") {
    return {
      id: o.id,
      name: o.name,
      mode: "target",
      targetItem:
        typeof o.targetItem === "string" || o.targetItem === null
          ? o.targetItem
          : null,
      targetRatePerMin:
        typeof o.targetRatePerMin === "number" ? o.targetRatePerMin : 60,
    };
  }
  return {
    id: o.id,
    name: o.name,
    mode: "source",
    sourceItem:
      typeof o.sourceItem === "string" || o.sourceItem === null
        ? o.sourceItem
        : null,
    sourceRatePerMin:
      typeof o.sourceRatePerMin === "number" ? o.sourceRatePerMin : 120,
    targetItem:
      typeof o.targetItem === "string" || o.targetItem === null
        ? o.targetItem
        : null,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
