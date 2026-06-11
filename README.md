# Tiny Game Factory

A local-first, evidence-first agentic **spec factory** for games. It fertilizes a
one-line game *seed* into a depth-gated `GAME_THESIS.md`, decomposes it into an
issue-sliced `SPEC.md`, and exports the result as a **spec pack** — a clean folder
opened elsewhere for human+AI co-development. **No game is built in this repo**
(ADR 0006).

> Search > codegen · Fun > polish · Evidence > sunk cost · Code-native > opaque ·
> Falsifiable on paper > merely asserted.

This repository is the **factory**, not a game. It owns reusable doctrine, prompts,
schemas, hooks, and validators. Spec packs are exported elsewhere
(`/home/ark/tgf-games/{seed-id}` by default) and stay free of factory state.

## Quickstart

```bash
# Probe the local toolchain (writes a generated block into the ledger):
node scripts/verify-local-tools.mjs --write docs/toolchain-verification-ledger.md

# Initialize durable run state for a seed (creates ONLY .tgf/seeds/{seed-id}):
node scripts/init-game-run.mjs --seed-id tiny-asteroid-gardening \
  --seed "tiny asteroid gardening" --dry-run     # preview
node scripts/init-game-run.mjs --seed-id tiny-asteroid-gardening \
  --seed "tiny asteroid gardening"               # write

# Or start/resume the guided idea-factory walkthrough:
node scripts/walk-game-idea.mjs --seed-id tiny-asteroid-gardening \
  --seed "tiny asteroid gardening"

# Verify the whole factory:
npm run verify     # lint + artifact validation + guard dry-run + tests
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

# Export the spec pack (dry-run by default; leakage-gated):
npm run spec:package -- --seed-id <seed-id>                      # preview
npm run spec:package -- --seed-id <seed-id> --write              # export
```

No remote tracker is published by default.

## How it works

`seed → intake (when vague) → toolchain → thesis → design-review → engine-profile →
decompose → handoff → complete`, with `design-review --DEEPEN--> deepen → thesis`
(≤2 attempts, then killed).

State is recorded in `.tgf/seeds/{seed-id}/manifest.json` (the manifest beats
memory). The thesis only advances if it passes the **anti-boring gate on paper**
(analytical falsifiers + a 16/24 depth vector); the `ADVANCE` verdict is
**design-lock**, which opens engine-profile → decompose. The Two-Bot test cannot
run on paper, so it is deferred into the spec as `bot_success_criteria`
obligations the slices carry downstream. See `CONTEXT.md`.

## Layout

```
AGENTS.md CONTEXT.md DESIGN.md README.md factory.config.toml package.json
docs/            doctrine, engine matrix, anti-boring gate, ledgers; adr/; agents/
.factory/prompts active task contracts (P00–P02, P07, P13–P14, P16–P19); retired build prompts in attic/
.codex/skills/   10 project-local TGF skill wrappers
schemas/         9 JSON schemas (manifest, thesis, depth, spec-decomposition, ...)
hooks/           3 factory guards (8 build-time guards ship in templates/spec-pack/guards/)
scripts/         verify-local-tools · init-game-run · walk-game-idea · advance-run · emit-local-issues · package-spec · validate-artifacts · run-gates · summarize-run
templates/       run/ (seed-run state) · spec-pack/ (the exported pack skeleton)
examples/        fixtures/ (schema fixtures) · seeds/ (empty; see README there)
```

## Documentation

- `CONTEXT.md` — domain dictionary (start here).
- `DESIGN.md` — how the factory is built (runtime vs orchestration).
- `docs/doctrine.md` — non-negotiable doctrine and phase model.
- `docs/engine-matrix.md` — engine candidates and the no-default-engine policy.
- `docs/anti-boring-gate.md` — paper falsifiers and the depth vector.
- `docs/adr/` — accepted architectural decisions (0006 is the spec-pack pivot).
- `docs/agents/` — domain, issue-tracker, and triage-label context for borrowed skills.
- `docs/game-dev-bridge.md` — the spec-pack handoff into a co-dev workspace.
- `docs/handoffs/` — completed factory passes (e2e validation, architecture deepening).

## Status

v0.2.0 — spec-pack pivot (ADR 0006). The factory stops at an exported,
verifier-clean spec pack; building, playtesting, and fun-lock move downstream
into the pack. Legacy v0.1.0 seed runs (which built first slices under factory
orchestration) are archived under `.tgf/archive/` (untracked) and are not
migrated. Per-seed run state is gitignored under `.tgf/seeds/{seed-id}/`. Run
`npm run verify` before claiming done — do not trust hard-coded counts in
archived handoff docs.
