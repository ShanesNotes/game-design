// Generated-surface leakage policy: factory orchestration and source-product
// markers must never appear in anything handed to a clean co-dev folder (spec-pack
// templates, example seeds, exported spec packs). One home for the token list so
// validate-artifacts.mjs and package-spec.mjs cannot drift (ADR 0003 separation).
import fs from "node:fs";
import path from "node:path";

export const LEAK_TOKENS = [
  [/\.tgf\b/, ".tgf run state"],
  [/\.omx\b/i, ".omx state"],
  [/\.sandcastle\b/i, ".sandcastle state"],
  [/gstack/i, "GStack"],
  [/pocock/i, "Pocock"],
  [/sandcastle/i, "Sandcastle"],
  [/\bOMX\b/, "OMX"],
  [/tiny[ -]app[ -]factory/i, "Tiny App Factory product term"],
  [/tiny[ -]game[ -]factory/i, "Tiny Game Factory orchestrator name"],
  [/tincture/i, "Tincture of Mercy product term"],
  [/rescue[ -]town[ -]builders/i, "Rescue Town Builders product term"],
  [/\/home\/ark\//, "absolute /home/ark path"]
];

export function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Scan every file under each root; returns "<relative path>: <label>" error strings.
export function leakageErrors(roots, relativeTo = process.cwd()) {
  const errors = [];
  for (const root of roots) {
    for (const file of listFiles(root)) {
      const text = fs.readFileSync(file, "utf8");
      for (const [re, label] of LEAK_TOKENS) {
        if (re.test(text)) errors.push(`leakage in ${path.relative(relativeTo, file)}: ${label}`);
      }
    }
  }
  return errors;
}
