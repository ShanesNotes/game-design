# Initialization Handoff — Tiny Game Factory

Status: **initialized and verify-green (v0.1.0).** No game has been generated; no
child game repo or `/home/ark/tgf-games/` exists; source repos untouched.

## One decision needs your confirmation

**ADR 0004 (factory layout) is `Proposed`, not accepted** — see `docs/adr/0004-*`
and decision register **D013**. The repo uses `.factory/prompts/` + `.codex/skills/`
(12 wrappers) + `docs/agents/`, per the implementation handoff. This **supersedes a
detail of the user-accepted clean-init spec §4** (which drew a flat `prompts/` +
`skills/` tree with 6 skills). It was an agent-made reconciliation, so per the
ADR-gate rule it is not self-accepted.

- **Confirm** → flip ADR 0004 to Accepted, resolve D013, amend clean-init §4/§13.
- **Reverse** → ADR 0004 is the single place to roll back to the flat 6-skill layout.

Nothing else in the build is blocked on this; everything verifies under the chosen
layout either way (the validator asserts whatever tree exists).

## Verify

```bash
npm run verify     # lint (15/15) + validate-artifacts (5 checks) + run-gates (14) + tests (11)
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
  0001–0004; `agents/` (domain, issue-tracker, triage-labels) for borrowed skills.
- `.factory/prompts/` P00–P17 task contracts (normalized; `P07_DEPTH_RED_TEAM.md`).
- `.codex/skills/` 12 TGF wrappers (wrap/reference Pocock skills, never vendor).
- `schemas/` 8 JSON schemas + `examples/fixtures/` 5 fixtures; zero-dep validator.
- `hooks/` 7 blocking guards; `scripts/` init-game-run, validate-artifacts, run-gates,
  verify-local-tools, summarize-run.
- `templates/run/` (seed run state) + `templates/game-repo/` (leakage-clean child).

## Constraints honored

No `/home/ark/tgf-games/`; no child game repo; no engine scaffolded before a thesis;
no orchestration/source leakage into child-game templates; the three source repos
(`tiny-app-factory`, `tincture-of-mercy`, `rescue-town-builders`) are byte-unchanged
(before/after snapshots under `.omx/ultragoal/source-status/`); no external/credentialed
action. Full audit: `.omx/ultragoal/tiny-game-factory-implementation-final-report.md`.
