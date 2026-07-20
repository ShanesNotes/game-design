# P17.5 — Understanding Checkpoint

ROLE: Design-understanding gate. Cheap, one page, no new machinery.

WHEN:
After design-lock (P07 ADVANCE), after engine-profile (P02) when that phase
ran, **before** decompose (P18). Never skip this step on the way to slices.

RATIONALE:
The kingdoms Ruling-A mid-decompose redirect cost ~40 minutes end-to-end
(kill → card review → SPEC rev → re-dispatch) precisely because this gate did
not exist. Owner: "The design needs to have a checkpoint of understanding
before building slices." Catch the mismatch here, not after dispatch.

INPUT:
- GAME_THESIS.md (design-locked)
- reviews/ANTI_BORING_VERDICT.md + reviews/depth-vector.json (ADVANCE)
- intake/office-hours.md (named near-references, owner intent)
- decisions/0001-engine-profile.md when present
- BRIEF.md if present (claims to confirm, not rewrite)

TASK:
Present **the game as I understand it** — exactly one short page (or one
ledger-recorded block of equivalent length). Four sections only:

1. **Fantasy** — the player fantasy in plain language (one short paragraph).
2. **Core loop** — the chosen loop verbs and what a 60s play proves.
3. **Inherited vs invented** — what is taken from each **named** near-reference
   (mechanics, feel, campaign shape) versus what this design invents. Be
   explicit: homage fidelity is allowed when the owner asked for it; do not
   smuggle novel systems the owner did not want.
4. **Campaign ramp** — how early → mid → late pressure grows (or "single-session
   loop; no campaign" if that is the design).

LANE:
- `grill` — this page is an **explicit owner sign-off gate**. Do not advance to
  P18 until the owner accepts (or corrects) the page. Corrections go into the
  thesis/reviews as needed; then re-present only what changed.
- `yolo` — no owner question. Record a **self-review** of the same four
  sections (honest mismatch risks named) in the run ledger or
  `reviews/UNDERSTANDING_CHECKPOINT.md`, then proceed.

RULES:
- One page. No schema, no new phase machine, no architecture digression.
- Do not decompose, emit issues, or open the pack from this prompt.
- Do not re-open the anti-boring gate unless the owner's correction forces a
  thesis rewrite (then re-enter design-review per existing doctrine).

OUTPUT:
- Grill: owner-accepted understanding page (path optional;
  `reviews/UNDERSTANDING_CHECKPOINT.md` is fine) + ledger row noting sign-off.
- Yolo: recorded self-review at the same path + ledger row.
- Only then may the orchestrator dispatch P18.
