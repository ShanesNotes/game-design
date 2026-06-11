# Initialization Handoff — Tiny Game Factory

> **Historical record (2026-06 init).** For current status see `README.md` and
> `docs/handoffs/dolphin-tgf-e2e-RESULT.md`. Counts below reflect the tree at
> merge time; run `npm run verify` for live proof.

Status at init: **initialized and verify-green (v0.1.0).** No child game repo or
`/home/ark/tgf-games/` existed yet; source repos untouched.

**Later (2026-06-07):** e2e validation drove two seeds to fun-lock and shipped
`advance-run.mjs` plus run-validator fixes — see `docs/handoffs/dolphin-tgf-e2e-RESULT.md`.

## Layout decision — resolved

**ADR 0004 (factory layout) is `Accepted`** (owner-confirmed 2026-06-06; register
**D013** resolved). The repo uses `.factory/prompts/` + `.codex/skills/` (12 wrappers)
+ `docs/agents/`, superseding the flat `prompts/` + `skills/`-with-6 layout of
clean-init spec §4 (which is amended to point at ADR 0004). Architecture deepening
merged on `deepen-architecture`; see `docs/handoffs/claude-architecture-deepening-RESULT.md`.

## Verify

```bash
npm run verify     # lint + validate-artifacts (7 checks) + run-gates (11 guards) + tests
```

Plus the on-demand initializer check (creates only `.tgf/seeds/{id}`):

```bash
node scripts/init-game-run.mjs --seed-id demo-seed --seed "a demo seed" --dry-run
node scripts/init-game-run.mjs --seed-id demo-seed --seed "a demo seed"
node scripts/validate-artifacts.mjs --check run --seed-id demo-seed
node scripts/verify-local-tools.mjs --write docs/toolchain-verification-ledger.md
```

## Next action (to actually use the factory)

1. Pick a one-line game seed.
2. `node scripts/init-game-run.mjs --seed-id <kebab-id> --seed "<seed>"`.
3. Read `.tgf/seeds/<id>/README_AGENT_BOOT.md` and route by `manifest.current_phase`
   (start: `toolchain` → P17, then `thesis` → P01). Do **not** write code before
   `GAME_THESIS.md`; do **not** create a child game repo before a thesis + engine ADR.

## What was built

- `docs/` doctrine, engine matrix, anti-boring gate, hooks/guards, ledgers; `adr/`
  0001–0005; `agents/` (domain, issue-tracker, triage-labels) for borrowed skills.
- `.factory/prompts/` P00–P17 task contracts (normalized; `P07_DEPTH_RED_TEAM.md`).
- `.codex/skills/` 12 TGF wrappers (wrap/reference Pocock skills, never vendor).
- `schemas/` 8 JSON schemas + `examples/fixtures/` 5 fixtures; zero-dep validator.
- `hooks/` 11 blocking guards; `scripts/` init-game-run, advance-run, validate-artifacts,
  run-gates, verify-local-tools, summarize-run.
- `templates/run/` (seed run state) + `templates/game-repo/` (leakage-clean child).

## Constraints honored

No `/home/ark/tgf-games/` at init; no child game repo; no engine scaffolded before a
thesis; no orchestration/source leakage into child-game templates; the three source
repos (`tiny-app-factory`, `tincture-of-mercy`, `rescue-town-builders`) were
byte-unchanged at init. OMX ultragoal audit artifacts were local-only (not committed);
committed handoff records live under `docs/handoffs/`.

## v0.2.0 pivot (2026-06-11)

The build pipeline described above is historical. **ADR 0006** pivoted the factory:
the terminal artifact is now an exported **spec pack** (depth-gated thesis +
issue-sliced `SPEC.md`), and no game is built in this repo. Build phases, prompts,
and the three build skills were retired (prompts to `.factory/prompts/attic/`);
8 of the 11 guards now ship inside `templates/spec-pack/guards/`. Legacy v0.1.0
seed runs are archived under `.tgf/archive/` (untracked). See
`docs/adr/0006-spec-pack-is-the-terminal-artifact.md` for the authoritative record.