---
name: tgf-office-hours-grill
description: Use when a seed arrives needing intake pressure — fill office-hours fields from evidence and ask at most one taste question before the thesis.
---

# tgf-office-hours-grill

Use when: a seed has just arrived and needs intake pressure — the user says "gstack office hours", "grill me", or hands over a vague seed.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P01_SEED_COMPILE.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P01_SEED_COMPILE.md` and execute it exactly.

**Role** — Seed-intake grill. Fills the GStack office-hours pressure fields silently from evidence, classifies remaining unknowns, and asks at most ONE direction-changing taste question (with a recommended default) before the thesis.

**Inputs**
- `GAME_SEED.md` or the raw seed
- TGF doctrine and any existing run evidence
- the GStack office-hours pressure vocabulary (docs-only)

**Outputs** (emit before summarizing)
- `.tgf/seeds/{seed-id}/intake/office-hours.md` (all 10 pressure fields filled in game-loop language)
- a question-log entry appended to the manifest (question, recommended default, answer, artifact field decided, rejected options)
- manifest `current_phase` set to `thesis` when the seed direction is stable, else a `resume_point` blocker

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- `grill-me` — one question at a time, always with a recommended default; ask only what evidence cannot answer
- `grill-with-docs` — ground terms against TGF docs/ADRs, scoped to writes inside this repo only

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Ask AT MOST one direction-changing question before the thesis; never ask engine/architecture/art/content/lane questions before `GAME_THESIS.md`.
- Owns the ambiguity gate; convert most uncertainty into prototype hypotheses rather than questions.
- GStack/Pocock names stay factory-side and must never leak into a generated game.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.

## Ten office-hours pressure fields (each a TGF game-loop question)
1. **Demand reality** — why would a player voluntarily retry this loop?
2. **Status quo** — what existing game fantasy already satisfies this?
3. **Desperate specificity** — what narrow player fantasy creates a wedge?
4. **Narrow playable wedge** — what loop can a bot play for 60s?
5. **Observation evidence** — what telemetry would prove skill, pressure, variation, or boredom?
6. **Premise challenge** — what assumption might be false (convert to a prototype hypothesis)?
7. **Alternatives** — what adjacent loop might be better?
8. **Future-fit** — what expansion is allowed only after the co-dev repo reaches fun-lock?
9. **Store/positioning** — what phrase makes the game legible later (defer, do not chase polish)?
10. **Reviewer concern** — what would make a playtester call this boring or derivative?
