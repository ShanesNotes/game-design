# Anti-Boring Gate

The gate runs **on paper, against `GAME_THESIS.md`**, at the `design-review` phase
(P07). A thesis cannot be design-locked — and nothing may be decomposed into a
spec — until it passes this gate. The passing (`ADVANCE`) verdict is
**design-lock**; fun-lock remains downstream doctrine inside the spec pack.

## Four hard falsifiers

1. **Naked Mechanics Test** *(argued analytically)*
   Strip theme, art, narrative. Is the bare system still interesting?

2. **Dominant-Move Test** *(argued analytically)*
   If one action or fixed sequence is optimal across states, fail. Default threshold: one action >70% of meaningful actions across varied states.

3. **Second-Session Test** *(argued analytically)*
   Why play again after understanding the loop once? “More levels” and “better art” do not count.

4. **Two-Bot Test** *(deferred into the spec)*
   A random bot and a heuristic/skilled bot must produce materially different outcomes. This cannot be run on paper, so it ships as `bot_success_criteria` obligations carried by the spec's slices; the co-dev repo must prove it.

## Depth vector

Score each axis 0/1/2:

- meaningful choice
- tradeoff
- pressure
- uncertainty
- progression
- mastery
- combinatorial interaction
- emergence
- replayable variation
- failure/recovery
- player expression
- expansion headroom

Minimum for design-lock: 16/24 with nonzero score in Choice, Tradeoff, Pressure, Uncertainty, Mastery, and Replayable Variation.

## Shallow-loop transform kit

If the loop resembles sorting/matching/collection, apply at most two transforms, then re-test:

- conflicting criteria
- resource scarcity
- time/space pressure
- irreversible commitment
- risk/reward uncertainty
- hidden information
- changing rule modifiers
- enemy/opposing system
- player-build expression
- recovery paths

A `DEEPEN` verdict re-enters the `thesis` phase with exactly one transform.
After two failed deepen attempts: throw away the loop and distill learnings into a new seed brief.
