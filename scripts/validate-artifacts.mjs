#!/usr/bin/env node
// Factory artifact validator. Proves the repo matches its own contracts without needing a
// runtime game. Checks: required-tree | schemas | generated-leakage | no-default-engine | skill-refs | run | all.
// `all` runs every check except `run`, which is on-demand (requires --seed-id).
// Usage: node scripts/validate-artifacts.mjs --check <mode> [--seed-id <id>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./lib/validate-json-schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);
const exists = (...p) => fs.existsSync(rel(...p));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const SKILLS = [
  "tgf-harness", "tgf-office-hours-grill", "tgf-verify-toolchain", "tgf-seed-compile",
  "tgf-engine-profile", "tgf-prototype-dispatch", "tgf-first-slice", "tgf-depth-redteam",
  "tgf-branch-bakeoff", "tgf-existing-project-rescue", "tgf-repo-scout", "tgf-handoff"
];

const SCHEMAS = [
  "seed-manifest", "game-thesis", "engine-profile-decision", "playtest-report",
  "depth-vector", "branch-score", "execution-ledger-row", "asset-provenance"
];

const HOOKS = [
  "scope_brake", "art_fidelity_cap", "asset_provenance", "engine_migration_requires_adr",
  "phaser_version_pin", "playtest_report_required", "afk_heartbeat_required"
];

const FIXTURE_SCHEMA = {
  "minimal-seed-manifest.json": "seed-manifest.schema.json",
  "minimal-game-thesis.json": "game-thesis.schema.json",
  "minimal-playtest-report.json": "playtest-report.schema.json",
  "minimal-depth-vector.json": "depth-vector.schema.json",
  "minimal-ledger-row.json": "execution-ledger-row.schema.json"
};

// --- required tree ---
function checkRequiredTree() {
  const errors = [];
  const required = [
    "AGENTS.md", "README.md", "CONTEXT.md", "DESIGN.md", "factory.config.toml", "package.json",
    "docs/doctrine.md", "docs/engine-matrix.md", "docs/anti-boring-gate.md", "docs/hooks-and-guards.md",
    "docs/toolchain-verification-ledger.md", "docs/borrowed-patterns.md", "docs/repo-radar.md", "docs/source-ledger.md",
    "docs/adr/0001-meta-factory-root.md", "docs/adr/0002-evidence-first-prototype-search.md",
    "docs/adr/0003-factory-game-separation.md", "docs/adr/0004-factory-layout-and-skill-packaging.md",
    "docs/agents/domain.md", "docs/agents/issue-tracker.md", "docs/agents/triage-labels.md",
    "scripts/verify-local-tools.mjs", "scripts/init-game-run.mjs", "scripts/run-gates.mjs",
    "scripts/validate-artifacts.mjs", "scripts/summarize-run.mjs",
    "templates/run/manifest.json", "templates/run/GAME_SEED.md", "templates/run/GAME_THESIS.template.md",
    "templates/run/README_AGENT_BOOT.md", "templates/run/README_NEXT_ACTIONS.md",
    "templates/run/decisions/0001-engine-profile.md",
    "templates/game-repo/AGENTS.md", "templates/game-repo/README.md", "templates/game-repo/PLAYTEST_PLAN.md"
  ];
  required.push(...SCHEMAS.map((s) => `schemas/${s}.schema.json`));
  required.push(...HOOKS.map((h) => `hooks/${h}.mjs`));
  required.push(...SKILLS.map((s) => `.codex/skills/${s}/SKILL.md`));
  required.push(...Object.keys(FIXTURE_SCHEMA).map((f) => `examples/fixtures/${f}`));
  for (const p of required) if (!exists(p)) errors.push(`missing: ${p}`);

  // prompts P00..P17
  const promptDir = rel(".factory/prompts");
  const promptFiles = fs.existsSync(promptDir) ? fs.readdirSync(promptDir) : [];
  for (let n = 0; n <= 17; n++) {
    const pre = `P${String(n).padStart(2, "0")}_`;
    if (!promptFiles.some((f) => f.startsWith(pre) && f.endsWith(".md"))) errors.push(`missing prompt: .factory/prompts/${pre}*.md`);
  }
  // P07 must be the RED_TEAM-normalized name
  if (promptFiles.includes("P07_DEPTH_REDTEAM.md") && !promptFiles.includes("P07_DEPTH_RED_TEAM.md")) {
    errors.push("prompt P07 not normalized: expected P07_DEPTH_RED_TEAM.md");
  }
  return errors;
}

// --- schemas parse + fixtures validate ---
function checkSchemas() {
  const errors = [];
  for (const s of SCHEMAS) {
    const p = rel("schemas", `${s}.schema.json`);
    if (!fs.existsSync(p)) { errors.push(`missing schema: schemas/${s}.schema.json`); continue; }
    let schema;
    try { schema = JSON.parse(fs.readFileSync(p, "utf8")); }
    catch (e) { errors.push(`schemas/${s}.schema.json does not parse: ${e.message}`); continue; }
    for (const key of ["$schema", "title", "type"]) {
      if (!schema[key]) errors.push(`schemas/${s}.schema.json missing '${key}'`);
    }
    if (schema.type === "object" && !schema.required) {
      errors.push(`schemas/${s}.schema.json (object) has no 'required' array`);
    }
  }
  for (const [fixture, schemaFile] of Object.entries(FIXTURE_SCHEMA)) {
    const fp = rel("examples/fixtures", fixture);
    const sp = rel("schemas", schemaFile);
    if (!fs.existsSync(fp) || !fs.existsSync(sp)) { errors.push(`fixture or schema missing for ${fixture}`); continue; }
    const errs = validate(JSON.parse(fs.readFileSync(sp, "utf8")), JSON.parse(fs.readFileSync(fp, "utf8")));
    errs.forEach((e) => errors.push(`fixture ${fixture}: ${e}`));
  }
  return errors;
}

// --- generated leakage (child game templates must stay free of orchestration/source markers) ---
const LEAK_TOKENS = [
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
function scanDir(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scanDir(p, acc);
    else acc.push(p);
  }
  return acc;
}
function checkGeneratedLeakage() {
  const errors = [];
  const scanRoots = [rel("templates/game-repo"), rel("examples/seeds")];
  for (const root of scanRoots) {
    for (const file of scanDir(root)) {
      const text = fs.readFileSync(file, "utf8");
      for (const [re, label] of LEAK_TOKENS) {
        if (re.test(text)) errors.push(`leakage in ${path.relative(REPO, file)}: ${label}`);
      }
    }
  }
  return errors;
}

// --- no default engine before thesis ---
function checkNoDefaultEngine() {
  const errors = [];
  const engineConfigs = ["vite.config.ts", "vite.config.js", "vite.config.mjs", "project.godot", "Cargo.toml", "next.config.js", "svelte.config.js"];
  for (const c of engineConfigs) if (exists(c)) errors.push(`engine config present at factory root: ${c}`);
  for (const d of ["src", "app", "public", "assets"]) {
    if (exists(d) && fs.statSync(rel(d)).isDirectory()) errors.push(`game scaffolding dir present at factory root: ${d}/`);
  }
  if (exists("package.json")) {
    const pkg = JSON.parse(fs.readFileSync(rel("package.json"), "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const engineDep = /phaser|three|godot|bevy|kaplay|excalibur|@react-three|babylonjs/i;
    for (const name of Object.keys(deps)) if (engineDep.test(name)) errors.push(`engine dependency present: ${name}`);
  }
  return errors;
}

// --- run check (validates a created .tgf/seeds/{id} relative to cwd) ---
function checkRun(seedId) {
  const errors = [];
  if (!seedId) return ["--check run requires --seed-id <id>"];
  const runDir = path.join(process.cwd(), ".tgf", "seeds", seedId);
  const mpath = path.join(runDir, "manifest.json");
  if (!fs.existsSync(mpath)) return [`run manifest missing: ${path.relative(process.cwd(), mpath)}`];
  const manifest = JSON.parse(fs.readFileSync(mpath, "utf8"));
  validate(JSON.parse(fs.readFileSync(rel("schemas/seed-manifest.schema.json"), "utf8")), manifest)
    .forEach((e) => errors.push(`manifest ${e}`));
  if (!["toolchain", "intake"].includes(manifest.current_phase)) errors.push(`current_phase must be toolchain|intake, got ${manifest.current_phase}`);
  if (manifest.external_side_effects_allowed !== false) errors.push("external_side_effects_allowed must be false");

  const lpath = path.join(runDir, "execution-ledger.jsonl");
  if (!fs.existsSync(lpath)) errors.push("execution-ledger.jsonl missing");
  else {
    const first = fs.readFileSync(lpath, "utf8").trim().split("\n")[0];
    try {
      const row = JSON.parse(first);
      validate(JSON.parse(fs.readFileSync(rel("schemas/execution-ledger-row.schema.json"), "utf8")), row)
        .forEach((e) => errors.push(`ledger ${e}`));
    } catch { errors.push("ledger first row is not parseable JSON"); }
  }
  if (fs.existsSync(`/home/ark/tgf-games/${seedId}`)) errors.push(`child game repo unexpectedly exists: /home/ark/tgf-games/${seedId}`);
  for (const bad of ["src", "app", "public", "assets"]) if (fs.existsSync(path.join(runDir, bad))) errors.push(`run dir contains forbidden ${bad}/`);
  if (fs.existsSync(path.join(runDir, "GAME_THESIS.md"))) errors.push("run initializer must not create GAME_THESIS.md");
  return errors;
}

// --- skill wrappers reference an existing prompt or declare themselves a router ---
function checkSkillRefs() {
  const errors = [];
  const promptDir = rel(".factory/prompts");
  const prompts = new Set(fs.existsSync(promptDir) ? fs.readdirSync(promptDir) : []);
  for (const s of SKILLS) {
    const p = rel(".codex/skills", s, "SKILL.md");
    if (!fs.existsSync(p)) { errors.push(`missing skill: .codex/skills/${s}/SKILL.md`); continue; }
    const text = fs.readFileSync(p, "utf8");
    const refs = [...text.matchAll(/P\d\d_[A-Z0-9_]+\.md/g)].map((m) => m[0]);
    refs.filter((r) => !prompts.has(r)).forEach((r) => errors.push(`${s}: references missing prompt ${r}`));
    if (!refs.some((r) => prompts.has(r)) && !/\brouter\b/i.test(text)) {
      errors.push(`${s}: SKILL.md must reference an existing .factory/prompts/P##_*.md or declare itself a router`);
    }
  }
  return errors;
}

const CHECKS = {
  "required-tree": checkRequiredTree,
  schemas: checkSchemas,
  "generated-leakage": checkGeneratedLeakage,
  "no-default-engine": checkNoDefaultEngine,
  "skill-refs": checkSkillRefs,
  run: () => checkRun(arg("seed-id"))
};

const mode = arg("check") || "all";
const toRun = mode === "all"
  ? ["required-tree", "schemas", "generated-leakage", "no-default-engine", "skill-refs"]
  : [mode];

let totalErrors = 0;
for (const name of toRun) {
  const fn = CHECKS[name];
  if (!fn) { console.error(`unknown check: ${name}`); process.exit(2); }
  const errors = fn();
  totalErrors += errors.length;
  if (errors.length) {
    console.log(`✗ ${name} (${errors.length})`);
    errors.forEach((e) => console.log(`    - ${e}`));
  } else {
    console.log(`✓ ${name}`);
  }
}
console.log(totalErrors ? `\n${totalErrors} problem(s) found.` : "\nAll checks passed.");
process.exit(totalErrors ? 1 : 0);
