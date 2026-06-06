# Claude Handoff — Tiny Game Factory Architecture Deepening

You are working in `/home/ark/tiny-game-factory`.

## Mission

Run an architecture-deepening pass on the initialized Tiny Game Factory repo. Start from the six findings below, choose the highest-leverage candidate, and produce a clean plan or small implementation slice that improves locality, leverage, testability, and AI-navigability without violating the factory doctrine.

Do **not** start a game seed. Do **not** create `/home/ark/tgf-games`. Do **not** accept or reverse ADR 0004 unless the user explicitly gives that decision.

## Required read path

Read these first, in order:

1. `AGENTS.md`
2. `CONTEXT.md`
3. `DESIGN.md`
4. `docs/doctrine.md`
5. `docs/adr/0001-meta-factory-root.md`
6. `docs/adr/0002-evidence-first-prototype-search.md`
7. `docs/adr/0003-factory-game-separation.md`
8. `docs/adr/0004-factory-layout-and-skill-packaging.md`
9. `docs/initialization-handoff.md`
10. `scripts/validate-artifacts.mjs`, `scripts/init-game-run.mjs`, `scripts/run-gates.mjs`, `scripts/verify-local-tools.mjs`, `tests/factory.test.mjs`

## Current verified state

The repo was freshly analyzed after initialization:

- `npm run verify` passed.
- Lint: 15/15 files OK.
- Artifact validation: required tree, schemas, generated leakage, no default engine, skill refs all passed.
- Gates: 14/14 guard scenarios passed.
- Tests: 11/11 passed.
- Git tree was clean after verification.

## Open governance point

ADR 0004 / D013 is still **Proposed**, not Accepted.

The repo currently uses:

- `.factory/prompts/` for P00–P17
- `.codex/skills/` for 12 TGF wrappers
- `docs/agents/` for borrowed Matt Pocock-style skill context

This supersedes an earlier clean-init spec detail that used flat `prompts/` + `skills/` with 6 skills. The implementation records this as Proposed because it reversed a ratified planning detail. Treat the layout as current working reality, but do not mark ADR 0004 Accepted without user confirmation.

## Six architecture-deepening findings

Use the skill language precisely: **Module**, **Interface**, **Implementation**, **Depth**, **Seam**, **Adapter**, **Leverage**, **Locality**.

### 1. Run state module

**Files**

- `scripts/init-game-run.mjs`
- `scripts/summarize-run.mjs`
- `scripts/validate-artifacts.mjs`
- `templates/run/*`
- `schemas/seed-manifest.schema.json`
- `schemas/execution-ledger-row.schema.json`

**Problem**

Manifest, ledger, child-game path policy, resume rules, and validation behavior are split across scripts, templates, schemas, and docs. Understanding one run transition requires bouncing between too many small modules.

**Deepening direction**

Concentrate run-state creation, manifest validation, ledger reading/writing, path policy, and resume summary behind one deeper Module. The public Interface should be smaller than the current scattered knowledge callers need.

**Benefits**

Better Locality for phase/resume/path-policy bugs. Higher Leverage in tests because run-state behavior can be exercised through one Interface.

### 2. Factory contract registry

**Files**

- `CONTEXT.md`
- `factory.config.toml`
- `scripts/validate-artifacts.mjs`
- `.factory/prompts/`
- `.codex/skills/`
- `tests/factory.test.mjs`

**Problem**

Phase names, skill names, schema names, hooks, fixtures, and prompt expectations are duplicated across docs and scripts.

**Deepening direction**

Create or formalize one canonical factory-contract registry that validators and tests read. Do not break ADR 0004’s current layout.

**Benefits**

Better Locality when adding/removing phases, prompts, schemas, wrappers, or hooks. More Leverage from one contract source rather than repeated literals.

### 3. Guard policy module

**Files**

- `hooks/*.mjs`
- `scripts/run-gates.mjs`
- `docs/hooks-and-guards.md`
- `factory.config.toml`

**Problem**

Each hook owns its own argv/cwd parsing and blocking behavior. Gate scenarios live separately in `run-gates`, so guard rules and proof cases can drift.

**Deepening direction**

Deepen guard execution into a shared guard-policy Module while keeping each guard rule focused. Preserve executable hooks and current 14 scenario checks.

**Benefits**

Better Locality for hook adapter behavior. Better Leverage when adding Claude/Codex hook inputs or a new guard.

### 4. Toolchain verification module

**Files**

- `scripts/verify-local-tools.mjs`
- `factory.config.toml`
- `docs/toolchain-verification-ledger.md`
- `.factory/prompts/P17_VERIFY_TOOLCHAIN.md`

**Problem**

Probe commands are hardcoded in the script, while desired tool/engine metadata lives in config and docs.

**Deepening direction**

Concentrate probe definitions, statuses, and ledger rendering in a deeper Module. Keep probes evidence-first and local-command-backed.

**Benefits**

Better per-machine re-probes. Less drift between engine matrix, config, and generated ledger.

### 5. Skill wrapper pack

**Files**

- `.codex/skills/*/SKILL.md`
- `.factory/prompts/*`
- `scripts/validate-artifacts.mjs`

**Problem**

The 12 wrappers repeat read paths, manifest rules, boundary rules, leakage rules, and borrowed-skill wording. They are useful but shallow.

**Deepening direction**

Keep the `.codex/skills/` layout. Deepen shared wrapper doctrine and validation so each wrapper only carries phase-specific differences.

**Benefits**

Better Locality for wording and safety updates. Less risk that one wrapper drifts from doctrine.

### 6. Local issue tracker validation

**Files**

- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- future `.tgf/issues/*`

**Problem**

Borrowed skills are told to write local markdown issues, but there is no validator/schema for issue files yet.

**Deepening direction**

Add issue artifact validation when `.tgf/issues/` becomes active. Keep all issue/PRD/triage output local by default.

**Benefits**

Makes borrowed `to-prd`, `to-issues`, and `triage` safer and more AI-navigable.

## Recommended first slice

Start with **Finding 1: Run state module** unless fresh evidence shows another candidate is clearly more valuable.

Why: it has the strongest combination of immediate behavior, security/path policy, tests, and future seed-run leverage. It also supports later candidates: validators, issue tracking, and handoffs all depend on manifest/ledger/run-state correctness.

## Constraints

- Preserve `npm run verify` green.
- Keep diffs small and reviewable.
- No new dependencies unless explicitly justified and accepted.
- Do not create a child game repo.
- Do not start a seed run except in temporary test directories.
- Do not leak factory vocabulary into `templates/game-repo/**` or `examples/seeds/**`.
- Do not change the semantics of `scripts/init-game-run.mjs`:
  - creates only `.tgf/seeds/{seed-id}/`
  - never writes `GAME_THESIS.md`
  - never creates `/home/ark/tgf-games`
  - refuses unsafe symlink write-through
  - leaves manifest at `toolchain`

## Expected output

Produce one of these, depending on scope:

1. A concise architecture plan naming the chosen Module, its Interface, what Implementation moves behind it, and what tests prove behavior; or
2. A small implementation slice for the run-state Module with tests and verification.

If implementing, finish with:

- changed files
- why this increases Depth
- verification commands and results
- remaining risks
- whether ADR 0004 remains untouched

## Verification gate

Before claiming done, run:

```bash
npm run verify
git status --short
```

If you changed run-state behavior, also run targeted initializer checks in a temp directory and confirm no `/home/ark/tgf-games` path was created.
