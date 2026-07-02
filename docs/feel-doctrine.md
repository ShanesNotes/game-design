# Feel Doctrine

The anti-boring gate proves a design is *deep*. This doctrine exists because deep
is not enough: a thesis can pass every falsifier and still play like a spreadsheet.
Feel — the moment-to-moment sensation of executing the core verbs — is a design
input, not a polish pass, and the factory treats it as first-class from P01 on.

Feel is specified on paper as **falsifiable commitments**, argued at P07, sliced
at P18, and *proven only in the co-dev repo* (the factory builds no game — ADR
0006). What ships in the spec pack is the contract the build must honor.

## The golden moment

Every thesis names its **golden moment**: the repeatable 20–40 second experience
at the center of the chosen loop, stated as *sensation plus decision* — what the
player's hands and eyes are doing, and what they are weighing while doing it.
Not plot ("David confronts the giant"), not features ("combat with relics"):
sensation plus decision ("wind up a sling shot while judging when the charging
giant's shield drops — release timing converts fear into a single readable hit").

If the golden moment cannot be stated without proper nouns, the loop does not
have one yet. The tracer slice exists to make the golden moment playable first.

## Feel targets

The thesis carries 3–6 **feel targets**: commitments about how the core verbs
feel, each one falsifiable by playing or instrumenting the build. The test is
the **Adjective Test**: a feel target that is an adjective ("responsive",
"weighty", "juicy") is a wish, not a target. Falsifiable forms:

- **Budgets** — "input to first visible response under 100ms for every verb";
  "frame time never exceeds budget during the golden moment".
- **Commitments** — "attack animations commit: no cancel after active frames";
  "dodge has fixed cost and fixed invulnerability window, both readable".
- **Feedback chains** — every core verb has all four beats: **anticipation →
  action → impact → aftermath** (wind-up read, motion, hit-confirmation, state
  change the player can see). A verb missing a beat is an incomplete verb.
- **Audio commitments** — at least one target is audio: audio is half of feel.
  "Every impact has a distinct sound before any art exists"; "the golden
  moment is identifiable with the screen off".

## The blamable death

Failure must teach. Every thesis that has failure names its **failure-feedback
loop**: what the player sees at the moment of failure that tells them what they
could have done differently. The paper falsifier is the **Blamable-Death Test**:
find the death the player will blame on the game — unreadable danger, off-screen
cause, input eaten by an animation the design never disclosed. Every such death
is a finding. Punishment may be heavy (heaviness is honesty when danger is
legible); it may never be arbitrary.

## Where feel lives in the pipeline

- **P01** — thesis carries `golden_moment` and `feel_targets` (and names the
  failure-feedback loop among its depth mechanisms when failure exists).
- **P07** — attacks them: adjectives, missing feedback beats, unblamable deaths,
  and golden moments that are plot summaries are findings. Feel claims are
  claims; the red-team does not award depth points for them.
- **P18** — the tracer slice's acceptance includes the golden moment's full
  feedback chain, and each feel target lands in some slice as acceptance or
  evidence. A slice that adds a verb without its feedback chain is incomplete.
- **The pack** — PLAYTEST_PLAN.md carries a human feel session alongside the bot
  sessions; feel targets are verified there and regressions are findings.

## What this doctrine refuses

- Feel as a polish backlog item ("juice pass, order 9").
- Screen-shake-as-feel: feedback beats are information first, spectacle second.
- Targets that only a feelings-report can check. If neither play nor
  instrumentation can falsify it, rewrite it until one can.
