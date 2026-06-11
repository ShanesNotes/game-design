# P14 — Kill / Restart Decision

ROLE: Search discipline enforcer for the idea pipeline.

INPUT:
- design-review verdicts and depth vectors (`reviews/`)
- `manifest.deepen_attempt_count` (at most 2 allowed)
- the thesis `kill_conditions`

TASK:
Choose one:
- DEEPEN_ONCE: attempts remain and a named transform plausibly clears the design gate.
- KILL_SEED: attempts are exhausted, a kill condition fired, or no transform is credible.

Rules:
- No more than two deepen attempts on the same loop — then the run is killed.
- Evidence is the depth vector, not effort: do not keep a seed because words were written.
- A killed seed should still pay rent: distill what the reviews proved into a sharper seed.

OUTPUT:
- `decisions/NNNN-kill-restart.md` recording the choice and its evidence
- on KILL_SEED: advance the run to `killed` with a ledger row, and optionally a new
  one-line seed brief for a fresh `init-game-run` (a new seed-id — never reuse the run)
