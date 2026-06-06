// The single source of truth for the factory's contract surface: the lists of
// skills, schemas, hooks, and fixtures, the prompt count, and the numeric gate
// thresholds. Before this, SKILLS/SCHEMAS/HOOKS were copy-pasted into
// validate-artifacts.mjs, tests/factory.test.mjs, and run-gates.mjs, so adding a
// skill/schema/hook meant editing several files in lockstep — a drift seam.
// Validators and tests import from here; CONTEXT.md/DESIGN.md point to it as
// canonical. Phase names come from the phase machine in run-state.mjs so the phase
// spine has exactly one source.
export { ALL_PHASES as PHASES } from "./run-state.mjs";

export const SKILLS = [
  "tgf-harness", "tgf-office-hours-grill", "tgf-verify-toolchain", "tgf-seed-compile",
  "tgf-engine-profile", "tgf-prototype-dispatch", "tgf-first-slice", "tgf-depth-redteam",
  "tgf-branch-bakeoff", "tgf-existing-project-rescue", "tgf-repo-scout", "tgf-handoff"
];

export const SCHEMAS = [
  "seed-manifest", "game-thesis", "engine-profile-decision", "playtest-report",
  "depth-vector", "branch-score", "execution-ledger-row", "asset-provenance"
];

export const HOOKS = [
  "scope_brake", "art_fidelity_cap", "asset_provenance", "engine_migration_requires_adr",
  "phaser_version_pin", "playtest_report_required", "afk_heartbeat_required",
  "mcp_mutation_must_emit_text", "no_content_before_fun_lock",
  "minimum_bot_session_gate", "two_bot_spread_gate"
];

export const FIXTURE_SCHEMA = {
  "minimal-seed-manifest.json": "seed-manifest.schema.json",
  "minimal-game-thesis.json": "game-thesis.schema.json",
  "minimal-playtest-report.json": "playtest-report.schema.json",
  "minimal-depth-vector.json": "depth-vector.schema.json",
  "minimal-ledger-row.json": "execution-ledger-row.schema.json"
};

// Prompts P00..P17 (inclusive).
export const PROMPT_MAX = 17;

// Numeric gate thresholds. These mirror factory.config.toml [gates]; a test asserts
// they stay in sync (governance-03). REQUIRED_NONZERO_AXES are the six depth-vector
// axes that must be nonzero for fun-lock (docs/anti-boring-gate.md).
export const THRESHOLDS = {
  depth_vector_min_total: 16,
  dominant_move_max_action_share: 0.70,
  minimum_bot_session_seconds: 60,
  nightly_bot_session_seconds: 300
};

export const REQUIRED_NONZERO_AXES = [
  "meaningful_choice", "tradeoff", "pressure", "uncertainty", "mastery", "replayable_variation"
];
