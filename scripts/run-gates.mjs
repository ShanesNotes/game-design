#!/usr/bin/env node
// Dry-run guard prover. Builds throwaway sandboxes and asserts each hook BLOCKS the unsafe
// scenario (exit 2) and ALLOWS the safe one (exit 0). Proves the guards actually gate, without
// touching the real repo. Usage: node scripts/run-gates.mjs --dry-run
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOOKS } from "./lib/factory-contract.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = path.join(REPO, "hooks");

function write(dir, rel, content) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

// Each scenario: guard, kind, setup(sandbox), args, env, expected exit code.
const scenarios = [
  { guard: "scope_brake", kind: "BLOCK", setup: () => {}, args: ["src/game.ts"], expect: 2 },
  { guard: "scope_brake", kind: "ALLOW", setup: (d) => write(d, "GAME_THESIS.md", "# thesis"), args: ["src/game.ts"], expect: 0 },

  { guard: "art_fidelity_cap", kind: "BLOCK", setup: () => {}, args: ["assets/hero.png"], expect: 2 },
  { guard: "art_fidelity_cap", kind: "ALLOW", setup: (d) => { write(d, ".factory/FUN_LOCK", ""); write(d, ".factory/ART_DIRECTION_LOCK", ""); }, args: ["assets/hero.png"], expect: 0 },

  { guard: "asset_provenance", kind: "BLOCK", setup: () => {}, args: ["assets/hero.png"], expect: 2 },
  { guard: "asset_provenance", kind: "ALLOW", setup: (d) => write(d, "assets/hero.provenance.md", "generator: code"), args: ["assets/hero.png"], expect: 0 },

  { guard: "engine_migration_requires_adr", kind: "BLOCK", setup: () => {}, args: ["package.json"], expect: 2 },
  { guard: "engine_migration_requires_adr", kind: "ALLOW", setup: (d) => write(d, "decisions/0001-engine-profile.md", "# adr"), args: ["package.json"], expect: 0 },

  { guard: "phaser_version_pin", kind: "BLOCK", setup: (d) => write(d, "package.json", JSON.stringify({ dependencies: { phaser: "^3.80.0" } })), args: [], expect: 2 },
  { guard: "phaser_version_pin", kind: "ALLOW", setup: (d) => write(d, "package.json", JSON.stringify({ dependencies: { phaser: "^4.1.0" } })), args: [], expect: 0 },

  { guard: "playtest_report_required", kind: "BLOCK", setup: () => {}, args: [], expect: 2 },
  { guard: "playtest_report_required", kind: "ALLOW", setup: (d) => write(d, "playtests/loop-a/playtest_report.json", "{}"), args: [], expect: 0 },

  { guard: "afk_heartbeat_required", kind: "BLOCK", setup: () => {}, args: ["--afk"], expect: 2 },
  { guard: "afk_heartbeat_required", kind: "ALLOW", setup: (d) => write(d, "playtests/loop-a/playtest_report.json", JSON.stringify({ duration_seconds: 320 })), args: ["--afk"], expect: 0 },

  { guard: "mcp_mutation_must_emit_text", kind: "BLOCK", setup: () => {}, args: ["scene.glb"], expect: 2 },
  { guard: "mcp_mutation_must_emit_text", kind: "ALLOW", setup: () => {}, args: ["scene.glb", "scene.recipe.md"], expect: 0 },

  { guard: "no_content_before_fun_lock", kind: "BLOCK", setup: () => {}, args: ["content/level-1.json"], expect: 2 },
  { guard: "no_content_before_fun_lock", kind: "ALLOW", setup: (d) => write(d, ".factory/FUN_LOCK", ""), args: ["content/level-1.json"], expect: 0 },

  { guard: "minimum_bot_session_gate", kind: "BLOCK", setup: (d) => write(d, "playtests/loop-a/playtest_report.json", JSON.stringify({ duration_seconds: 30 })), args: [], expect: 2 },
  { guard: "minimum_bot_session_gate", kind: "ALLOW", setup: (d) => write(d, "playtests/loop-a/playtest_report.json", JSON.stringify({ duration_seconds: 60 })), args: [], expect: 0 },

  { guard: "two_bot_spread_gate", kind: "BLOCK", setup: (d) => { write(d, "playtests/a/playtest_report.json", JSON.stringify({ bot_type: "random" })); write(d, "playtests/b/playtest_report.json", JSON.stringify({ bot_type: "random" })); }, args: [], expect: 2 },
  { guard: "two_bot_spread_gate", kind: "ALLOW", setup: (d) => { write(d, "playtests/a/playtest_report.json", JSON.stringify({ bot_type: "random" })); write(d, "playtests/b/playtest_report.json", JSON.stringify({ bot_type: "heuristic" })); }, args: [], expect: 0 },

  // dx-verify-ci-2: previously untested guard branches (alt provenance files, env
  // trigger, other engine configs, more asset types, devDependencies, packs/ path).
  { guard: "asset_provenance", kind: "ALLOW", setup: (d) => write(d, "assets/hero.provenance.json", "{}"), args: ["assets/hero.png"], expect: 0 },
  { guard: "asset_provenance", kind: "ALLOW", setup: (d) => write(d, "assets/ASSET_PROVENANCE.md", "x"), args: ["assets/hero.png"], expect: 0 },
  { guard: "afk_heartbeat_required", kind: "ALLOW", setup: (d) => write(d, "playtests/loop-a/playtest_report.json", JSON.stringify({ duration_seconds: 320 })), args: [], env: { TGF_AFK: "1" }, expect: 0 },
  { guard: "engine_migration_requires_adr", kind: "BLOCK", setup: () => {}, args: ["Cargo.toml"], expect: 2 },
  { guard: "engine_migration_requires_adr", kind: "BLOCK", setup: () => {}, args: ["project.godot"], expect: 2 },
  { guard: "art_fidelity_cap", kind: "BLOCK", setup: () => {}, args: ["assets/theme.ogg"], expect: 2 },
  { guard: "art_fidelity_cap", kind: "BLOCK", setup: () => {}, args: ["models/hero.blend"], expect: 2 },
  { guard: "phaser_version_pin", kind: "ALLOW", setup: (d) => write(d, "package.json", JSON.stringify({ devDependencies: { phaser: "^4.0.0" } })), args: [], expect: 0 },
  { guard: "scope_brake", kind: "BLOCK", setup: () => {}, args: ["packs/core/index.ts"], expect: 2 }
];

const results = [];
for (const sc of scenarios) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "tgf-gate-"));
  try {
    sc.setup(sandbox);
    const r = spawnSync(process.execPath, [path.join(HOOKS_DIR, `${sc.guard}.mjs`), ...sc.args], { cwd: sandbox, encoding: "utf8", env: { ...process.env, ...(sc.env || {}) } });
    const got = r.status;
    results.push({ ...sc, got, pass: got === sc.expect });
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

// Coverage: every guard registered in the factory-contract must have at least one
// proof scenario, so a newly added guard cannot ship unproven.
const covered = new Set(scenarios.map((s) => s.guard));
const uncovered = HOOKS.filter((h) => !covered.has(h));

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? "✓" : "✗"} ${r.guard} [${r.kind}] expected exit ${r.expect}, got ${r.got}`);
}
for (const h of uncovered) {
  failed++;
  console.log(`✗ ${h} [COVERAGE] registered guard has no gate scenario`);
}
console.log(failed ? `\n${failed} guard scenario(s) failed.` : `\nAll ${results.length} guard scenarios passed (${HOOKS.length} guards covered).`);
process.exit(failed ? 2 : 0);
