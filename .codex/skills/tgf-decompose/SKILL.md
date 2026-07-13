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
- `intake/office-hours.md` (named near-references from the grill — with thesis)
- `schemas/spec-decomposition.schema.json`, `docs/agents/issue-tracker.md`
- `docs/reference-games/index.jsonl` + `cards/<id>.json` for each audited id
  named as near (packaging + system-BOM checklist tier)

**Outputs** (emit before summarizing)
- `SPEC.md` (one fenced JSON block; set `manifest.spec_path`; disposition every
  cited audited card's `system_bom` as slice/seam map or CUT DECISION in
  `out_of_scope`, or write `Reference packaging: SKIPPED (reference canon empty)`)
- `issues/*.md` rendered via `node scripts/emit-local-issues.mjs --seed-id {seed-id} --write`

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- the `to-issues` tracer-bullet vertical-slice pattern, routed through local artifacts

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Never render issues by hand — the renderer is the only writer of `issues/`.
- Verify with `--check spec` and a clean emit dry-run before claiming done.
- No remote publishing; issues are local files inside the seed run.
- **Reference packaging:** audited cards only; `packaging_lessons` inform pack
  decisions; every `system_bom` system maps to a slice/seam or a CUT DECISION
  sentence — never import a BOM row silently; zero named-and-audited cards →
  SKIPPED line in SPEC.md.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
