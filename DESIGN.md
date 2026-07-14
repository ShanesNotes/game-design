# DESIGN.md — game-design architecture

This describes *how* the game-design harness is built and why. For *what the terms
mean*, see `CONTEXT.md`. For *decisions*, see `docs/adr/`.

## Design goal

Make the search for a deep, falsifiable game spec **deterministic, resumable, and
falsifiable** — driven by artifacts, not conversation — ending at an exported
spec pack, without committing to an engine, content, or art before evidence earns
them. No game is built in this repo (ADR 0006).

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
- `reviews/ANTI_BORING_VERDICT.md` + `reviews/depth-vector.json` — the paper
  design review; an `ADVANCE` here is design-lock.
- `SPEC.md` — the decomposition (P18); carries a `json` block validating against
  `schemas/spec-decomposition`.
- `issues/*.md` — one issue per slice, rendered only by `emit-local-issues.mjs`.
- handoff truth lives in the run ledger + `manifest.spec_pack_path` (no separate
  run-dir handoff file); the exported spec pack itself is the terminal artifact.

## Runtime components

| Component | Responsibility |
|---|---|
| `scripts/init-game-run.mjs` | Create ONLY `.tgf/seeds/{seed-id}/`. Never a spec pack, engine, or thesis. Validates manifest + path policy. |
| `scripts/walk-game-idea.mjs` | End-to-end idea-factory entrypoint: initialize/resume one seed, write `IDEA_WALKTHROUGH.md`, show the architectural decision ladder, and preview the issue decomposition once thesis + engine decision + `SPEC.md` are valid. |
| `scripts/advance-run.mjs` | Advance a run to its next phase: refuses illegal transitions, appends a schema-valid ledger row, updates `current_phase`/`resume_point`, and re-validates the whole manifest before writing — the write-side counterpart to `summarize-run` (so manifest and ledger can't desync). |
| `scripts/validate-artifacts.mjs` | `required-tree`, `schemas` (+fixtures), `generated-leakage`, `no-default-engine`, `skill-refs`, `gate`, `issues`, `thesis`/`engine`/`spec` (embedded-json artifacts), `run`. The acceptance engine. `run` validates a seed run at **any** phase: manifest schema + path policy, manifest↔ledger phase agreement, legal ledger transitions, phase-gated artifacts (incl. thesis/engine/spec embedded-json), and **design-lock gate evidence** (a gate-passing depth vector must exist in `reviews/` before a run is at engine-profile/decompose/handoff/complete). |
| `scripts/run-gates.mjs` | Sandboxes each guard (the 3 factory hooks and the 8 shipped pack guards) and proves it blocks the unsafe case and allows the safe case; fails if a registered guard has no scenario. |
| `scripts/verify-local-tools.mjs` | Probes tools via real commands (grouped by category); refreshes a generated block in the toolchain ledger. Memory is never proof. |
| `scripts/summarize-run.mjs` | Evidence-first run summary from manifest + ledger (crash-safe). |
| `scripts/emit-local-issues.mjs` | The only renderer of `issues/`: turns a valid `SPEC.md` into `.tgf/seeds/{seed-id}/issues/*.md`, one issue per slice with pack-relative evidence links; dry-run by default (`--write`/`--force`). |
| `scripts/package-spec.mjs` | Exports the spec pack (`npm run spec:package`): assembles `templates/spec-pack/` + run artifacts into `$STUDIO_ROOT/games/{seed-id}` (or `--to`); dry-run by default, gated by run validation and the leakage scan. |
| `scripts/lib/validate-json-schema.mjs` | ~90-line dependency-free JSON-schema subset validator. |
| `scripts/lib/run-state.mjs` | Deep module for one seed run: paths, owned files, manifest/ledger read + schema validation, path policy, symlink guard, the phase state machine (legal transitions + phase-gated artifacts), and embedded-`json`-block extraction/validation for markdown artifacts (thesis, engine decision, spec). |
| `scripts/lib/factory-contract.mjs` | Single source of truth for the contract surface: phases, skills, schemas, hooks, fixtures, prompt count, gate thresholds. |
| `scripts/lib/anti-boring-gate.mjs` | Consistency checks for gate artifacts (total == sum, an ADVANCE clears the gate, dominant_move agrees with action_distribution) — gate policy in a checker, not the schema. |
| `scripts/lib/spec-decomposition.mjs` | Consistency policy for `SPEC.md`: tracer bullet first (order 1 = type `slice`), contiguous orders, dependencies point earlier, every chosen-loop verb covered. |
| `scripts/lib/leakage.mjs` | The forbidden-token list shared by the `generated-leakage` validator and the `package-spec` export gate. |
| `hooks/lib/guard.mjs` | Shared, zero-import plumbing for the guards (opaque-asset pattern, evidence walker, argv/block/allow); the copy shipped at `templates/spec-pack/guards/lib/guard.mjs` must stay byte-identical (validator-enforced). |

### Why a hand-rolled validator?

The factory must run with **zero install** (`npm run verify` works offline). The
schemas use a small, fixed subset of JSON Schema (type/enum/pattern/required/
properties/items/min·max/additionalProperties), so a tiny validator is simpler and more
honest than pulling a dependency. If schemas grow beyond the subset, adopting `ajv`
as the one accepted dev dependency is the documented escape hatch.

## Schemas (`schemas/`)

`asset-provenance` · `depth-vector` · `engine-profile-decision` · `execution-ledger-row` · `game-thesis` · `genre-index-row` · `intake-grill` · `module-card` · `playtest-report` · `portfolio-digest` · `reference-card` · `seed-manifest` · `spec-decomposition`.
Each declares `$schema`/`title`/`type`. Core schemas have fixtures in
`examples/fixtures/`; thesis, engine-profile, and spec use embedded-json checks on
real runs. `playtest-report`, `asset-provenance`, and `depth-vector` also ship
with every spec pack so downstream evidence can be validated by factory tooling;
`module-card` validates harvested primitive candidates before code adoption.
(`branch-score` was deleted with the bakeoff phase, ADR 0006.)

## Hooks (`hooks/`) and shipped guards (`templates/spec-pack/guards/`)

Policy + executable prototypes that **block, not warn**, split per ADR 0006:

- **Factory hooks** (`hooks/`, config `[hooks]`): `scope_brake` (no game code in
  the factory), `engine_migration_requires_adr`, `mcp_mutation_must_emit_text`.
- **Build-time guards** (`templates/spec-pack/guards/`, config
  `[spec_pack.guards]`): `art_fidelity_cap`, `asset_provenance`,
  `phaser_version_pin`, `playtest_report_required`, `afk_heartbeat_required`,
  `no_content_before_fun_lock`, `minimum_bot_session_gate`, `two_bot_spread_gate`.
  These ship inside every spec pack and enforce doctrine downstream.

Every guard declared in `factory.config.toml` ships an executable (no policy-only
entries). Shared, zero-import plumbing lives in `hooks/lib/guard.mjs` (mirrored
byte-identically into the pack), so each guard carries only its rule and runs
identically in a co-dev repo or the gate sandbox. `run-gates` proves every
registered guard — all 11 — blocks the unsafe case and allows the safe one.

## Skills (`.codex/skills/`) and adapters

Ten project-local wrappers, each binding one prompt/contract (or declaring
itself a router) and owning paths, gates, wording, and leakage rules. `adapters/`
holds thin per-host mirrors (`codex/`, `claude-code/`, `grok-build/`, `mcp/`); the
`.codex/skills/` definitions are the source of truth. Borrowed skills are wrapped
or referenced, never vendored (ADR 0004).

## Non-goals at initialization

No engine framework, ECS, multiplayer server, AI-content integration, opaque asset
pipeline, account/cloud/deploy surface, or copied source-project code — and no
game code at any phase (`no_game_code_in_factory`). The `no-default-engine`
validator fails the build if any engine is scaffolded before a seed thesis and
engine decision.

## Relationship to Tiny App Factory

game-design reuses TAF's hard-won lesson — *orchestration artifacts stay developer-side;
generated products stay clean* — and its manifest-first harness pattern. It does
**not** copy TAF's Expo-specific code; TAF is evidence, not substrate.
