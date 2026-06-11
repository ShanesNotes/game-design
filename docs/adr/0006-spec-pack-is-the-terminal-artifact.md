# ADR 0006 — The spec pack is the factory's terminal artifact

- Status: **Accepted.** Owner-directed pivot (2026-06-11): the factory's goal is to
  fertilize a game seed and decompose it into a precise, issue-sliced spec; the
  spec is opened in a clean folder and co-developed there with a teaching skill.
- Date: 2026-06-11

## Context

Through v0.1.0 the factory's terminal artifact was a playable, bot-tested,
anti-boring-gated first slice built under factory orchestration (phases
prototype-dispatch → release-candidate, 8 of 11 hooks, prompts P03–P06/P08–P12/P15).
The owner pivoted the project: the factory should stop at a **spec pack** — a
fertilized idea, depth-gated on paper, decomposed into ordered tracer-bullet
issues, exported to a clean co-development folder. Building, playtesting, and all
gameplay proof move downstream into that folder.

Keeping the build machinery as live factory gates would mean enforcement that can
never fire; deleting it would throw away the anti-boring doctrine the spec exists
to carry.

## Decision

1. **Terminal artifact = exported spec pack.** Produced only by
   `scripts/package-spec.mjs`, gated by run validation and the leakage scan
   (`scripts/lib/leakage.mjs`). Completion is the verifier-clean pack, not prose.
2. **Phase spine re-derived:** `intake → toolchain → thesis → design-review →
   engine-profile → decompose → handoff → complete`, with `deepen → thesis`
   (≤2 attempts). Build phases (prototype-dispatch, first-slice, depth-review,
   bakeoff, fun-lock, content, art, polish, qa, release-candidate) are removed
   from the live machine (`scripts/lib/run-state.mjs`).
3. **Design-lock replaces fun-lock in the factory.** The depth red-team (P07) runs
   against the thesis on paper; ADVANCE with total ≥16/24 and the six required axes
   nonzero is design-lock and opens engine-profile → decompose. The Two-Bot test
   cannot run on paper and is deferred into the spec as a falsifiability
   obligation (bot_success_criteria carried by slices). Fun-lock remains as
   downstream doctrine inside the spec pack.
4. **Decomposition is a real seam.** P18 authors `SPEC.md` (fenced JSON,
   `schemas/spec-decomposition`); `scripts/lib/spec-decomposition.mjs` holds the
   consistency policy (tracer bullet first, contiguous orders, dependency
   ordering, total loop-verb coverage); `scripts/emit-local-issues.mjs` is the
   only renderer of `issues/` (one issue per slice, pack-relative evidence links).
5. **Hooks split, not deleted** (AGENTS.md requires an ADR to remove a guard):
   the factory keeps `scope_brake`, `engine_migration_requires_adr`,
   `mcp_mutation_must_emit_text`; the 8 build-time guards move to
   `templates/spec-pack/guards/` and ship inside every pack. `run-gates.mjs`
   still dry-run-proves all 11, and the shipped `guards/lib/guard.mjs` must stay
   byte-identical to `hooks/lib/guard.mjs` (validator-enforced).
6. **Retired surface goes to the attic, not the void.** Build prompts live in
   `.factory/prompts/attic/`; skills `tgf-first-slice`, `tgf-prototype-dispatch`,
   `tgf-branch-bakeoff` and the build-only adapter agents are deleted (git history
   preserves them). `branch-score` schema is removed; `playtest-report`,
   `depth-vector`, `asset-provenance` schemas remain and ship with the pack so
   downstream evidence can be validated by factory tooling.
7. **Manifest vocabulary:** `default_spec_pack_root` / `spec_pack_path` /
   `spec_path` replace `default_child_game_root` / `child_game_path` /
   `prototype_lanes` / `playtest_report_paths`. The question budget (≤1) now gates
   phases before the spec is decomposed.
8. **Legacy v0.1.0 seed runs** are archived under `.tgf/archive/` (untracked);
   they validate against the old machine and are not migrated.

## Consequences

- The read path (CONTEXT → doctrine → ADRs → prompts) describes only the pipeline
  that exists; agents can no longer be routed into phases with no artifacts.
- The anti-boring doctrine becomes a deliverable: every pack carries the
  falsifiers (PLAYTEST_PLAN), the guards, and the schemas to prove fun downstream.
- Reversal trigger: if the factory ever resumes building games in-repo, this ADR
  must be superseded and the attic prompts re-registered before any build phase
  re-enters the machine.
