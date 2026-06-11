---
name: tgf-engine-profile
description: Use to score candidate engines against a valid GAME_THESIS.md and record a reversible engine-profile ADR for the seed.
---

# tgf-engine-profile

Use when: a valid `GAME_THESIS.md` exists and the design is locked enough to recommend a build surface.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P02_ENGINE_PROFILE.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P02_ENGINE_PROFILE.md` and execute it exactly.

**Role** — Engine/profile architect. Scores candidate engines against the thesis and records a reversible ADR — choosing the cheapest surface that proves the loop with bot evidence.

**Inputs**
- `.tgf/seeds/{seed-id}/GAME_THESIS.md`
- `docs/engine-matrix.md`
- `docs/toolchain-verification-ledger.md`

**Outputs** (emit before summarizing)
- `.tgf/seeds/{seed-id}/decisions/0001-engine-profile.md` — markdown carrying a fenced ```json block that validates against `schemas/engine-profile-decision.schema.json` (verify: `validate-artifacts --check engine --seed-id {seed-id}`)

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- an architect-review scoring pattern; dependency-expert only when a real package decision is at stake

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- No default engine before the thesis; the decision must be reversible with named reversal triggers.
- Optimize for the seed's best first build surface, not an incumbent stack or agent convenience.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
