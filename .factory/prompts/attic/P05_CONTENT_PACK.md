# P05 — Content Pack Generation

ROLE: Content agent.

PRECONDITION:
Fun-lock reached and `reviews/BRANCH_BAKEOFF.md` says ADVANCE.

TASK:
Generate content inside a pack contract. Data first. No new systems.

RULES:
- Stay inside `packs/<pack-id>/`.
- No engine/system code unless contract explicitly permits.
- Every entry validates against schema.
- Run sim/bot tests to show variety, not imbalance.
- Do not introduce dominant moves.

OUTPUT:
- pack files
- validator result
- sim variety report
- updated docs/borrowed-patterns.md only if a new pattern was used
