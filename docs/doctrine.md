# Doctrine

The non-negotiable rules of **game-design** — the design/spec discipline of
game-studio (DESIGN-RECORD §2–§3). Spec-only: this repo produces depth-gated
theses and issue-sliced **spec packs**; it builds no game. Downstream, forge
consumes a machine-readable forge manifest (when the engine is Godot-gated) and
co-dev / game repos implement. Prompts and skills cite this file. Changing a
rule here requires an ADR. Provenance of every doctrine surface lives in
`docs/doctrine-audit-ledger.md` (DESIGN-RECORD §8 quarantine).

## Five principles

1. **Search over codegen.** The job is to find a loop worth building, not to produce code.
2. **Fun over polish.** A shallow premise, however precisely specified, is still a failure.
3. **Evidence over sunk cost.** Paper falsifiers and the depth vector decide, not effort already spent.
4. **Code-native over opaque.** Diffable, reviewable artifacts beat opaque assets and editor state.
5. **Played by a bot or human over merely compiled.** In design this is a *carried obligation*: every spec ships `bot_success_criteria` per slice, the PLAYTEST_PLAN falsifiers, and the guards that enforce them — the co-dev / forge path must prove play, not assert it.

## Non-negotiables

- No game code in this repo — ever (`no_game_code_in_factory`, `scope_brake`;
  DESIGN-RECORD §3: design produces packs, forge builds).
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
  hook. This is a seed-scoped, ADR-style record — distinct from the design-repo
  ADRs in `docs/adr/`.
- The spec pack is the terminal design artifact (`spec_pack_is_terminal_artifact`,
  ADR 0006): produced only by `scripts/package-spec.mjs`, gated by run validation
  and the leakage scan. Godot-4 packs also emit `forge-manifest.json` (SPEC §3.4);
  non-godot packs print `FORGE-GATE:ENGINE <profile>` and skip the manifest.
- Completion is verifier evidence, not agent prose.
- Design harness state (`.tgf/`, ledgers, hooks, skill docs, internal vocabulary)
  must never leak into an exported spec pack.
- **Portfolio at the front door** (ADR 0011): every new run enters at `intake`
  (schema-gated office-hours grill grounded in the portfolio digest); every
  thesis carries checker-enforced portfolio distinctness; depth vectors carry
  per-axis evidence paths and review provenance. Reviewer independence at P07
  is process doctrine — the repo records provenance; it cannot enforce
  independence.

## Phase model

```
intake → toolchain → thesis → design-review → engine-profile → decompose → handoff → complete
  design-review --DEEPEN--> deepen --(one transform)--> thesis   (re-review on paper)
  deepen failed ×2 --> killed
terminal: blocked · failed · killed · complete
```

A run is **initialized at `intake`** — the default entry for every new seed.
The office-hours grill is grounded in the portfolio digest and advances only to
`toolchain` (never to thesis). Each phase is gated by an artifact, not a claim.
On a `DEEPEN` verdict the thesis re-enters `thesis` with **exactly one**
transform applied, then re-reviews at `design-review`; after two failed deepen
attempts, kill the run and distill learnings into a new seed brief. An
`ADVANCE` at `design-review` is **design-lock** and opens
`engine-profile → decompose`. Terminal states require an evidence-backed ledger
row before any resume. **Post-complete pack revision** is a separate side-path
(`spec:revise` → forge `intake --revise`), not a phase edge on this graph —
`complete` remains absorbing for plain packs; revision does not reopen the
paper spine.


## The anti-boring gate (`docs/anti-boring-gate.md`)

Runs **on paper, against the thesis**, at `design-review`. Three falsifiers are
argued analytically — Naked Mechanics, Dominant-Move (>70% action share),
Second-Session — and the Two-Bot test, which cannot run on paper, is deferred into
the spec as `bot_success_criteria` obligations carried by the slices. Plus a
12-axis depth vector. **Design-lock requires total ≥ 16/24 with the register's
six mandatory axes nonzero** (ADR 0007/0008): the thesis's `design_register`
routes the mandatory set and the falsifier readings — mechanics-first/hybrid
require Choice, Tradeoff, Pressure, Uncertainty, Mastery, Replayable Variation;
narrative-first swaps Replayable Variation for Progression; world-first requires
Progression and Expansion Headroom instead of Mastery and Replayable Variation.
Verdicts: `ADVANCE` | `DEEPEN` (one transform, register-specific kits) | `KILL`.
If the owner supplied a `BRIEF.md` in the run dir, its qualities are intent
evidence at thesis time and claims-to-falsify at review time (ADR 0008).
Fun-lock remains downstream doctrine inside the spec pack.

## The feel doctrine (`docs/feel-doctrine.md`)

Depth proves a design is worth playing; feel decides whether playing it is worth
feeling. The thesis carries a **golden moment** (the repeatable 20–40s core
experience as sensation + decision) and 3–6 **feel targets** that pass the
Adjective Test — budgets, animation commitments, four-beat feedback chains
(anticipation → action → impact → aftermath), at least one audio commitment.
Failure must teach (**Blamable-Death Test**). P07 attacks these as findings —
never as depth points; the depth floor and feel findings fail independently.
P18 slices feel first-class: the tracer plays the golden moment's full feedback
chain, and feel is never a late-order polish pass. Proof lives downstream in
the pack's human feel session (`PLAYTEST_PLAN.md`) and, for Godot packs, forge
verify gates (DESIGN-RECORD §5). A thesis may also name a `design_canon`
(clone-able design-system repo URL); the pack stamps it into
`guards/guard-config.json` so the co-dev repo inherits a look instead of
inventing one (ADR 0010).

## Taste

Depth and feel are gates; taste is the tiebreaker no rubric holds. House taste:

- **Three sentences.** A thesis you cannot pitch to a stranger in three
  sentences is not yet an idea; sharpen before scoring.
- **Fewer, deeper.** When two decompositions tie, take the one with fewer
  slices and a sharper tracer.
- **The cut list is design.** `out_of_scope` entries should read like decisions
  ("no inventory: relics are worn, never stored"), not leftovers.
- **Kill adjectives everywhere.** Any artifact claim should be checkable by
  someone who was not in the room — this is the Adjective Test generalized.
- **Believe the golden moment.** When the depth argument and the golden moment
  disagree about where the joy is, the golden moment is usually right;
  re-argue depth around it.

## Engine doctrine (`docs/engine-matrix.md`)

No default engine before the thesis. Score candidates on headless testability,
iteration speed, fantasy fit, core-loop fit, deterministic sim, migration cost,
visual-wow-no-game risk, editor opacity, toolchain-verified status, and verified
agent-tooling surface (runtime MCPs, engine skill suites — probed, never assumed). Choose the
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
(`schemas/asset-provenance`) + asset review. The studio also owns a purchased
asset library reached from design via forge-manifest `asset_requests` and the
P18 availability probe (`npm run spec:probe`); that seam does not relax the
code-native-before-fun-lock pack rule.

## Human taste gates

- **G1** — pre-decompose design taste: is the design-locked thesis worth
  decomposing and building? (the only gate that lives in the factory)
- **G2** — art direction: moves downstream into the spec pack (after fun-lock).
- **G3** — release-candidate signoff: moves downstream into the spec pack.

Everything else the agent decides from evidence; it does not ask.
