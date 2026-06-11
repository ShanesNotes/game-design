// Shared, self-contained plumbing for the factory guards. Each hook should carry
// only its RULE — not its own copy of argv handling, the opaque-asset pattern, the
// playtests walker, and the block/allow exit protocol. Zero imports beyond Node
// built-ins on purpose: a guard plus this lib must stay portable enough to run from
// the gate sandbox or a child game repo with no other repo files present (copy the
// whole hooks/ directory and the guards still work).
import fs from "node:fs";
import path from "node:path";

// Opaque / non-diffable asset extensions the factory gates care about.
export const OPAQUE_ASSET_RE = /\.(png|jpg|jpeg|webp|psd|blend|fbx|glb|gltf|wav|mp3|ogg)$/i;

// Paths a guard is reasoning about: everything after `node hook.mjs`, minus bare
// flags like --afk.
export function changedPaths() {
  return process.argv.slice(2).filter((a) => !a.startsWith("--"));
}
export function argsString() {
  return process.argv.slice(2).join(" ");
}
export function hasFlag(flag) {
  return process.argv.includes(flag);
}

export function block(msg) {
  console.error(`[guard:${guardName()}] BLOCK: ${msg}`);
  process.exit(2);
}
export function allow() {
  process.exit(0);
}
function guardName() {
  return path.basename(process.argv[1] || "guard").replace(/\.mjs$/, "");
}

// Recursively collect playtests/**/playtest_report.json under `root` (relative to cwd).
export function playtestReports(root = "playtests") {
  const acc = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "playtest_report.json") acc.push(p);
    }
  })(root);
  return acc;
}

export function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}
