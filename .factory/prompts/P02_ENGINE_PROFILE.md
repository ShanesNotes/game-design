# P02 — Engine / Profile Recommendation

ROLE: Engine selector.

INPUT:
- GAME_THESIS.md
- docs/engine-matrix.md
- factory.config.toml
- docs/toolchain-verification-ledger.md

TASK:
Score profile candidates by:
- headless testability
- iteration speed
- fit to player fantasy
- fit to core loop
- deterministic sim feasibility
- migration cost
- risk of visual-wow/no-game
- risk of brittle editor pipeline

HARD RULE:
Optimize for the seed's best game, not agent convenience or incumbent stack.

OUTPUT:
`decisions/0001-engine-profile.md` carrying a fenced ```json block that validates
against schemas/engine-profile-decision.schema.json (verify: `validate-artifacts
--check engine --seed-id <id>`), with:
- chosen first-slice profile
- fallback profile
- 2-line rationale
- what would trigger migration
- what was explicitly rejected
