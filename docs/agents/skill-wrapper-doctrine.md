# Skill wrapper doctrine — the shared contract every project skill wrapper obeys

The ten project-local wrappers under `.codex/skills/` each bind one phase to one
prompt/contract. To keep them shallow-by-design — so a wrapper carries only its
*phase-specific* difference and not its own copy of the safety rules — every wrapper
inherits the contract below. When a safety or wording rule changes, change it here;
a wrapper should only restate a rule when it genuinely narrows it for that phase.

## Every wrapper

1. **Read first, in order:** `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, the bound
   `.factory/prompts/P##_*.md`, and the seed manifest
   `.tgf/seeds/{seed-id}/manifest.json` when one exists. Then execute the prompt exactly.
2. **Manifest beats memory.** Route and resume from `manifest.current_phase`, never
   from chat history. Update the manifest and append an `execution-ledger.jsonl` row
   for every phase transition the wrapper owns.
3. **Stay in the run dir.** Writes are confined to `.tgf/seeds/{seed-id}/`. Never
   create export destinations by hand — only `scripts/package-spec.mjs` exports
   the spec pack, at handoff; never pick an engine before `GAME_THESIS.md`.
4. **No leakage.** Never copy `.tgf`/`.omx`/ledgers/handoffs/skill docs/design
   vocabulary or absolute `/home/ark/...` paths into an exported spec pack (ADR 0003).
5. **Borrowed, not vendored.** Matt Pocock-style behaviours are wrapped or referenced,
   never copied into the wrapper body (ADR 0004). Generic issue/PRD/triage skills route
   through local files per `issue-tracker.md` — never a remote tracker by default.
6. **Completion is evidence.** A phase is done when its verifier output exists (a
   passing validator, a gate-passing depth vector, an exported verifier-clean
   pack), not when the agent says so.
7. **Never assume an unverified tool.** Capabilities come from a real probe (P17), not
   memory.

## What a wrapper adds

Only the phase-specific surface: which prompt it binds, its role, its concrete
input/output artifacts (and the schema each output must satisfy), the gate it enforces,
and any boundary that is *tighter* than the shared contract. Each wrapper is validated
by `validate-artifacts --check skill-refs` to reference a real prompt or declare itself
a router.
