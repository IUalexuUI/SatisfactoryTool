// Parse Satisfactory's CommunityResources/Docs/*.json into a compact, typed
// dataset for the SatisfactoryTool app. Reads UTF-16 LE source files.
//
// Inputs:  data-raw/en-US.json, data-raw/ru.json
// Outputs: src/data/items.json, buildings.json, recipes.json, generators.json,
//          extractors.json, meta.json
//
// Usage: node scripts/build-data.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "src/data");

// ---------- file loading ----------

function loadDocs(file) {
  const buf = readFileSync(resolve(ROOT, file));
  const text = buf.toString("utf16le").replace(/^﻿/, "");
  return JSON.parse(text);
}

function indexByClassName(docs) {
  const out = new Map();
  for (const group of docs) {
    const short = group.NativeClass?.match(/FactoryGame\.(\w+)/)?.[1];
    for (const cls of group.Classes ?? []) {
      out.set(cls.ClassName, { ...cls, _NativeClass: short });
    }
  }
  return out;
}

// ---------- string parsing ----------

// Extract the trailing class identifier from a UE blueprint path.
// `/Script/Engine.BlueprintGeneratedClass'/Game/.../Desc_Foo.Desc_Foo_C'`
// `/Game/.../Build_Bar.Build_Bar_C`
// -> `Desc_Foo_C` / `Build_Bar_C`
function extractClassName(path) {
  if (!path) return null;
  const m = path.match(/([A-Za-z0-9_]+_C)['"]?$/);
  return m ? m[1] : null;
}

// Parse a UE-style array-of-structs string like:
// `((ItemClass="...Desc_OreIron_C'",Amount=20),(ItemClass="...",Amount=10))`
function parseItemAmountList(s) {
  if (!s || s === "()" || s === "") return [];
  const out = [];
  // Match each (ItemClass=...,Amount=N) group, allowing for nested quotes.
  const re = /\(ItemClass=(?:")?([^,)]*?)(?:")?,Amount=([0-9.]+)\)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const cls = extractClassName(m[1]);
    const amount = Number(m[2]);
    if (cls && Number.isFinite(amount)) out.push({ item: cls, amount });
  }
  return out;
}

// Parse a UE list-of-paths string like `("/Game/.../X_C","/Game/.../Y_C")`.
function parsePathList(s) {
  if (!s || s === "()" || s === "") return [];
  const out = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const cls = extractClassName(m[1]);
    if (cls) out.push(cls);
  }
  return out;
}

// Parse `(RF_LIQUID)` or `(RF_LIQUID,RF_GAS)`.
function parseFormList(s) {
  if (!s || s === "()" || s === "") return [];
  return s
    .replace(/[()]/g, "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ---------- domain model ----------

// Native classes that produce real, usable items (not building descriptors,
// not equipment cosmetics, not ammo — though we include ammo for completeness).
const ITEM_NATIVE_CLASSES = new Set([
  "FGItemDescriptor",
  "FGResourceDescriptor",
  "FGItemDescriptorBiomass",
  "FGItemDescriptorNuclearFuel",
  "FGItemDescriptorPowerBoosterFuel",
  "FGAmmoTypeProjectile",
  "FGAmmoTypeSpreadshot",
  "FGAmmoTypeInstantHit",
  "FGConsumableDescriptor",
  "FGEquipmentDescriptor",
  "FGPowerShardDescriptor",
]);

// Buildings that consume ingredients to produce items per recipe.
const FACTORY_NATIVE_CLASSES = new Set([
  "FGBuildableManufacturer",
  "FGBuildableManufacturerVariablePower",
]);

// Buildings that extract raw resources from the world.
const EXTRACTOR_NATIVE_CLASSES = new Set([
  "FGBuildableResourceExtractor",
  "FGBuildableWaterPump",
  "FGBuildableFrackingExtractor",
]);

const GENERATOR_NATIVE_CLASSES = new Set([
  "FGBuildableGeneratorFuel",
  "FGBuildableGeneratorNuclear",
  "FGBuildableGeneratorGeoThermal",
]);

const FORM_MAP = {
  RF_SOLID: "solid",
  RF_LIQUID: "liquid",
  RF_GAS: "gas",
  RF_INVALID: "invalid",
  RF_LAST_ENUM: "invalid",
};

// In Satisfactory's data, fluid amounts are stored multiplied by 1000
// (so 1 m³ shows as 1000). Convert to display units.
function normaliseAmount(amount, form) {
  if (form === "liquid" || form === "gas") return amount / 1000;
  return amount;
}

// ---------- main ----------

const docsEn = loadDocs("data-raw/en-US.json");
const docsRu = loadDocs("data-raw/ru.json");
const ruIndex = indexByClassName(docsRu);

function ruName(className) {
  return ruIndex.get(className)?.mDisplayName ?? null;
}

const items = {};
const buildings = {};
const extractors = {};
const generators = {};
const recipes = {};

// ---- items ----
for (const group of docsEn) {
  const native = group.NativeClass?.match(/FactoryGame\.(\w+)/)?.[1];
  if (!ITEM_NATIVE_CLASSES.has(native)) continue;
  for (const cls of group.Classes) {
    const form = FORM_MAP[cls.mForm] ?? "solid";
    items[cls.ClassName] = {
      className: cls.ClassName,
      name: cls.mDisplayName,
      nameRu: ruName(cls.ClassName),
      description: cls.mDescription || "",
      form,
      stackSize: cls.mStackSize,
      energyMJ: Number(cls.mEnergyValue) || 0,
      sinkPoints: Number(cls.mResourceSinkPoints) || 0,
      radioactive: Number(cls.mRadioactiveDecay) > 0,
      kind: native,
    };
  }
}

// ---- production buildings (factory machines) ----
for (const group of docsEn) {
  const native = group.NativeClass?.match(/FactoryGame\.(\w+)/)?.[1];
  if (!FACTORY_NATIVE_CLASSES.has(native)) continue;
  for (const cls of group.Classes) {
    const isVariable = native === "FGBuildableManufacturerVariablePower";
    buildings[cls.ClassName] = {
      className: cls.ClassName,
      name: cls.mDisplayName,
      nameRu: ruName(cls.ClassName),
      description: cls.mDescription || "",
      kind: native,
      powerMW: Number(cls.mPowerConsumption) || 0,
      powerExponent: Number(cls.mPowerConsumptionExponent) || 1.6,
      manufacturingSpeed: Number(cls.mManufacturingSpeed) || 1,
      variablePower: isVariable
        ? {
            min: Number(cls.mEstimatedMininumPowerConsumption) || 0,
            max: Number(cls.mEstimatedMaximumPowerConsumption) || 0,
          }
        : null,
      somersloopSlots: Number(cls.mProductionShardSlotSize) || 0,
      somersloopBoostMultiplier:
        Number(cls.mProductionShardBoostMultiplier) || 0,
    };
  }
}

// ---- extractors ----
for (const group of docsEn) {
  const native = group.NativeClass?.match(/FactoryGame\.(\w+)/)?.[1];
  if (!EXTRACTOR_NATIVE_CLASSES.has(native)) continue;
  for (const cls of group.Classes) {
    extractors[cls.ClassName] = {
      className: cls.ClassName,
      name: cls.mDisplayName,
      nameRu: ruName(cls.ClassName),
      kind: native,
      powerMW: Number(cls.mPowerConsumption) || 0,
      powerExponent: Number(cls.mPowerConsumptionExponent) || 1.6,
      itemsPerCycle: Number(cls.mItemsPerCycle) || 0,
      cycleTimeSec: Number(cls.mExtractCycleTime) || 1,
      allowedForms: parseFormList(cls.mAllowedResourceForms).map(
        (f) => FORM_MAP[f] ?? "solid",
      ),
      onlyAllowCertainResources: cls.mOnlyAllowCertainResources === "True",
      allowedResources: parsePathList(cls.mAllowedResources),
      somersloopSlots: Number(cls.mProductionShardSlotSize) || 0,
    };
  }
}

// ---- generators ----
for (const group of docsEn) {
  const native = group.NativeClass?.match(/FactoryGame\.(\w+)/)?.[1];
  if (!GENERATOR_NATIVE_CLASSES.has(native)) continue;
  for (const cls of group.Classes) {
    const fuels = Array.isArray(cls.mFuel)
      ? cls.mFuel.map((f) => ({
          fuel: extractClassName(f.mFuelClass) || f.mFuelClass || null,
          supplementalResource:
            extractClassName(f.mSupplementalResourceClass) ||
            f.mSupplementalResourceClass ||
            null,
          byproduct: extractClassName(f.mByproduct) || null,
          byproductAmount: Number(f.mByproductAmount) || 0,
        }))
      : [];
    generators[cls.ClassName] = {
      className: cls.ClassName,
      name: cls.mDisplayName,
      nameRu: ruName(cls.ClassName),
      kind: native,
      powerProductionMW: Number(cls.mPowerProduction) || 0,
      fuelLoadAmount: Number(cls.mFuelLoadAmount) || 0,
      requiresSupplementalResource: cls.mRequiresSupplementalResource === "True",
      supplementalLoadAmount: Number(cls.mSupplementalLoadAmount) || 0,
      // m³ of supplemental resource per MW of output (water for coal: 0.075 m³/MW for fully blasted)
      supplementalToPowerRatio: Number(cls.mSupplementalToPowerRatio) || 0,
      fuels,
    };
  }
}

// ---- recipes ----
// Keep only recipes produced in our factory machines. Skip "build recipes"
// (made in BP_BuildGun_C — those are buildings) and pure workbench recipes.
const factoryClassNames = new Set(Object.keys(buildings));

for (const group of docsEn) {
  const native = group.NativeClass?.match(/FactoryGame\.(\w+)/)?.[1];
  if (native !== "FGRecipe") continue;
  for (const cls of group.Classes) {
    const producedInRaw = parsePathList(cls.mProducedIn);
    const machines = producedInRaw.filter((c) => factoryClassNames.has(c));
    if (machines.length === 0) continue;

    const ingredients = parseItemAmountList(cls.mIngredients).map((x) => {
      const item = items[x.item];
      return {
        item: x.item,
        amount: item ? normaliseAmount(x.amount, item.form) : x.amount,
      };
    });
    const products = parseItemAmountList(cls.mProduct).map((x) => {
      const item = items[x.item];
      return {
        item: x.item,
        amount: item ? normaliseAmount(x.amount, item.form) : x.amount,
      };
    });
    if (products.length === 0) continue;

    const duration = Number(cls.mManufactoringDuration) || 0;
    const isAlternate = cls.ClassName.startsWith("Recipe_Alternate_");

    recipes[cls.ClassName] = {
      className: cls.ClassName,
      name: cls.mDisplayName,
      nameRu: ruName(cls.ClassName),
      durationSec: duration,
      ingredients,
      products,
      producedIn: machines,
      alternate: isAlternate,
      variablePower: {
        constant: Number(cls.mVariablePowerConsumptionConstant) || 0,
        factor: Number(cls.mVariablePowerConsumptionFactor) || 0,
      },
    };
  }
}

// ---- write outputs ----
mkdirSync(OUT_DIR, { recursive: true });

function write(name, obj) {
  writeFileSync(
    resolve(OUT_DIR, name),
    JSON.stringify(obj, null, 2) + "\n",
    "utf8",
  );
}

const meta = {
  generatedAt: new Date().toISOString(),
  source: "Satisfactory CommunityResources/Docs/{en-US,ru}.json",
  counts: {
    items: Object.keys(items).length,
    buildings: Object.keys(buildings).length,
    extractors: Object.keys(extractors).length,
    generators: Object.keys(generators).length,
    recipes: Object.keys(recipes).length,
    alternateRecipes: Object.values(recipes).filter((r) => r.alternate).length,
  },
};

write("items.json", items);
write("buildings.json", buildings);
write("extractors.json", extractors);
write("generators.json", generators);
write("recipes.json", recipes);
write("meta.json", meta);

console.log("Generated:");
console.log(JSON.stringify(meta, null, 2));
