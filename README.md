# game-design

**game-design** is the spec-only discipline repo under **game-studio**: it
produces depth-gated theses and issue-sliced spec packs, and builds no game
(see [../DESIGN-RECORD.md](../DESIGN-RECORD.md) §2). Product name is
**game-design** (formerly tiny-game-factory; old `tgf-*` skill ids kept for
compatibility only).

Studio boot (parent): `../README.md` + `../CLAUDE.md`. This repo's agent entry:
`AGENTS.md` + `CONTEXT.md` + `CLAUDE.md`.

A local-first, evidence-first agentic **spec harness** for games. It fertilizes a
one-line game *seed* into a depth-gated `GAME_THESIS.md`, decomposes it into an
issue-sliced `SPEC.md`, and exports the result as a **spec pack** — a clean folder
handed to forge (or co-dev). **No game is built in this repo** (ADR 0006).

> Search > codegen · Fun > polish · Evidence > sunk cost · Code-native > opaque ·
> Falsifiable on paper > merely asserted.

This repository is the **design harness**, not a game. It owns reusable doctrine,
prompts, schemas, hooks, and validators. Spec packs export by default to
`$STUDIO_ROOT/games/_export-<seed-id>` (two-dir shape: export there, then
`forge intake` births `games/<seed-id>`); `--to` always wins over the default.

## Quickstart

```bash
# From this repo (design/)
npm run verify     # lint + artifact validation + guard dry-run + tests
# npm ci also works: package-lock.json is kept on purpose despite zero deps

# Initialize durable run state for a seed (creates ONLY .tgf/seeds/{seed-id}):
node scripts/init-game-run.mjs --seed-id tiny-asteroid-gardening \
  --seed "tiny asteroid gardening" --dry-run     # preview
node scripts/init-game-run.mjs --seed-id tiny-asteroid-gardening \
  --seed "tiny asteroid gardening"               # write

# Or start/resume the guided idea-factory walkthrough:
node scripts/walk-game-idea.mjs --seed-id tiny-asteroid-gardening \
  --seed "tiny asteroid gardening"
```

No spec pack, engine, or gameplay code is created by initialization. The next
agent reads `.tgf/seeds/{seed-id}/README_AGENT_BOOT.md` and proceeds through the
phases.

### The golden path, gate by gate

Under factory_version 0.3.0 the design artifacts at each gate are **human-authored
by design** — the scripts validate and record; they do not generate them. A worked
example for every authored artifact ships under `examples/` (placeholder content
is labeled EXAMPLE), and `tests/quickstart-cold-walk.test.mjs` replays exactly
this sequence to a green export, so the list below cannot drift silently. After
every advance, `node scripts/validate-artifacts.mjs --check run --seed-id <id>`
is the honest status check.

1. **intake** — build the portfolio digest, then author the grill:
   ```bash
   npm run portfolio:digest -- --seed-id <id>  # writes intake/portfolio-digest.json
   ```
   Author `.tgf/seeds/<id>/intake/office-hours.md` — one fenced ```json block
   against `schemas/intake-grill.schema.json`, with `portfolio_digest_ref` equal
   to `.tgf/seeds/<id>/intake/portfolio-digest.json` verbatim:
   ```json
   {
     "schema_version": "1.0.0",
     "seed_id": "<id>",
     "portfolio_digest_ref": ".tgf/seeds/<id>/intake/portfolio-digest.json",
     "demand_reality": "…", "status_quo": "…", "desperate_specificity": "…",
     "narrow_playable_wedge": "…", "observation_evidence": "…",
     "premise_challenge": "…", "alternatives": "…", "future_fit": "…",
     "store_positioning": "…", "reviewer_concern": "…"
   }
   ```
   The `…` answers are the human grill judgment (P00/`tgf-office-hours-grill`),
   grounded in the digest. Then advance:
   ```bash
   node scripts/advance-run.mjs --seed-id <id> --to toolchain \
     --event intake-complete --status passed
   ```
   (the advance refuses until both intake artifacts validate — the portfolio
   gate at the front door, ADR 0011.)
2. **toolchain** — run P17's real probes (`docs/toolchain-verification-ledger.md`);
   no design artifact. Advance `--to thesis`.
3. **thesis** — author `.tgf/seeds/<id>/GAME_THESIS.md` (one fenced ```json
   block against `schemas/game-thesis.schema.json`; worked example
   `examples/fixtures/minimal-game-thesis.json`). The portfolio-era shape adds:
   `schema_version: "2.0.0"` and a `portfolio_distinctness` block —
   `nearest_prior_seed` (a seed id from the digest, or `"none"` when it lists
   zero prior theses), `falsifying_difference` (a concrete, checkable
   difference), and `digest_generated_at` (the digest's `generated_at`,
   verbatim). Then:
   ```bash
   node scripts/advance-run.mjs --seed-id <id> --to design-review \
     --event thesis-compiled --status passed \
     --set game_thesis_path=.tgf/seeds/<id>/GAME_THESIS.md
   ```
4. **design-review** — author two artifacts (P07 owns the verdict judgment):
   - `.tgf/seeds/<id>/reviews/depth-vector.json` (worked example
     `examples/fixtures/minimal-depth-vector.json`): `schema_version: "2.0.0"`,
     `register` equal to the thesis `design_register`, per-axis `evidence` whose
     every value is a **real dotted field-path into the thesis JSON**
     (e.g. `core_loop_candidates[0].verbs`), `review_provenance`
     `{mode, reviewer_note}`, and a verdict. `ADVANCE` requires total ≥ 16/24
     with the register's six mandatory axes nonzero — and ≥ 1 thesis
     `feel_target`.
   - `.tgf/seeds/<id>/reviews/ANTI_BORING_VERDICT.md` (worked example
     `examples/reviews/ANTI_BORING_VERDICT.md`) carrying a **distinctness
     disposition**: one line naming both "Distinctness" and the nearest prior
     seed id (or `none`).
   `ADVANCE` is design-lock. Advance `--to engine-profile`.
5. **engine-profile** — author `.tgf/seeds/<id>/decisions/0001-engine-profile.md`
   from `templates/run/decisions/0001-engine-profile.md` (`status: "accepted"`;
   for a forge-bound pack, `profile: "godot-4"` with its
   `godot_min`/`godot_max`/`renderer`/`language` fields — other profiles export
   without a forge manifest). Then:
   ```bash
   node scripts/advance-run.mjs --seed-id <id> --to decompose \
     --event engine-decided --status passed \
     --set engine_decision_path=.tgf/seeds/<id>/decisions/0001-engine-profile.md
   ```
6. **decompose** — author `.tgf/seeds/<id>/SPEC.md` (one fenced ```json block
   against `schemas/spec-decomposition.schema.json`; worked example
   `examples/fixtures/minimal-spec-decomposition.json`; `seed_id` must equal the
   run's). Each slice's `evidence_requirements` follow the forge-enforced
   contract — a game-relative path glob (`docs/evidence/<slice-id>/**`) or an
   exact produced-evidence type token (`log` | `metric` | `screenshot`); prose
   never verifies downstream (see P18). Then record the path on the exit
   transition and render the backlog:
   ```bash
   node scripts/advance-run.mjs --seed-id <id> --to handoff \
     --event spec-decomposed --status passed \
     --set spec_path=.tgf/seeds/<id>/SPEC.md
   node scripts/emit-local-issues.mjs --seed-id <id> --write
   ```
7. **handoff** — export the pack (dry-run first, then write):
   ```bash
   npm run spec:package -- --seed-id <id> --require-manifest
   npm run spec:package -- --seed-id <id> --write --require-manifest
   ```
   Default target is `$STUDIO_ROOT/games/_export-<id>` (`--to` always wins);
   `--require-manifest` hard-fails a non-godot-4 profile instead of exporting
   manifest-less.

## Decompose and package

Use `walk-game-idea.mjs` as the end-to-end seed walkthrough. It initializes or
resumes a seed, writes `.tgf/seeds/{seed-id}/IDEA_WALKTHROUGH.md`, shows the
architectural decision ladder, and previews the decomposition once thesis +
engine decision + `SPEC.md` exist. After decompose authors `SPEC.md`, render the
issue backlog and export the pack:

```bash
# Render SPEC.md into .tgf/seeds/{seed-id}/issues/*.md (dry-run by default):
node scripts/emit-local-issues.mjs --seed-id <seed-id>           # preview
node scripts/emit-local-issues.mjs --seed-id <seed-id> --write   # write

# Export the spec pack (dry-run by default; leakage-gated).
# Studio path — always use --to under games/:
npm run spec:package -- --seed-id <seed-id> \
  --to ../games/_export-<seed-id> --write --require-manifest
```

No remote tracker is published by default. Forge then:

```bash
# From STUDIO_ROOT
node forge/bin/forge.mjs intake games/_export-<seed-id>
```

Worked studio proof: `../forge/docs/walking-skeleton.md` (`skeleton-001`).

## How it works

`seed → intake (default entry) → toolchain → thesis → design-review → engine-profile →
decompose → handoff → complete`, with `design-review --DEEPEN--> deepen → thesis`
(≤2 attempts, then killed).

State is recorded in `.tgf/seeds/{seed-id}/manifest.json` (the manifest beats
memory). The thesis declares where its depth lives (`design_register`:
mechanics-first | narrative-first | hybrid | world-first) and how it must feel
(`golden_moment`, `feel_targets` — `docs/feel-doctrine.md`), and only advances
if it passes the **anti-boring gate on paper** (register-aware falsifiers + a
16/24 depth vector; feel claims attacked as findings); the `ADVANCE` verdict is
**design-lock**, which opens engine-profile → decompose. The Two-Bot test cannot
run on paper, so it is deferred into the spec as `bot_success_criteria`
obligations the slices carry downstream. An owner-supplied `BRIEF.md` in the run
dir feeds the thesis as intent evidence and the red-team as claims-to-falsify.
See `CONTEXT.md`.

## Layout

```
AGENTS.md CONTEXT.md DESIGN.md README.md CLAUDE.md factory.config.toml package.json
docs/            adr/; agents/; anti-boring gate, doctrine, engine matrix, ledgers
docs/reference-games/  Tier-1 cards + Tier-2 genre index
.factory/prompts active task contracts (P00–P02, P07, P13–P14, P16–P19); retired build prompts culled per docs/doctrine-audit-ledger.md (T04)
.codex/skills/   10 project-local skill wrappers (`tgf-*` ids kept for compatibility)
schemas/         JSON schemas (manifest, thesis, depth, spec-decomposition, ...)
hooks/           factory guards (build-time guards ship in templates/spec-pack/guards/)
scripts/         advance-run · emit-local-issues · init-game-run · lint · package-spec · …
templates/       run/ (seed-run state) · spec-pack/ (the exported pack skeleton)
examples/        fixtures/ (schema fixtures) · reviews/ (worked gate artifacts, EXAMPLE-labeled) · seeds/
tests/           behavior test suite (run via `npm run verify`)
```

## Documentation

- `AGENTS.md` — agent rules and governance.
- `CONTEXT.md` — domain dictionary (start here for vocabulary).
- `CLAUDE.md` — Claude Code bootstrap (points at AGENTS + verify).
- `DESIGN.md` — how the factory is built (runtime vs orchestration).
- `docs/adr/` — accepted architectural decisions (0006 is the spec-pack pivot).
- `docs/agents/` — domain, issue-tracker, triage-labels, skill-wrapper-doctrine.
- `docs/anti-boring-gate.md` — paper falsifiers and the depth vector.
- `docs/feel-doctrine.md` — golden moment, feel targets: feel as falsifiable design input.
- `docs/doctrine.md` — non-negotiable doctrine and phase model.
- `docs/engine-matrix.md` — engine candidates and the no-default-engine policy.
- `docs/game-dev-bridge.md` — the spec-pack handoff (into forge / co-dev).
- `docs/reference-games/` — README (pull-only doctrine), CANON.md, TAXONOMY.md.

## Status

v0.2.0 — spec-pack pivot (ADR 0006). The factory stops at an exported,
verifier-clean spec pack; building, playtesting, and fun-lock move downstream
into forge + the game repo. Per-seed run state is gitignored under
`.tgf/seeds/{seed-id}/`. Run `npm run verify` before claiming done.
