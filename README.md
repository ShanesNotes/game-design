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
`$STUDIO_ROOT/games/<seed-id>` (path-registry). Prefer
`$STUDIO_ROOT/games/_export-<seed-id>/` via `--to` when you want a non-product
export folder; `--to` always wins over the default.

## Quickstart

```bash
# From this repo (design/)
npm run verify     # lint + artifact validation + guard dry-run + tests

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
.factory/prompts active task contracts (P00–P02, P07, P13–P14, P16–P19); retired build prompts in attic/
.codex/skills/   10 project-local skill wrappers (`tgf-*` ids kept for compatibility)
schemas/         JSON schemas (manifest, thesis, depth, spec-decomposition, ...)
hooks/           factory guards (build-time guards ship in templates/spec-pack/guards/)
scripts/         advance-run · emit-local-issues · init-game-run · lint · package-spec · …
templates/       run/ (seed-run state) · spec-pack/ (the exported pack skeleton)
examples/        fixtures/ (schema fixtures) · seeds/
tests/           186-test suite
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
