import { readFileSync } from "node:fs";

const items = JSON.parse(readFileSync("src/data/items.json", "utf8"));
const recipes = JSON.parse(readFileSync("src/data/recipes.json", "utf8"));
const buildings = JSON.parse(readFileSync("src/data/buildings.json", "utf8"));
const extractors = JSON.parse(readFileSync("src/data/extractors.json", "utf8"));
const generators = JSON.parse(readFileSync("src/data/generators.json", "utf8"));

function show(label, val) {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(val, null, 2));
}

// Iron ingot — basic case
show("Item: Iron Ingot", items["Desc_IronIngot_C"]);
show("Recipe: Iron Ingot", recipes["Recipe_IngotIron_C"]);

// Plastic — fluid byproduct case
show("Recipe: Plastic", recipes["Recipe_Plastic_C"]);

// Heavy Modular Frame — multi-ingredient
show("Recipe: Heavy Modular Frame", recipes["Recipe_ModularFrameHeavy_C"]);

// An alternate recipe
const altList = Object.values(recipes).filter((r) => r.alternate).slice(0, 2);
console.log("\n--- 2 alternate recipes ---");
console.log(JSON.stringify(altList, null, 2));

// All factory buildings
console.log("\n--- Factory buildings ---");
for (const b of Object.values(buildings)) {
  console.log(
    `  ${b.name.padEnd(28)} power=${String(b.powerMW).padStart(7)}MW  variable=${b.variablePower ? `${b.variablePower.min}-${b.variablePower.max}` : "no"}  somersloops=${b.somersloopSlots}`,
  );
}

// Extractors
console.log("\n--- Extractors ---");
for (const e of Object.values(extractors)) {
  const ratePerMin = (e.itemsPerCycle / e.cycleTimeSec) * 60;
  console.log(
    `  ${e.name.padEnd(28)} ${ratePerMin}/min (form=${e.allowedForms.join(",")})  power=${e.powerMW}MW`,
  );
}

// Generators
console.log("\n--- Generators ---");
for (const g of Object.values(generators)) {
  console.log(
    `  ${g.name.padEnd(28)} produces=${g.powerProductionMW}MW  fuels=${g.fuels.length}`,
  );
  for (const f of g.fuels.slice(0, 3)) {
    console.log(`     fuel=${f.fuel}  +supp=${f.supplementalResource ?? "-"}`);
  }
}

// Sanity: are there items referenced by recipes that don't exist in items?
const missing = new Set();
for (const r of Object.values(recipes)) {
  for (const e of [...r.ingredients, ...r.products]) {
    if (!items[e.item]) missing.add(e.item);
  }
}
console.log(
  `\nMissing items referenced by recipes: ${missing.size}${missing.size ? " — " + [...missing].join(", ") : ""}`,
);

// Russian names check
const noRu = Object.values(items).filter((i) => !i.nameRu).length;
console.log(`Items without Russian name: ${noRu}/${Object.keys(items).length}`);
