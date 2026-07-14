# AGENTS.md — Operating game-design

You are operating the **game-design** harness (spec-only; formerly tiny-game-factory),
not a game. Read `CONTEXT.md` first; it is the domain dictionary. This file is the
operating procedure.

> If you are inside an exported spec pack instead, read that pack's own
> `AGENTS.md` (derived from `templates/spec-pack/AGENTS.md`), not this one.

## Read path (in order)

1. `CONTEXT.md` — what the factory is and its vocabulary.
2. `docs/doctrine.md` — the non-negotiable doctrine; its gate and feel sections
   point into `docs/anti-boring-gate.md` and `docs/feel-doctrine.md`.
3. `docs/adr/` — decisions: **accepted** 0001 (root), 0002 (evidence-first), 0003
   (separation), 0004 (layout — owner-confirmed 2026-06-06; register D013 resolved),
   0005 (gate policy in checkers, not schemas), 0006 (spec pack is the terminal
   artifact — the pivot), 0007 (register-aware design-lock), 0008 (world-first
   register, seam slices, BRIEF.md input seam), 0010 (feel doctrine under studio
   terms; supersedes culled 0009), 0011 (portfolio at the front door — intake
   default entry, distinctness, depth evidence/provenance), 0012 (design lanes —
   manifest design_lane: mode/stop_line/origination).
4. `factory.config.toml` — doctrine flags, gate thresholds, engine matrix.
5. The relevant `.factory/prompts/P##_*.md` for the phase you are in.

## What the factory does

Seed → **intake** (office-hours grill + portfolio digest; default entry) →
toolchain check → thesis → paper design review (anti-boring gate → design-lock)
→ engine decision → decompose into `SPEC.md` + `issues/` → handoff (export the
spec pack) → complete. On a `DEEPEN` verdict the thesis re-enters `thesis` with
one transform via `deepen` (≤2 attempts, then killed). No game is built here;
building, playtesting, and fun-lock happen downstream inside the exported pack.
State lives in `.tgf/seeds/{seed-id}/manifest.json`. See the phase/prompt/skill
table in `CONTEXT.md`.

## Starting or resuming a run

```bash
# Initialize durable run state only (no spec pack, no engine, no code):
node scripts/init-game-run.mjs --seed-id <kebab-id> --seed "<one-line seed>"

# Then route by the manifest's current_phase. Resume reads the manifest, never chat.
node scripts/summarize-run.mjs --seed-id <kebab-id>

# Or the all-in-one walkthrough (init/resume + durable IDEA_WALKTHROUGH.md + issue dry-run):
node scripts/walk-game-idea.mjs --seed-id <kebab-id> [--seed "<one-line seed>"]

# Advance a phase (refuses illegal transitions; re-validates before writing):
node scripts/advance-run.mjs --seed-id <kebab-id> --to <phase> --event <event> --status passed

# At decompose: render SPEC.md into the issue backlog (dry-run by default):
node scripts/emit-local-issues.mjs --seed-id <kebab-id> --write

# At handoff: export the spec pack (dry-run by default; leakage-gated):
npm run spec:package -- --seed-id <kebab-id> --write
```

The initializer creates **only** `.tgf/seeds/{seed-id}/`. It never creates a spec
pack, picks an engine, or writes `GAME_THESIS.md`.

## Non-negotiables

- No game code in the factory — ever (`no_game_code_in_factory`, `scope_brake`).
- No decomposition before `GAME_THESIS.md` exists; no slicing before design-lock
  (a gate-passing depth vector in `reviews/`).
- No architecture/engine/art questions to the user before the thesis. At most
  **one** direction-changing taste question (with a recommended default) before
  the spec is decomposed.
- Existing projects are evidence, not destiny; the current engine is an option, not
  a constraint.
- Engine migration requires a new `decisions/NNNN-*.md` ADR.
- The spec pack is exported only by `scripts/package-spec.mjs`, gated by run
  validation and the leakage scan. Factory vocabulary, ledgers, hooks, and skill
  docs must never leak into a pack.
- Playtest evidence, bot-session minimums, and content-before-fun-lock rules are
  **shipped-pack doctrine**: the pack's guards enforce them downstream in the
  co-dev repo, not in this repo.
- Completion is verifier evidence, not agent prose.

## Skills

Project-local skill wrappers live in `.codex/skills/` (ids still use the historical
`tgf-*` prefix for path compatibility). Each wraps one prompt/contract (or declares
itself a router) and owns its paths, gates, and leakage rules:

`tgf-decompose` · `tgf-depth-redteam` · `tgf-engine-profile` · `tgf-existing-project-rescue` · `tgf-handoff` · `tgf-harness` · `tgf-office-hours-grill` · `tgf-repo-scout` · `tgf-seed-compile` · `tgf-verify-toolchain`.

Borrowed Matt Pocock skills are wrapped/referenced, never vendored. Generic
issue/PRD/triage skills route through `docs/agents/` and local artifacts; they must
not publish remotely by default.

## Gates (must block, not warn)

The factory keeps 3 hooks (`factory.config.toml` `[hooks]`, executables in
`hooks/`); 8 build-time guards ship inside every spec pack
(`[spec_pack.guards]`, executables in `templates/spec-pack/guards/`).
`scripts/run-gates.mjs --dry-run` proves all 11 block their unsafe scenarios
(36 scenarios — see `docs/hooks-and-guards.md` and
`scripts/lib/factory-contract.mjs`). Harden them if needed; do not remove one
without an ADR.

## Before claiming done

```bash
npm run verify   # lint + validate-artifacts + run-gates + tests
```

Then record the phase transition in the seed's `execution-ledger.jsonl` with
changed paths, verification commands/results, and any blockers.

## Lane policy

Solo orchestration. Lanes and bakeoffs were build-era concepts, retired per
ADR 0006. Subagents may handle disjoint research/review work; the parent
integrates and owns final verification. See `CONTEXT.md` → Lane policy.
