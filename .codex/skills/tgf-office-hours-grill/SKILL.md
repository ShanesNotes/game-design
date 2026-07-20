---
name: tgf-office-hours-grill
description: Use when a seed arrives needing lane-aware intake pressure — co-author live in grill mode or fill silently in yolo mode before toolchain.
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

**Role** — Lane-aware seed-intake grill. Fills the ten office-hours pressure
fields from portfolio and seed evidence, classifies remaining unknowns, and
completes by advancing to **`toolchain`** — never to thesis (illegal vs the
run-state graph: `intake → toolchain` only).

## Open with grill-depth calibration (grill lane only — do this first)

Owner process ask (kingdoms mid-run verdict, near-verbatim):

> "The design seed phase needs to start with a question about the level of
> grilling to tease the game out."

> "The design needs to have a checkpoint of understanding before building
> slices."

> "What I really wanted was Warcraft 3 but with early Christian creation lore
> referencing the Cave of Treasures... Not weird mechanics and a game that
> doesn't seem interesting to play."

**Before** portfolio digest pressure-fields or any deep co-authoring: ask the
owner **exactly one** calibration question (recommended default in parentheses):

> How deep should this grill go, and how much creative latitude vs fidelity to
> any named reference in the seed?
> *(Recommended default: medium grill — pressure the loop and feel; stay
> faithful to named-reference mechanics the owner is pointing at; invent only
> where the seed is silent. Defer the post-design-lock understanding checkpoint
> to P17.5.)*

Record the answer in `intake/office-hours.md` prose (and the JSON block when a
field fits). This calibration is live office-hours dialogue — budget-exempt
like the rest of the grill session. Do **not** skip it in `grill` lane.

**Yolo:** do not ask. Infer depth and fidelity stance from the seed and BRIEF
(if any); state the inferred stance in one short prose line at the top of
`intake/office-hours.md`, then fill all ten fields silently as today.

**Lane behavior** (read `manifest.design_lane`; absence keeps the legacy
at-most-one-question procedure):
- `grill` — a collaborative co-authoring session and the default for new runs.
  **Open with the calibration question above**, then detect gaps, propose
  concrete fills, and extrapolate game-quality principles with the owner.
  Live-session conversation is exempt from the manifest's `questions_asked`
  budget; do not log it there. The ≤1 recorded budget remains for later AFK
  phases.
- `yolo` — ask zero questions. Silently fill all ten fields from the seed,
  digest, and other run evidence. Convert every material unknown into a named,
  falsifiable prototype hypothesis. Yolo changes owner attention only: do not
  abbreviate fields, soften gates, lower depth, or skip verification.

**Evidence first**
1. Run `npm run portfolio:digest -- --seed-id <id>` so
   `.tgf/seeds/{id}/intake/portfolio-digest.json` exists.
2. Read that digest before filling pressure fields. **Status quo** and
   **Reviewer concern** (derivative risk) **must cite digest rows** (prior
   seed ids, pitches, lifecycle) — not free-floating genre guesses.
3. **Reference vocabulary (audited only)** — after the digest exists, read
   `docs/reference-games/index.jsonl`. Cite only rows with `status` exactly
   `audited`. When Status-quo or Reviewer-concern names a near prior fantasy,
   append a nearest-canon clause using index `id`s only, form:
   `nearest canon: <id>[, <id>…]`. If zero audited rows exist (or none are near),
   write `nearest canon: SKIPPED (reference canon empty)`. Never invent an id;
   never require the user to know a reference — references orient agent
   questions only (docs/reference-games/README.md phase-tier: intake = vocabulary).

**Inputs**
- `GAME_SEED.md` or the raw seed
- `intake/portfolio-digest.json` (required; produced by the digest step)
- `docs/reference-games/index.jsonl` (vocabulary; audited rows only)
- TGF doctrine and any existing run evidence
- optional owner `BRIEF.md` in the run dir (intent only; not a second grill channel)

**Outputs** (emit before summarizing)
- `.tgf/seeds/{seed-id}/intake/office-hours.md` — human prose for the 10
  pressure fields **plus** exactly one fenced ```json block that validates
  against `schemas/intake-grill.schema.json` (Slice A owns the schema; the
  block is the machine surface the checker gates)
- for legacy lane-less intake only, a question-log entry appended to the
  manifest when its one allowed question was asked
  (schema-legal fields only: question, recommended_default, answer, phase_asked,
  actor — fold any rejected options into answer / recommended_default prose)
- advance `manifest.current_phase` from `intake` to **`toolchain`** when the
  seed direction is stable; else a `resume_point` blocker. Never set phase to
  `thesis` from this skill.

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- `grill-me` — in collaborative grill sessions, ask only what evidence cannot
  answer and propose a recommended fill; legacy lane-less intake retains its
  one-question ceiling
- `grill-with-docs` — ground terms against TGF docs/ADRs, scoped to writes inside this repo only

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Never ask engine/architecture/art/content/lane questions before
  `GAME_THESIS.md`. Yolo asks no questions. Grill's live office-hours dialogue
  is budget-exempt; outside that session, the manifest permits at most one
  recorded direction-changing taste question before decomposition.
- Owns the ambiguity gate; convert most uncertainty into prototype hypotheses rather than questions.
- External-system and borrowed-skill names stay factory-side and must never leak into a generated game or pack.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
- Do not compile `GAME_THESIS.md` here — that is `tgf-seed-compile` / P01 after toolchain.

## Ten office-hours pressure fields (each a TGF game-loop question)
1. **Demand reality** — why would a player voluntarily retry this loop?
2. **Status quo** — what existing game fantasy (including prior studio seeds in the digest) already satisfies this? Append `nearest canon: …` from audited index ids (or SKIPPED) per Evidence first §3.
3. **Desperate specificity** — what narrow player fantasy creates a wedge?
4. **Narrow playable wedge** — what loop can a bot play for 60s?
5. **Observation evidence** — what telemetry would prove skill, pressure, variation, or boredom?
6. **Premise challenge** — what assumption might be false (convert to a prototype hypothesis)?
7. **Alternatives** — what adjacent loop might be better?
8. **Future-fit** — what expansion is allowed only after the co-dev repo reaches fun-lock?
9. **Store/positioning** — what phrase makes the game legible later (defer, do not chase polish)?
10. **Reviewer concern** — what would make a playtester call this boring or derivative? (cite digest rows when portfolio overlap is the risk; append `nearest canon: …` or SKIPPED per Evidence first §3)
