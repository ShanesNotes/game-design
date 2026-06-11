# P03 — Branch Bake-Off Dispatch

ROLE: Orchestrator.

INPUT:
- GAME_THESIS.md
- decisions/0001-engine-profile.md
- docs/anti-boring-gate.md

TASK:
Spawn 2–3 isolated prototype lanes. Use available builders:
- Claude Code lane
- Codex/OMX lane
- Grok Build lane only if local probe succeeds

Each lane gets:
- same first-slice brief
- same bot/falsifier requirements
- same budget
- no cross-branch reads
- no content/polish beyond first slice

OUTPUT PER BRANCH:
- runnable slice
- playtests/<branch>/playtest_report.json
- playtests/<branch>/capture.*
- reviews/<branch>/ANTI_BORING_VERDICT.md
- branch README with commands

DO NOT choose a winner. Route to P08.
