# Doctrine

The non-negotiable rules of the Tiny Game Factory. Prompts and skills cite this
file. Changing a rule here requires an ADR.

## Five principles

1. **Search over codegen.** The job is to find a loop worth building, not to produce code.
2. **Fun over polish.** A shallow premise, however precisely specified, is still a failure.
3. **Evidence over sunk cost.** Paper falsifiers and the depth vector decide, not effort already spent.
4. **Code-native over opaque.** Diffable, reviewable artifacts beat opaque assets and editor state.
5. **Played by a bot or human over merely compiled.** In the factory this is a *carried obligation*: every spec ships `bot_success_criteria` per slice, the PLAYTEST_PLAN falsifiers, and the guards that enforce them — the co-dev repo must prove play, not assert it.

## Non-negotiables

- No game code in the factory — ever (`no_game_code_in_factory`, `scope_brake`).
- No decomposition before `GAME_THESIS.md` exists
  (`no_decomposition_before_game_thesis`).
- No slicing before design-lock (`no_slicing_before_design_lock`): a gate-passing
  depth vector must exist in `reviews/` before engine-profile/decompose/handoff.
- No architecture or engine questions to the user before the thesis; at most
  one direction-changing taste question (with a recommended default) before the
  spec is decomposed (`human_questions_max_before_decompose = 1`).
- Existing projects are evidence, not destiny. The current engine is an option, not
  a constraint.
- Engine migration requires a new per-seed engine decision file
  (`decisions/NNNN-engine-*.md`), enforced by the `engine_migration_requires_adr`
  hook. This is a seed-scoped, ADR-style record — distinct from the factory-level
  ADRs in `docs/adr/`.
- The spec pack is the terminal artifact (`spec_pack_is_terminal_artifact`,
  ADR 0006): produced only by `scripts/package-spec.mjs`, gated by run validation
  and the leakage scan.
- Completion is verifier evidence, not agent prose.
- Factory state (`.tgf/`, ledgers, hooks, skill docs, factory vocabulary) must never
  leak into an exported spec pack.

## Phase model

```
intake → toolchain → thesis → design-review → engine-profile → decompose → handoff → complete
  design-review --DEEPEN--> deepen --(one transform)--> thesis   (re-review on paper)
  deepen failed ×2 --> killed
terminal: blocked · failed · killed · complete
```

A run is initialized at `toolchain`; `intake` is the entry phase only when a raw/
vague seed or an inherited repo needs office-hours grilling before the thesis. Each
phase is gated by an artifact, not a claim. On a `DEEPEN` verdict the thesis
re-enters `thesis` with **exactly one** transform applied, then re-reviews at
`design-review`; after two failed deepen attempts, kill the run and distill
learnings into a new seed brief. An `ADVANCE` at `design-review` is **design-lock**
and opens `engine-profile → decompose`. Terminal states require an evidence-backed
ledger row before any resume.

## The anti-boring gate (`docs/anti-boring-gate.md`)

Runs **on paper, against the thesis**, at `design-review`. Three falsifiers are
argued analytically — Naked Mechanics, Dominant-Move (>70% action share),
Second-Session — and the Two-Bot test, which cannot run on paper, is deferred into
the spec as `bot_success_criteria` obligations carried by the slices. Plus a
12-axis depth vector. **Design-lock requires total ≥ 16/24 with nonzero Choice,
Tradeoff, Pressure, Uncertainty, Mastery, and Replayable Variation.** Verdicts:
`ADVANCE` | `DEEPEN` (one transform) | `KILL`. Fun-lock remains downstream
doctrine inside the spec pack.

## Engine doctrine (`docs/engine-matrix.md`)

No default engine before the thesis. Score candidates on headless testability,
iteration speed, fantasy fit, core-loop fit, deterministic sim, migration cost,
visual-wow-no-game risk, editor opacity, and toolchain-verified status. Choose the
cheapest reversible surface for the spec to target; the decision and its reversal
triggers ship inside the pack.

## Tool doctrine (`docs/toolchain-verification-ledger.md`)

A capability is never assumed from memory. Tools are `ACCEPT` / `PROBE` /
`OFF_BY_DEFAULT` / `ACCEPT_AFTER_PIN`, promoted only by a local probe or
current-doc harvest. Grok Build and mutation-capable MCP servers stay optional.

## Asset doctrine (shipped-pack doctrine)

This rule applies downstream, in the co-dev repo; the pack carries the guards that
enforce it. Programmer/code-native art only before fun-lock. Opaque or
high-fidelity assets require fun-lock + art-direction lock + a provenance recipe
(`schemas/asset-provenance`) + asset review.

## Human taste gates

- **G1** — pre-decompose design taste: is the design-locked thesis worth
  decomposing and building? (the only gate that lives in the factory)
- **G2** — art direction: moves downstream into the spec pack (after fun-lock).
- **G3** — release-candidate signoff: moves downstream into the spec pack.

Everything else the agent decides from evidence; it does not ask.
