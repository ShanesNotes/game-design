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

Narrative-first packs (see `guards/guard-config.json`) read these as: Naked
Structure (the choice-consequence graph carries the interest), random-vs-
intentional chooser divergence over story state, Dominant-Choice (no stance
wins everywhere without cost), and Next-Session (continuation pull via
accumulated state counts; more-of-the-same scenes do not).

World-first packs read these as: Naked Map (the spatial graph — gates, keys,
loops, shortcuts, landmark relations — carries the interest), random-walker vs
curious-walker divergence over the discovered-content set, Beeline (ignoring
the world must have differentiated cost), and Return (new capability must
re-key known ground; backtracking-to-flip-a-switch does not count).

## Feel session (human — bots cannot feel)

Run alongside bot sessions once the tracer slice plays. One player, one silent
observer; the observer speaks only to end the session.

1. **First-contact** — hand over the build with no explanation. Log: time to
   first intentional use of each core verb; where the player looked when
   confused; the first moment they smiled or leaned in (or didn't).
2. **Feel-target verification** — check every `feel_targets` entry from
   GAME_THESIS.md against the build, by play or instrumentation. Each miss is
   a finding with the same standing as a crash.
3. **Feedback-chain audit** — for each core verb: are all four beats present
   and readable (anticipation / action / impact / aftermath)? Audio beats
   count; test once with the screen ignored.
4. **Blamable-death log** — for every failure: ask the player (not the dev)
   what killed them and what they'd do differently. "I don't know" or "the
   game" is a finding; a specific, correct answer is a pass.
5. **Golden-moment probe** — after the session, ask the player to describe the
   best 30 seconds. If their description doesn't resemble the thesis
   `golden_moment`, either the build hasn't reached it or the thesis was wrong
   about where the joy is — both are findings worth a run of their own.

## Metrics

- crashes
- stuck states
- terminal loop completion
- action distribution
- score/win/spread between bots
- unique states reached
- replay variation
- frame time/perf budget
- input-to-response latency per verb (feel budget)
- death attribution rate (share of failures the player explains correctly)
