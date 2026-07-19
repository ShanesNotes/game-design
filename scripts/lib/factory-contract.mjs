// The single source of truth for the factory's contract surface: the lists of
// skills, schemas, hooks, prompts, and fixtures, and the numeric gate thresholds.
// Before this, SKILLS/SCHEMAS/HOOKS were copy-pasted into validate-artifacts.mjs,
// tests/factory.test.mjs, and run-gates.mjs, so adding a skill/schema/hook meant
// editing several files in lockstep — a drift seam. Validators and tests import
// from here; CONTEXT.md/DESIGN.md point to it as canonical. Phase names come from
// the phase machine in run-state.mjs so the phase spine has exactly one source.
export { ALL_PHASES as PHASES } from "./run-state.mjs";

export const SKILLS = [
  "tgf-harness", "tgf-office-hours-grill", "tgf-verify-toolchain", "tgf-seed-compile",
  "tgf-depth-redteam", "tgf-engine-profile", "tgf-decompose", "tgf-handoff",
  "tgf-existing-project-rescue", "tgf-repo-scout"
];

export const SCHEMAS = [
  "seed-manifest", "intake-grill", "portfolio-digest", "game-thesis", "engine-profile-decision", "spec-decomposition",
  "depth-vector", "playtest-report", "execution-ledger-row", "asset-provenance",
  "module-card", "reference-card", "genre-index-row"
];

// Hooks that gate THIS repo (the spec pipeline). Proven by run-gates.mjs from hooks/.
export const FACTORY_HOOKS = [
  "scope_brake", "engine_migration_requires_adr", "mcp_mutation_must_emit_text"
];

// Build-time guards the factory no longer enforces but SHIPS with every spec pack
// (ADR 0006). They live in templates/spec-pack/guards/ and are still dry-run-proven
// by run-gates.mjs so a spec pack never carries a broken guard.
export const SPEC_PACK_GUARDS = [
  "art_fidelity_cap", "asset_provenance", "phaser_version_pin",
  "playtest_report_required", "afk_heartbeat_required", "no_content_before_fun_lock",
  "minimum_bot_session_gate", "two_bot_spread_gate"
];

// The run's markdown artifacts that carry a canonical fenced ```json block: which
// manifest field locates each one and which schema its block validates against.
// Validators, the issue renderer, and the walkthrough all read this mapping.
export const ARTIFACT_KINDS = {
  thesis: { manifestKey: "game_thesis_path", schemaName: "game-thesis" },
  engine: { manifestKey: "engine_decision_path", schemaName: "engine-profile-decision" },
  spec: { manifestKey: "spec_path", schemaName: "spec-decomposition" }
};

export const FIXTURE_SCHEMA = {
  "minimal-seed-manifest.json": "seed-manifest.schema.json",
  "minimal-game-thesis.json": "game-thesis.schema.json",
  "minimal-spec-decomposition.json": "spec-decomposition.schema.json",
  "minimal-playtest-report.json": "playtest-report.schema.json",
  "minimal-depth-vector.json": "depth-vector.schema.json",
  "minimal-ledger-row.json": "execution-ledger-row.schema.json",
  "minimal-module-card.json": "module-card.schema.json",
  "minimal-reference-card.json": "reference-card.schema.json",
  "minimal-genre-index-row.json": "genre-index-row.schema.json"
};

// Active prompt files in .factory/prompts/. Retired build-phase prompts live in
// .factory/prompts/attic/ (ADR 0006) and are not part of the live contract.
export const PROMPTS = [
  "P00_ORCHESTRATOR_ULTRAGOAL.md",
  "P01_SEED_COMPILE.md",
  "P02_ENGINE_PROFILE.md",
  "P07_DEPTH_RED_TEAM.md",
  "P13_EXISTING_PROJECT_RESCUE.md",
  "P14_KILL_RESTART.md",
  "P16_REPO_SCOUT.md",
  "P17_VERIFY_TOOLCHAIN.md",
  "P18_DECOMPOSE_SPEC.md",
  "P19_PACKAGE_SPEC.md"
];

// Numeric gate thresholds. These mirror factory.config.toml [gates]; a test asserts
// they stay in sync (governance-03). REQUIRED_NONZERO_AXES are the six depth-vector
// axes that must be nonzero for design-lock (docs/anti-boring-gate.md). The bot
// session thresholds govern the shipped spec-pack guards, not factory phases.
export const THRESHOLDS = {
  depth_vector_min_total: 16,
  dominant_move_max_action_share: 0.70,
  minimum_bot_session_seconds: 60,
  nightly_bot_session_seconds: 300
};

export const REQUIRED_NONZERO_AXES = [
  "meaningful_choice", "tradeoff", "pressure", "uncertainty", "mastery", "replayable_variation"
];

// Design registers (ADR 0007, extended by ADR 0008). A thesis declares where its
// depth lives; the gate keeps the same twelve axes and the same >=16/24 floor in
// every register, but the mandatory-nonzero set is register-specific.
// mechanics-first is the historical default (absent field = mechanics-first);
// hybrid claims mechanics are load-bearing and is held to the same bar.
// narrative-first swaps Replayable Variation for Progression: a campaign's pull is
// forward accumulation, not re-run variation. world-first (ADR 0008) is for seeds
// whose payload is a place: it requires Progression and Expansion Headroom instead
// of Mastery and Replayable Variation — the world's pull is discovery and growth,
// not execution skill or re-runs; mastery and variation still score.
export const DESIGN_REGISTERS = ["mechanics-first", "narrative-first", "hybrid", "world-first"];

export const REQUIRED_NONZERO_AXES_BY_REGISTER = {
  "mechanics-first": REQUIRED_NONZERO_AXES,
  "hybrid": REQUIRED_NONZERO_AXES,
  "narrative-first": ["meaningful_choice", "tradeoff", "pressure", "uncertainty", "mastery", "progression"],
  "world-first": ["meaningful_choice", "tradeoff", "pressure", "uncertainty", "progression", "expansion_headroom"]
};
