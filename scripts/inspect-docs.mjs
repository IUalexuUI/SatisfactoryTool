import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "data-raw/en-US.json";
const buf = readFileSync(path);
const text = buf.toString("utf16le").replace(/^﻿/, "");
const data = JSON.parse(text);

console.log(`Top-level: ${Array.isArray(data) ? "array" : typeof data}, length: ${data.length}`);
console.log("\nNativeClass values (top-level groups):");
for (const group of data) {
  const nc = group.NativeClass ?? "?";
  const n = Array.isArray(group.Classes) ? group.Classes.length : 0;
  console.log(`  ${n.toString().padStart(4)}  ${nc}`);
}
