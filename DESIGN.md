# DESIGN.md — Tiny Game Factory architecture

This describes *how* the factory is built and why. For *what the terms mean*, see
`CONTEXT.md`. For *decisions*, see `docs/adr/`.

## Design goal

Make the search for a playable game loop **deterministic, resumable, and
falsifiable** — driven by artifacts, not conversation — without committing to an
engine, content, or art before evidence earns them.

## Two strata, one repo

1. **Factory runtime** (`scripts/`, `schemas/`, `hooks/`) — real, deterministic,
   testable code. Validators prove the repo matches its own contracts; the run
   initializer creates durable seed state; guards block doctrine violations. This
   stratum is dependency-free (Node built-ins only) and unit-tested.
2. **Orchestration harness** (`.factory/prompts/`, `.codex/skills/`, `docs/`,
   `docs/agents/`) — the doctrine and task contracts that drive agents through the
   phases. This stratum is documents and routing, not running code.

They meet at the manifest and the artifact paths. An agent reads doctrine + a
prompt, does work, emits a schema-valid artifact, and records a ledger row; the
runtime validates it. (This mirrors Tiny App Factory's proven separation: the
orchestration layer stays developer-side; generated products stay free of
orchestration state.)

## Artifacts are the operating system

Agents communicate by files, not chat:

- `manifest.json` — per-seed phase authority (`current_phase`, paths, resume point).
- `execution-ledger.jsonl` — append-only temporal truth; every transition is a row.
- `GAME_THESIS.md` — the compiled thesis (P01); markdown carrying a canonical
  fenced `json` block that validates against `schemas/game-thesis`.
- `decisions/NNNN-*.md` — reversible engine/architecture ADRs; the engine decision
  likewise carries a `json` block validating against `schemas/engine-profile-decision`.
- `playtests/<branch>/playtest_report.json` — bot/human evidence.
- `reviews/<branch>/ANTI_BORING_VERDICT.md`, `reviews/BRANCH_BAKEOFF.md` — verdicts.
- `handoffs/{seed-id}.md` — durable next-agent transfer.

## Runtime components

| Component | Responsibility |
|---|---|
| `scripts/init-game-run.mjs` | Create ONLY `.tgf/seeds/{seed-id}/`. Never a child repo, engine, or thesis. Validates manifest + path policy. |
| `scripts/advance-run.mjs` | Advance a run to its next phase: refuses illegal transitions, appends a schema-valid ledger row, updates `current_phase`/`resume_point`, and re-validates the whole manifest before writing — the write-side counterpart to `summarize-run` (so manifest and ledger can't desync). |
| `scripts/validate-artifacts.mjs` | `required-tree`, `schemas` (+fixtures), `generated-leakage`, `no-default-engine`, `skill-refs`, `gate`, `issues`, `thesis`/`engine` (embedded-json artifacts), `run`. The acceptance engine. `run` validates a seed run at **any** phase: manifest schema + path policy, manifest↔ledger phase agreement, legal ledger transitions, phase-gated artifacts (incl. thesis/engine embedded-json), and **fun-lock gate evidence** (a passing depth vector must exist before a run is fun-locked). |
| `scripts/run-gates.mjs` | Sandboxes each `hooks/*` guard and proves it blocks the unsafe case and allows the safe case; fails if a registered guard has no scenario. |
| `scripts/verify-local-tools.mjs` | Probes tools via real commands (grouped by category); refreshes a generated block in the toolchain ledger. Memory is never proof. |
| `scripts/summarize-run.mjs` | Evidence-first run summary from manifest + ledger (crash-safe). |
| `scripts/lib/validate-json-schema.mjs` | ~90-line dependency-free JSON-schema subset validator. |
| `scripts/lib/run-state.mjs` | Deep module for one seed run: paths, owned files, manifest/ledger read + schema validation, path policy, symlink guard, the phase state machine (legal transitions + phase-gated artifacts), and embedded-`json`-block extraction/validation for markdown artifacts (thesis, engine decision). |
| `scripts/lib/factory-contract.mjs` | Single source of truth for the contract surface: phases, skills, schemas, hooks, fixtures, prompt count, gate thresholds. |
| `scripts/lib/anti-boring-gate.mjs` | Consistency checks for gate artifacts (total == sum, an ADVANCE clears the gate, dominant_move agrees with action_distribution) — gate policy in a checker, not the schema. |
| `hooks/lib/guard.mjs` | Shared, zero-import plumbing for the guards (opaque-asset pattern, playtests walker, argv/block/allow). |

### Why a hand-rolled validator?

The factory must run with **zero install** (`npm run verify` works offline). The
schemas use a small, fixed subset of JSON Schema (type/enum/pattern/required/
properties/items/min·max/additionalProperties), so a tiny validator is simpler and more
honest than pulling a dependency. If schemas grow beyond the subset, adopting `ajv`
as the one accepted dev dependency is the documented escape hatch.

## Schemas (`schemas/`)

`seed-manifest` · `game-thesis` · `engine-profile-decision` · `playtest-report` ·
`depth-vector` · `branch-score` · `execution-ledger-row` · `asset-provenance`.
Each declares `$schema`/`title`/`type` and is exercised by a fixture in
`examples/fixtures/`.

## Hooks (`hooks/`)

Policy + executable prototypes that **block, not warn**: `scope_brake`,
`art_fidelity_cap`, `asset_provenance`, `mcp_mutation_must_emit_text`,
`engine_migration_requires_adr`, `phaser_version_pin`, `playtest_report_required`,
`afk_heartbeat_required`, `no_content_before_fun_lock`, `minimum_bot_session_gate`,
`two_bot_spread_gate`. Every guard declared in `factory.config.toml` ships an
executable here (no policy-only entries). Shared, zero-import plumbing lives in
`hooks/lib/guard.mjs`, so each guard carries only its rule and they run identically
in a child game repo or the gate sandbox. Real Claude/Codex hook adapters pass
changed paths via stdin/env; `run-gates` proves every registered guard blocks the
unsafe case and allows the safe one.

## Skills (`.codex/skills/`) and adapters

Twelve project-local wrappers, each binding one prompt/contract (or declaring
itself a router) and owning paths, gates, wording, and leakage rules. `adapters/`
holds thin per-host mirrors (`codex/`, `claude-code/`, `grok-build/`, `mcp/`); the
`.codex/skills/` definitions are the source of truth. Borrowed skills are wrapped
or referenced, never vendored (ADR 0004).

## Non-goals at initialization

No engine framework, ECS, multiplayer server, AI-content integration, opaque asset
pipeline, account/cloud/deploy surface, or copied source-project code. The
`no-default-engine` validator fails the build if any engine is scaffolded before a
seed thesis and engine ADR.

## Relationship to Tiny App Factory

TGF reuses TAF's hard-won lesson — *orchestration artifacts stay developer-side;
generated products stay clean* — and its manifest-first harness pattern. It does
**not** copy TAF's Expo-specific code; TAF is evidence, not substrate.
