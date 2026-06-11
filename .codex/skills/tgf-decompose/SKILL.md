---
name: tgf-decompose
description: Author SPEC.md from a design-locked thesis — ordered tracer-bullet slices with falsifiable acceptance — then render the local issue backlog from it.
---

# tgf-decompose

Use when: `manifest.current_phase` is `decompose` — the thesis is design-locked (gate-passing ADVANCE depth vector in `reviews/`) and an accepted engine decision exists.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P18_DECOMPOSE_SPEC.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P18_DECOMPOSE_SPEC.md` and execute it exactly.

**Role** — Spec author. Owns the slicing judgment: which vertical slices, in what order, proving what. The schema owns the shape; `scripts/emit-local-issues.mjs` owns the rendering.

**Inputs**
- `GAME_THESIS.md`, `reviews/ANTI_BORING_VERDICT.md`, `decisions/0001-engine-profile.md`
- `schemas/spec-decomposition.schema.json`, `docs/agents/issue-tracker.md`

**Outputs** (emit before summarizing)
- `SPEC.md` (one fenced JSON block; set `manifest.spec_path`)
- `issues/*.md` rendered via `node scripts/emit-local-issues.mjs --seed-id {seed-id} --write`

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- the `to-issues` tracer-bullet vertical-slice pattern, routed through local artifacts

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Never render issues by hand — the renderer is the only writer of `issues/`.
- Verify with `--check spec` and a clean emit dry-run before claiming done.
- No remote publishing; issues are local files inside the seed run.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
