---
name: tgf-branch-bakeoff
description: Use to judge competing game lanes once playtest reports and anti-boring verdicts exist, scoring branches and picking the winning mechanic.
---

# tgf-branch-bakeoff

Use when: multiple lanes have playtest reports and anti-boring verdicts to compare.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P08_BRANCH_BAKEOFF.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P08_BRANCH_BAKEOFF.md` and execute it exactly.

**Role** — Branch bakeoff judge. Scores branches by the rubric and selects the winning mechanic — merging the idea, not necessarily the branch.

**Inputs**
- all `playtests/**/playtest_report.json`
- all `reviews/**/ANTI_BORING_VERDICT.md`
- branch run commands/captures

**Outputs** (emit before summarizing)
- `reviews/BRANCH_BAKEOFF.md` (per-branch scores align with `schemas/branch-score.schema.json`) and the next implementation decision
- the manifest transition this phase owns: set `current_phase` to `fun-lock` on a gate-passing winner (else route to `P14` as `deepen`/`killed`), plus the `execution-ledger.jsonl` row recording the verdict and transition

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- a reviewer/evidence-synthesis pattern

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Anti-boring is a hard pass/fail; code health is a 10% tiebreak only.
- Merge the winning mechanic and reimplement clean if the fun branch is messy; do not auto-merge a branch.
- Never create a child game repo by default, never copy `.tgf`/`.omx`/ledgers/skill docs into a generated game, and never assume an unverified tool.
