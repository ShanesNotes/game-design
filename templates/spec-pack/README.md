# {{SEED_ID}} — game spec pack

This folder is a **spec pack**: a game idea that has already been fertilized,
depth-gated, and decomposed into an ordered backlog of buildable slices. It holds
no code yet — it holds the argument for a game and the plan to prove it.

Seed: {{SEED}}

## What is in here

- `SPEC.md` — the decomposition: ordered slices with falsifiable acceptance.
- `GAME_THESIS.md` — the fertilized idea: loop, fantasy, depth mechanisms, kill conditions.
- `GAME_SEED.md` — the original one-line premise.
- `decisions/0001-engine-profile.md` — the recommended engine profile and its reversal triggers.
- `issues/` — one issue per slice. Build them in `order`, starting with the tracer bullet.
- `PLAYTEST_PLAN.md` — the falsifiers every gameplay slice must survive.
- `guards/` — optional dependency-free checks (run `node guards/<name>.mjs`) that block
  scope drift: content before fun-lock, opaque assets without provenance, missing
  playtest evidence, and more.
- `schemas/` — JSON Schemas for the evidence files the slices must produce.

## Boot sequence

1. Read `AGENTS.md` — the operating procedure for co-development.
2. Read `SPEC.md`, then `GAME_THESIS.md` — the what and the why.
3. Open `issues/` and take the order-1 tracer-bullet issue.
4. Build the thinnest version that satisfies its acceptance, produce its evidence,
   then move to the next issue.

## Doctrine

search > codegen, fun > polish, evidence > sunk cost. A slice is done when its
acceptance criteria hold and its evidence exists — not when someone says it is done.
