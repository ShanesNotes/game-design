#!/usr/bin/env node
// Dependency-free lint: syntax-check every .mjs under scripts/, hooks/, tests/ with `node --check`.
// Stands in for a full linter until one is justified.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const roots = ["scripts", "hooks", "tests", ".codex/skills"];
const files = [];
function collect(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (e.name.endsWith(".mjs")) files.push(p);
  }
}
roots.forEach(collect);

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) {
    failed++;
    console.error(`FAIL ${f}\n${r.stderr.trim()}`);
  }
}
console.log(`${failed ? "✗" : "✓"} lint: ${files.length - failed}/${files.length} files OK`);
process.exit(failed ? 1 : 0);
