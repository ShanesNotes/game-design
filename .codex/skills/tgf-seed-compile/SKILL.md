---
name: tgf-seed-compile
description: Compile a manifest at phase `thesis` from `GAME_SEED.md` into a schema-valid, testable `GAME_THESIS.md`.
---

# tgf-seed-compile

Use when: the manifest is at phase `thesis` and `GAME_SEED.md` must become a testable thesis.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P01_SEED_COMPILE.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P01_SEED_COMPILE.md` and execute it exactly.

**Role** — Seed compiler. Turns the seed into a schema-valid `GAME_THESIS.md` with a declared design register (`design_register`: mechanics-first | narrative-first | hybrid | world-first, ADR 0007/0008), loop candidates, depth mechanisms, engine candidates, first slice, bot success criteria, and kill conditions — generating, not asking.

**Inputs**
- `.tgf/seeds/{seed-id}/GAME_SEED.md`
- `.tgf/seeds/{seed-id}/intake/office-hours.md` (required, schema-valid fenced JSON)
- `.tgf/seeds/{seed-id}/intake/portfolio-digest.json` (required, schema-valid)
- factory doctrine
- `schemas/game-thesis.schema.json`

**Outputs** (emit before summarizing)
- `.tgf/seeds/{seed-id}/GAME_THESIS.md` — markdown carrying a fenced ```json block that validates against `schemas/game-thesis.schema.json` (verify: `validate-artifacts --check thesis --seed-id {seed-id}`)
  and, for new runs, records `schema_version: "2.0.0"` plus a digest-backed
  `portfolio_distinctness` disposition.

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- `to-prd` concepts only — the per-seed output is `GAME_THESIS.md`, not a generic PRD

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- No architecture/engine questions; mark uncertainty as prototype hypotheses.
- A thesis with no real risk is too shallow — recompile.
- `nearest_prior_seed` must name a digest seed (`none` only for an empty digest),
  with one falsifiable mechanical/topological/state-transition difference and
  the digest's exact generation timestamp. Generate this comparison; do not ask.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
