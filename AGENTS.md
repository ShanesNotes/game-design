# AGENTS.md — Operating the Tiny Game Factory

You are operating the **meta-factory**, not a game. Read `CONTEXT.md` first; it is
the domain dictionary. This file is the operating procedure.

> If you are inside a generated child game repo instead, read that repo's own
> `AGENTS.md` (derived from `templates/game-repo/AGENTS.md`), not this one.

## Read path (in order)

1. `CONTEXT.md` — what the factory is and its vocabulary.
2. `docs/doctrine.md` — the non-negotiable doctrine.
3. `docs/adr/` — decisions: **accepted** 0001 (root), 0002 (evidence-first), 0003
   (separation), 0004 (layout — owner-confirmed 2026-06-06; register D013 resolved),
   0005 (gate policy in checkers, not schemas).
4. `factory.config.toml` — doctrine flags, gate thresholds, engine matrix.
5. The relevant `.factory/prompts/P##_*.md` for the phase you are in.

## What the factory does

Seed → toolchain check → thesis → engine ADR → (optional) prototype lanes → first
playable slice → depth red-team → branch bakeoff → fun-lock, then optional
content/art/polish/QA/release → handoff. State lives in
`.tgf/seeds/{seed-id}/manifest.json`. See the phase/prompt/skill table in
`CONTEXT.md`.

## Starting or resuming a run

```bash
# Initialize durable run state only (no child game, no engine, no code):
node scripts/init-game-run.mjs --seed-id <kebab-id> --seed "<one-line seed>"

# Then route by the manifest's current_phase. Resume reads the manifest, never chat.
node scripts/summarize-run.mjs --seed-id <kebab-id>
```

The initializer creates **only** `.tgf/seeds/{seed-id}/`. It never creates a child
game repo, picks an engine, or writes `GAME_THESIS.md`.

## Non-negotiables

- No implementation before `GAME_THESIS.md` exists.
- No architecture/engine/art/lane questions to the user before the thesis. At most
  **one** direction-changing taste question (with a recommended default) before the
  first slice.
- Existing projects are evidence, not destiny; the current engine is an option, not
  a constraint.
- A gameplay change must emit a `playtests/**/playtest_report.json`.
- A branch is not alive until a bot has played it for ≥60s.
- No content / high-fidelity or opaque art / multiplayer backend / accounts before
  fun-lock and the relevant gate.
- Engine migration requires a new `decisions/NNNN-*.md` ADR.
- Factory vocabulary, ledgers, hooks, and skill docs must never leak into a child
  game repo.
- Completion is verifier evidence, not agent prose.

## Skills

Project-local TGF skills live in `.codex/skills/`. Each wraps one prompt/contract
(or declares itself a router) and owns its paths, gates, and leakage rules:

`tgf-harness` · `tgf-office-hours-grill` · `tgf-verify-toolchain` ·
`tgf-seed-compile` · `tgf-engine-profile` · `tgf-prototype-dispatch` ·
`tgf-first-slice` · `tgf-depth-redteam` · `tgf-branch-bakeoff` ·
`tgf-existing-project-rescue` · `tgf-repo-scout` · `tgf-handoff`.

Borrowed Matt Pocock skills are wrapped/referenced, never vendored. Generic
issue/PRD/triage skills route through `docs/agents/` and local artifacts; they must
not publish remotely by default.

## Gates (must block, not warn)

`scripts/run-gates.mjs --dry-run` proves the guards in `hooks/` block their unsafe
scenario: `scope_brake`, `art_fidelity_cap`, `asset_provenance`,
`engine_migration_requires_adr`, `phaser_version_pin`, `playtest_report_required`,
`afk_heartbeat_required`. Harden them if needed; do not remove one without an ADR.

## Before claiming done

```bash
npm run verify   # lint + validate-artifacts + run-gates + tests
```

Then record the phase transition in the seed's `execution-ledger.jsonl` with
changed paths, verification commands/results, and any blockers.

## Lane policy

Solo parent by default. Use isolated prototype lanes / worktrees / subagents only
when uncertainty warrants it and touch sets are disjoint; the parent integrates and
owns final verification. See `CONTEXT.md` → Lane policy.
