# P01 — Seed Compile

ROLE: Seed compiler.

INPUT: GAME_SEED.md, no architecture assumptions. If a `BRIEF.md` exists in the
run dir it is owner intent evidence — qualities the thesis must serve. It
constrains *what the game must feel like*, never dictates genre, register, or
mechanics; any provenance/comparables it names stay out of every artifact.

TASK:
Emit GAME_THESIS.md carrying a fenced ```json block that validates against
schemas/game-thesis.schema.json (verify: `validate-artifacts --check thesis --seed-id <id>`).

Generate, do not ask:
- thesis
- player fantasy
- design register (`design_register`: mechanics-first | narrative-first | hybrid | world-first)
- golden moment (`golden_moment`: the repeatable 20–40s core experience as
  sensation + decision, no proper nouns — docs/feel-doctrine.md)
- feel targets (`feel_targets`: 3–6 structured objects, each
  `{id, statement, metric, budget (number), unit}` all required — budgets,
  animation commitments, four-beat feedback chains; at least one audio
  commitment; adjectives are wishes, not targets). Worked example:
  ```json
  {
    "id": "rotate-snap",
    "statement": "Asteroid rotation settles with a readable snap within one input frame of release",
    "metric": "input_to_settle_ms",
    "budget": 120,
    "unit": "ms"
  }
  ```
  Schema permits an empty array; ADVANCE does not (checker rule
  `feel-target-required-for-ADVANCE` — ADR 0005). Pre-refresh free-string
  `feel_targets` fail validation; re-run this phase, do not migrate.
- genre priors
- 2–4 core-loop candidates
- replayability hypothesis
- depth mechanisms (if the design has failure, one names the failure-feedback
  loop — what a failing player sees that teaches)
- risk register
- engine/profile candidates
- first playable slice
- bot success criteria
- kill criteria
- content-pack strategy
- design canon (`design_canon`, optional: a clone-able repo URL for an existing
  design system the build must inherit — only when the seed or BRIEF.md names
  one; never a local path)

RULES:
- No architecture questions.
- If uncertain, mark competing hypotheses for prototype.
- Use genre grammar, not copyrighted IP.
- The first slice must be <5 minutes and testable by a bot.
- A thesis with no real risk is too shallow; recompile.
- Declare `design_register` honestly — it routes the gate's mandatory axes and
  falsifier readings (docs/anti-boring-gate.md § Design registers, ADR 0007);
  it is never a depth discount.
- narrative-first: core loops must be playable verb loops (e.g. witness / act /
  choose / bear-consequence), never plot summaries. Depth mechanisms must name
  the consequence-bearing state each choice writes and a later scene reads. The
  replayability hypothesis may be a next-session (continuation) hypothesis
  rather than a re-run hypothesis. Bot success criteria must include a
  random-vs-intentional chooser divergence over story state.
- world-first: the payload is a place. Core loops must be traversal verb loops
  (e.g. set-out / venture / discover / return), never tour itineraries. Depth
  mechanisms must name the world-state each discovery writes (map knowledge,
  capability, access) and where it is read back. The replayability hypothesis
  may be an unexplored-world (continuation) hypothesis. Bot success criteria
  must include random-walker vs curious-walker divergence over the
  discovered-content set. The first slice must contain one real descent-and-
  return, however small.

OUTPUT: GAME_THESIS.md only.
