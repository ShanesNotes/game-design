# ADR 0003 — Factory / game separation

- Status: **Accepted** (grill decisions Q2, Q3). Current reading after ADR 0006:
  the third stratum is the exported **spec pack** / downstream co-dev repo, not a
  factory-built child game.
- Date: 2026-06-06

## Context

Reusable factory state (prompts, ledgers, hooks, skill docs, factory vocabulary)
must not contaminate a shipped game, and a disposable game prototype must not be
able to corrupt the factory. The two have opposite lifecycles.

## Decision

Three strata with hard boundaries:

- **Factory repo** — `/home/ark/tiny-game-factory/` (durable).
- **Per-seed run state** — `.tgf/seeds/{seed-id}/` inside the factory (durable
  temporal truth: manifest, ledger, thesis, decisions, SPEC, issues, reviews,
  handoffs).
- **Spec pack / downstream co-dev repo** — `/home/ark/tgf-games/{seed-id}/` by
  default (durable deliverable). ADR 0006 moved all game building, playtesting,
  and fun-lock proof downstream into this exported pack.

The spec-pack root is a **declared default, not a created path**: nothing creates
`/home/ark/tgf-games/` until the handoff phase exports a pack through
`scripts/package-spec.mjs --write`. `scripts/init-game-run.mjs` creates only
`.tgf/seeds/{seed-id}/`.

**No leakage (exported spec-pack surface):** generated spec-pack templates and
example seeds must contain no `.tgf/`/`.omx/`/`.sandcastle/` paths,
GStack/Pocock/OMX/Sandcastle markers, source-product terms, or absolute
`/home/ark/...` paths; ledgers, handoffs, and skill docs are likewise prohibited by
doctrine. The `generated-leakage` validator enforces the path/marker tokens against
`templates/spec-pack/**` and `examples/seeds/**`. (Pocock here = the borrowed-skill
attribution, which must not appear in exported co-dev docs.)

## Consequences

- The run initializer is non-destructive and spec-pack-free; pack export is a
  separate, gated handoff phase.
- The only absolute `/home/ark/...` default allowed in a run manifest is
  `default_spec_pack_root`, and it must equal `/home/ark/tgf-games/{seed-id}`.
  After export, the concrete destination is recorded as `spec_pack_path`.
- The two absolute-path rules apply to **different surfaces**: the
  `default_spec_pack_root` allowance is run-manifest metadata only and must never be
  normalized into a generated template, where every `/home/ark/...` path is forbidden.

## Alternatives considered

- *Everything under the factory by default.* Rejected as default: bundling makes
  downstream build churn destabilize the factory and risks leakage. The external
  default is a sibling `/home/ark/tgf-games/` — outside the factory's git — so
  killed or iterated games leave no trace in the factory history.
