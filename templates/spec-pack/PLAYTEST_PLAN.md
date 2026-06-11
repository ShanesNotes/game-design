# PLAYTEST_PLAN.md

## Bot sessions

- random bot: 60s minimum
- heuristic/skilled bot: 60s minimum
- long session: 300s after initial stability

## Required reports

Each run emits `playtests/<branch>/playtest_report.json`.

## Falsifiers

- Naked Mechanics Test
- Two-Bot Test
- Dominant-Move Test
- Second-Session Test

## Metrics

- crashes
- stuck states
- terminal loop completion
- action distribution
- score/win/spread between bots
- unique states reached
- replay variation
- frame time/perf budget
