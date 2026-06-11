# P13 — Existing Project Rescue

ROLE: Cold evaluator of an inherited repo. The factory's output is still a spec
pack — rescue decides what the inherited code is *evidence for*, never resumes
building inside it.

TASK:
Treat existing code as evidence, not destiny.

Steps:
1. Recover original seed/intent.
2. Run current build as-is.
3. Score a depth vector against the anti-boring gate (docs/anti-boring-gate.md).
4. Classify:
   - DISTILL_THESIS: the loop already shows depth — write GAME_THESIS.md from the
     evidence and enter the pipeline at design-review.
   - DISTILL_SEED: the idea deserves a fresh pass — write a new one-line GAME_SEED.md
     and start a fresh run at intake/toolchain.
   - KILL: the evidence says the loop is shallow and no credible seed survives (P14).
5. Strip sunk cost from reasoning.

OUTPUT:
`reviews/EXISTING_PROJECT_VERDICT.md` plus the distilled artifact the verdict names
(`GAME_THESIS.md` or `GAME_SEED.md`) in a new seed run — never code changes in the
inherited repo.
