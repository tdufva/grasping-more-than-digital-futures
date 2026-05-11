#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dataDir = "src/_data";
const files = readdirSync(dataDir).filter((file) => file.endsWith(".json")).sort();

for (const file of files) {
  const path = join(dataDir, file);
  JSON.parse(readFileSync(path, "utf8"));
  console.log(`ok ${path}`);
}

console.log(`Validated ${files.length} content data files.`);
