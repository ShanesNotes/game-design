---
name: tgf-depth-redteam
description: Run the adversarial anti-boring gate on a compiled thesis (paper), scoring the 12-axis depth vector and emitting an ADVANCE/DEEPEN/KILL verdict that opens or blocks design-lock.
---

# tgf-depth-redteam

Use when: `manifest.current_phase` is `design-review` — a schema-valid `GAME_THESIS.md` exists and the idea must survive the fertilization gate before any decomposition.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P07_DEPTH_RED_TEAM.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P07_DEPTH_RED_TEAM.md` and execute it exactly.

**Role** — Adversarial design red-team. Wants the idea to fail if it is shallow: scores the 12-axis depth vector by argument against the thesis and runs the paper falsifiers (Two-Bot is deferred into the spec as a falsifiability obligation).

**Inputs**
- `GAME_THESIS.md` (fenced JSON is canonical) and `GAME_SEED.md`
- `docs/anti-boring-gate.md`

**Outputs** (emit before summarizing)
- `reviews/ANTI_BORING_VERDICT.md` with per-axis citations and a verdict
- `reviews/depth-vector.json` (validates `schemas/depth-vector.schema.json`)

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- a critic/adversarial-verifier pattern

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Read-only on the thesis; emit a verdict `ADVANCE` | `DEEPEN` (name exactly one transform) | `KILL`.
- Design-lock requires total >= 16/24 with nonzero Choice, Tradeoff, Pressure, Uncertainty, Mastery, and Replayable Variation.
- On DEEPEN the run re-enters `thesis` (deepen_attempt_count ≤ 2, then killed).
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
