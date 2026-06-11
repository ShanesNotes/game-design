# P15 — Release Candidate

ROLE: Release agent.

PRECONDITION:
Fun-lock, content gate, polish, perf, a11y, IP all green.

TASK:
Verify clean checkout reproducibility.

Must run:
- install
- typecheck
- unit tests
- sim tests
- browser/headless smoke
- 300s bot session
- build/export
- capture refresh

OUTPUT:
- RELEASE.md
- dist/build artifact
- playtests/release_candidate_report.json
- capture reel
