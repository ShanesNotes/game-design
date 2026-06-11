# Tiny Game Factory

A local-first, evidence-first agentic game-development **meta-factory**. It turns a
one-sentence game *seed* into a playable, bot-tested, anti-boring-gated first slice —
and refuses to commit to an engine, content, or art before evidence earns them.

> Search > codegen · Fun > polish · Evidence > sunk cost · Code-native > opaque ·
> Played by a bot/human > merely compiled.

This repository is the **factory**, not a game. It owns reusable doctrine, prompts,
schemas, hooks, and validators. Generated games live elsewhere
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

No child game repo, engine, or gameplay code is created by initialization. The next
agent reads `.tgf/seeds/{seed-id}/README_AGENT_BOOT.md` and proceeds through the
phases.

## Backlog bridge

Use `walk-game-idea.mjs` as the end-to-end seed walkthrough. It initializes or
resumes a seed, writes `.tgf/seeds/{seed-id}/IDEA_WALKTHROUGH.md`, shows the
architectural decision ladder, and previews backlog decomposition when enough
evidence exists. After a seed has both `GAME_THESIS.md` and an accepted engine
decision, dry-run local backlog issues directly with:

```bash
node scripts/emit-local-issues.mjs --seed-id <seed-id>
```

Add `--write` only when you want to create `.tgf/issues/*.md`. No remote tracker is
published by default.

## How it works

`seed → toolchain → thesis → engine ADR → [prototype lanes] → first slice →
depth red-team → branch bakeoff → fun-lock → [content/art/polish/QA/release] →
handoff`

State is recorded in `.tgf/seeds/{seed-id}/manifest.json` (the manifest beats
memory). A slice only advances if a bot can play it and it passes the
**anti-boring gate** (four falsifiers + a 16/24 depth vector). See `CONTEXT.md`.

## Layout

```
AGENTS.md CONTEXT.md DESIGN.md README.md factory.config.toml package.json
docs/            doctrine, engine matrix, anti-boring gate, ledgers; adr/; agents/
.factory/prompts P00–P17 task contracts
.codex/skills/   12 project-local TGF skill wrappers
schemas/         9 JSON schemas (manifest, thesis, playtest, depth, branch, ...)
hooks/           11 executable guard prototypes
scripts/         verify-local-tools · init-game-run · walk-game-idea · advance-run · emit-local-issues · validate-artifacts · run-gates · summarize-run
templates/       run/ (seed-run state) · game-repo/ (future child game)
examples/        fixtures/ (schema fixtures) · seeds/ (empty; see README there)
```

## Documentation

- `CONTEXT.md` — domain dictionary (start here).
- `DESIGN.md` — how the factory is built (runtime vs orchestration).
- `docs/doctrine.md` — non-negotiable doctrine and phase model.
- `docs/engine-matrix.md` — engine candidates and the no-default-engine policy.
- `docs/anti-boring-gate.md` — falsifiers and the depth vector.
- `docs/adr/` — accepted architectural decisions.
- `docs/agents/` — domain, issue-tracker, and triage-label context for borrowed skills.
- `docs/game-dev-bridge.md` — future seam from idea factory to local game-dev backlog.
- `docs/handoffs/` — completed factory passes (e2e validation, architecture deepening).

## Status

v0.1.0 — factory skeleton, **e2e-validated**. Two contrasting seeds reached
fun-lock through the full pipeline; see `docs/handoffs/dolphin-tgf-e2e-RESULT.md`.
Child game repos live outside this repo at `/home/ark/tgf-games/{seed-id}/`; per-seed
run state is gitignored under `.tgf/seeds/{seed-id}/`. Run `npm run verify` before
claiming done — do not trust hard-coded counts in archived handoff docs.
