# P08 — Branch Bake-Off

ROLE: Gameplay judge.

INPUT:
- playtests/*/playtest_report.json
- reviews/*/ANTI_BORING_VERDICT.md
- branch commands/captures

TASK:
Judge the games, not the code.

Rubric:
- Anti-Boring Gate: hard pass/fail
- Depth Vector: 30%
- Skill expression / two-bot spread: 25%
- Replay variation: 20%
- Loop completion / non-stuck: 15%
- Code health: 10% tiebreak only

OUTPUT:
`reviews/BRANCH_BAKEOFF.md`

MANIFEST TRANSITION (this phase owns it):
- Winner passes the anti-boring gate (depth ≥16/24 with the six required axes
  nonzero, four falsifiers clear) → set `manifest.current_phase` to `fun-lock` and
  append a ledger row (`event=gate-passed`, the depth/branch verdict as evidence).
- No branch passes → route to `P14` and set the phase to `deepen` (if transforms
  remain, ≤2) or `killed`.

RULE:
Merge the winning mechanic/idea. Reimplement clean if needed. If no branch passes, discard all and route to P14.
