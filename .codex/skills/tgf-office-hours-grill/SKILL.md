---
name: tgf-office-hours-grill
description: Use when a seed arrives needing intake pressure — fill office-hours fields from portfolio evidence and ask at most one taste question before toolchain.
---

# tgf-office-hours-grill

Use when: a seed has just arrived and needs intake pressure — the user says
"grill me", "office hours", or hands over a new seed (intake is the default
entry for every new run; see ADR 0011).

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`,
`.factory/prompts/P00_ORCHESTRATOR_ULTRAGOAL.md` (intake is phase 1 of the
P00 router), and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when
present. Intake has no separate P## body — this skill **is** the intake
procedure the router dispatches.

**Role** — Seed-intake grill. Fills the ten office-hours pressure fields from
portfolio and seed evidence, classifies remaining unknowns, and asks at most
ONE direction-changing taste question (with a recommended default). Completes
by advancing to **`toolchain`** — never to thesis (illegal vs the run-state
graph: `intake → toolchain` only).

**Evidence first**
1. Run `npm run portfolio:digest -- --seed-id <id>` so
   `.tgf/seeds/{id}/intake/portfolio-digest.json` exists.
2. Read that digest before filling pressure fields. **Status quo** and
   **Reviewer concern** (derivative risk) **must cite digest rows** (prior
   seed ids, pitches, lifecycle) — not free-floating genre guesses.

**Inputs**
- `GAME_SEED.md` or the raw seed
- `intake/portfolio-digest.json` (required; produced by the digest step)
- TGF doctrine and any existing run evidence
- optional owner `BRIEF.md` in the run dir (intent only; not a second grill channel)

**Outputs** (emit before summarizing)
- `.tgf/seeds/{seed-id}/intake/office-hours.md` — human prose for the 10
  pressure fields **plus** exactly one fenced ```json block that validates
  against `schemas/intake-grill.schema.json` (Slice A owns the schema; the
  block is the machine surface the checker gates)
- a question-log entry appended to the manifest when a question was asked
  (question, recommended default, answer, artifact field decided, rejected options)
- advance `manifest.current_phase` from `intake` to **`toolchain`** when the
  seed direction is stable; else a `resume_point` blocker. Never set phase to
  `thesis` from this skill.

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- `grill-me` — one question at a time, always with a recommended default; ask only what evidence cannot answer
- `grill-with-docs` — ground terms against TGF docs/ADRs, scoped to writes inside this repo only

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Ask AT MOST one direction-changing question before the thesis; never ask engine/architecture/art/content/lane questions before `GAME_THESIS.md`.
- Owns the ambiguity gate; convert most uncertainty into prototype hypotheses rather than questions.
- External-system and borrowed-skill names stay factory-side and must never leak into a generated game or pack.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
- Do not compile `GAME_THESIS.md` here — that is `tgf-seed-compile` / P01 after toolchain.

## Ten office-hours pressure fields (each a TGF game-loop question)
1. **Demand reality** — why would a player voluntarily retry this loop?
2. **Status quo** — what existing game fantasy (including prior studio seeds in the digest) already satisfies this?
3. **Desperate specificity** — what narrow player fantasy creates a wedge?
4. **Narrow playable wedge** — what loop can a bot play for 60s?
5. **Observation evidence** — what telemetry would prove skill, pressure, variation, or boredom?
6. **Premise challenge** — what assumption might be false (convert to a prototype hypothesis)?
7. **Alternatives** — what adjacent loop might be better?
8. **Future-fit** — what expansion is allowed only after the co-dev repo reaches fun-lock?
9. **Store/positioning** — what phrase makes the game legible later (defer, do not chase polish)?
10. **Reviewer concern** — what would make a playtester call this boring or derivative? (cite digest rows when portfolio overlap is the risk)
