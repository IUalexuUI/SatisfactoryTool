export type ItemForm = "solid" | "liquid" | "gas" | "invalid";

export interface ItemAmount {
  item: string;
  amount: number;
}

export interface Item {
  className: string;
  name: string;
  nameRu: string | null;
  description: string;
  form: ItemForm;
  stackSize: string;
  energyMJ: number;
  sinkPoints: number;
  radioactive: boolean;
  kind: string;
}

export interface Recipe {
  className: string;
  name: string;
  nameRu: string | null;
  durationSec: number;
  ingredients: ItemAmount[];
  products: ItemAmount[];
  producedIn: string[];
  alternate: boolean;
  variablePower: { constant: number; factor: number };
}

export interface Building {
  className: string;
  name: string;
  nameRu: string | null;
  description: string;
  kind: string;
  powerMW: number;
  powerExponent: number;
  manufacturingSpeed: number;
  variablePower: { min: number; max: number } | null;
  somersloopSlots: number;
  somersloopBoostMultiplier: number;
}

export interface Extractor {
  className: string;
  name: string;
  nameRu: string | null;
  kind: string;
  powerMW: number;
  powerExponent: number;
  itemsPerCycle: number;
  cycleTimeSec: number;
  allowedForms: ItemForm[];
  onlyAllowCertainResources: boolean;
  allowedResources: string[];
  somersloopSlots: number;
}

export interface GeneratorFuel {
  fuel: string | null;
  supplementalResource: string | null;
  byproduct: string | null;
  byproductAmount: number;
}

export interface Generator {
  className: string;
  name: string;
  nameRu: string | null;
  kind: string;
  powerProductionMW: number;
  fuelLoadAmount: number;
  requiresSupplementalResource: boolean;
  supplementalLoadAmount: number;
  supplementalToPowerRatio: number;
  fuels: GeneratorFuel[];
}

export interface DataMeta {
  generatedAt: string;
  source: string;
  counts: Record<string, number>;
}
