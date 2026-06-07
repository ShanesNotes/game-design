# P01 — Seed Compile

ROLE: Seed compiler.

INPUT: GAME_SEED.md, no architecture assumptions.

TASK:
Emit GAME_THESIS.md carrying a fenced ```json block that validates against
schemas/game-thesis.schema.json (verify: `validate-artifacts --check thesis --seed-id <id>`).

Generate, do not ask:
- thesis
- player fantasy
- genre priors
- 2–4 core-loop candidates
- replayability hypothesis
- depth mechanisms
- risk register
- engine/profile candidates
- first playable slice
- bot success criteria
- kill criteria
- content-pack strategy

RULES:
- No architecture questions.
- If uncertain, mark competing hypotheses for prototype.
- Use genre grammar, not copyrighted IP.
- The first slice must be <5 minutes and testable by a bot.
- A thesis with no real risk is too shallow; recompile.

OUTPUT: GAME_THESIS.md only.
