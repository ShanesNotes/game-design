# ADR 0004 — Factory layout and skill packaging

- Status: **Accepted (owner-confirmed 2026-06-06).** Supersedes the user-accepted
  clean-init spec §4 tree layout (while preserving D012's "project-local skills first"
  principle). Originally recorded as Proposed because an agent may not self-accept a
  reversal of a ratified decision; the owner (Shane) confirmed it on 2026-06-06.
  Decision register **D013** is resolved.
- Date: 2026-06-06 (proposed); 2026-06-06 (accepted)

## Context

Two eras of planning disagreed on where prompts and skills live:

- The earlier **clean-init spec §4** put prompts at top-level `prompts/` and listed
  six skills at top-level `skills/`, with eight hyphenated schema filenames.
- The later **orchestration-mapping run** and the **implementation handoff** (the
  documents this build was told to execute) specify `.factory/prompts/`,
  `.codex/skills/` with **twelve** wrappers, a `docs/agents/` context set for
  borrowed skills, and normalization of `P07` to `P07_DEPTH_RED_TEAM.md`. The v0.3
  init pack itself ships prompts under `.factory/prompts/`.

A single repo cannot have both layouts without confusion, so the conflict had to be
resolved before authoring.

## Decision

Adopt the **later, authoritative layout**:

- Prompts live under `.factory/prompts/` (`P00`–`P17`), normalized
  (`P07_DEPTH_RED_TEAM.md`), with internal references pointing at the canonical
  lowercase-hyphenated `docs/*.md` and `schemas/*.schema.json`.
- The twelve project-local TGF skill wrappers live under `.codex/skills/`:
  `tgf-harness`, `tgf-office-hours-grill`, `tgf-verify-toolchain`,
  `tgf-seed-compile`, `tgf-engine-profile`, `tgf-prototype-dispatch`,
  `tgf-first-slice`, `tgf-depth-redteam`, `tgf-branch-bakeoff`,
  `tgf-existing-project-rescue`, `tgf-repo-scout`, `tgf-handoff`.
- `docs/agents/{domain,issue-tracker,triage-labels}.md` ground the borrowed Matt
  Pocock skills; those skills are **wrapped/referenced, never vendored**, and
  generic issue/PRD/triage skills route through local artifacts (no remote publish
  by default).
- `adapters/{codex,claude-code,grok-build,mcp}/` are thin per-builder mirrors
  (currently READMEs and Claude-Code role briefs; the mirroring is not
  validator-enforced); the `.codex/skills/` definitions are the source of truth.
- This ADR supersedes only §4's prompt path (`prompts/` → `.factory/prompts/`), skill
  location and count (`skills/` with 6 → `.codex/skills/` with 12), and the P07
  filename. Everything else follows §4 verbatim: eight hyphenated `schemas/`, seven
  `hooks/`, five `scripts/`, `templates/run/` + `templates/game-repo/`, `examples/`,
  and `docs/` with `adr/`.

Each wrapper references at least one existing prompt/contract or declares itself a
router; `validate-artifacts.mjs --check skill-refs` enforces this.

## Alternatives considered

- *Keep the flat `prompts/` + six top-level `skills/` layout* as clean-init §4
  dictated.
- *Adopt the handoff layout* (chosen). It wins on substance, not recency: the v0.3
  init pack already ships prompts under `.factory/prompts/`; the twelve wrappers map
  1:1 to the P00–P17 phases (six were missing under the old six-skill set); and
  `docs/agents/` is required to ground the borrowed Matt Pocock skills. The cost —
  `.codex` coupling and a second skill-location stratum — is accepted for that
  phase coverage.

## Consequences

- The clean-init spec §4 flat `prompts/`/`skills/` layout (6 skills) is
  **superseded** by this ADR. The test spec stays satisfied: its checks are
  path-agnostic — §3.1 requires only that prompts P00–P17 and the schemas exist (no
  directory named), §3.2 parses `schemas/*.json`, and the §4 acceptance matrix names
  no `prompts/`/`skills/`/`.codex`/`.factory` path or P07 filename — and the validator
  asserts the actual tree.
- Post-fun-lock prompts (`P05`, `P06`, `P09`–`P12`, `P14`) ship as contracts; their
  wrappers are deferred until gameplay proof exists.

## Provenance

This ADR records a decision made in the implementation handoff, not a novel
architectural choice invented here. Because it reverses a detail of the user-accepted
clean-init spec §4 (the flat prompts/skills tree) — while preserving D012's
"project-local skills first" principle — it could not be self-accepted by an agent;
it was carried as **Proposed** until the owner (Shane) confirmed it on 2026-06-06,
resolving decision register **D013**. The clean-init spec §4/§13 is amended to point
here as the authoritative layout.
