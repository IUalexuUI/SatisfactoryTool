// Production systems persisted in localStorage. A system is a saved planning
// scenario: "I want X of item Y per minute". The solver runs against it on
// demand; we don't cache solver output (it's cheap enough to recompute).

const STORAGE_KEY = "satisfactory-tool/systems/v1";

export interface ProductionSystem {
  id: string;
  name: string;
  targetItem: string | null;
  targetRatePerMin: number;
}

export function newSystem(): ProductionSystem {
  return {
    id: cryptoRandomId(),
    name: "Новая система",
    targetItem: null,
    targetRatePerMin: 60,
  };
}

export function loadSystems(): ProductionSystem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSystem);
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

function isValidSystem(s: unknown): s is ProductionSystem {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    (o.targetItem === null || typeof o.targetItem === "string") &&
    typeof o.targetRatePerMin === "number"
  );
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
