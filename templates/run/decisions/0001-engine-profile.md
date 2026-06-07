# ADR 0001 — Engine / Profile

Status: proposed
Date:

The fenced `json` block below is the canonical, machine-checkable decision. It MUST
validate against `schemas/engine-profile-decision.schema.json` — run
`node scripts/validate-artifacts.mjs --check engine --seed-id <id>`. The prose
sections beneath it are the human view; keep the two in sync.

```json
{
  "seed_id": "TODO",
  "status": "accepted",
  "date": "TODO",
  "decision": "TODO chosen first-slice profile",
  "profile": "TODO",
  "rationale": "TODO two-line rationale",
  "scores": {
    "headless_testability": 2, "iteration_speed": 2, "fantasy_fit": 1, "core_loop_fit": 2,
    "deterministic_sim": 2, "migration_cost": 1, "visual_wow_no_game_risk": 1,
    "editor_opacity_risk": 0, "toolchain_verified": 2
  },
  "rejected": [{ "profile": "TODO", "why": "TODO" }],
  "reversal_triggers": ["bot testing is unreliable", "loop needs capabilities this profile cannot provide"]
}
```

## Decision

TODO

## Context

Seed:
Profile candidates:

## Why this profile for the first slice

TODO

## What was rejected

TODO

## Reversal trigger

Migrate or fresh-prototype if:
- bot testing is unreliable
- loop needs capabilities this profile cannot provide
- toolchain overhead exceeds iteration value
- current architecture blocks depth
