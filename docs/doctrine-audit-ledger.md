# Doctrine audit ledger

Exhaustive re-derivation of every design doctrine surface against
`game-studio/DESIGN-RECORD.md` (especially §8 quarantine: TGF v0.1 is
input, not foundation — nothing survives by default). Ticket T04;
SPEC §3.2.

## Universe capture (ticket start)

- **Command:** `git ls-files docs .factory/prompts schemas templates hooks`
  (run at worktree root on base `8a32010f4ef3`, branch `orch/t04-doctrine-audit`)
- **Count:** 83
- **Base:** `8a32010f4ef3` (design `main` post-T03 rename)
- **Date:** 2026-07-10

Dispositions are judgments against DESIGN-RECORD.md, not taste.
Allowed disposition values: `reaffirmed` | `rewritten` | `culled`.
Attic prompts default to culled. ADRs are never edited retroactively —
wrong ones are superseded (0009 → 0010). Schema structural redesign for
`game-thesis` / `spec-decomposition` is dispositioned rewritten and deferred to T05
(content unchanged this ticket).

## Machine-readable rows

Parse rule for `validate-artifacts --check audit`: each data row is a
markdown table line `| \`path\` | disposition | rationale |` under this
section. The check requires every path currently returned by
`git ls-files docs .factory/prompts schemas templates hooks` to appear
exactly once. Culled paths may remain as historical rows; if still
tracked they fail the check.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/adr/0001-meta-factory-root.md` | reaffirmed | Design remains a durable meta harness not a game (DESIGN-RECORD §1–§3); historical paths kept, decision stands. |
| `docs/adr/0002-evidence-first-prototype-search.md` | reaffirmed | Evidence-first search over sunk cost still governs thesis/gate work (DESIGN-RECORD quality bar). |
| `docs/adr/0003-factory-game-separation.md` | reaffirmed | Spec/build separation stands; design ≠ game repo (DESIGN-RECORD §3); paths historical, decision not reopened. |
| `docs/adr/0004-factory-layout-and-skill-packaging.md` | reaffirmed | Layout + skill-wrapper packaging still operate this repo; substance aligns with design-as-discipline. |
| `docs/adr/0005-gate-policy-in-checkers-not-schemas.md` | reaffirmed | Gate policy in checkers not schemas remains studio contract style (DESIGN-RECORD contracts evolution; T05 gates). |
| `docs/adr/0006-spec-pack-is-the-terminal-artifact.md` | reaffirmed | Explicitly retained by DESIGN-RECORD §3 (TGF ADR 0006 pattern stands). |
| `docs/adr/0007-design-registers.md` | reaffirmed | Registers still route depth mandatory axes; design-lock quality model unchanged. |
| `docs/adr/0008-world-first-register-and-seam-slices.md` | reaffirmed | World-first register + seams still valid for place-payload seeds; no DESIGN-RECORD conflict. |
| `docs/adr/0009-feel-doctrine-and-design-canon.md` | culled | Superseded by docs/adr/0010-feel-doctrine-studio-terms.md; not edited in place; banned feel-slang + quarantine (DESIGN-RECORD §5/§8). |
| `docs/agents/domain.md` | rewritten | Studio vocabulary + run-state lists intake (not culled handoffs/ run dir); design/feel/forge terms (DESIGN-RECORD §2–§5; grill-refresh B). |
| `docs/agents/issue-tracker.md` | reaffirmed | Local markdown tracker still the borrowed-skill route; production tracking stays local (DESIGN-RECORD §5). |
| `docs/agents/skill-wrapper-doctrine.md` | rewritten | Removed hard-coded tgf-games path; export-only-via-package-spec (DESIGN-RECORD §3 separation). |
| `docs/agents/triage-labels.md` | reaffirmed | Canonical local label set still required for triage skills; no DESIGN-RECORD conflict. |
| `docs/anti-boring-gate.md` | reaffirmed | Paper ADVANCE design-lock remains design's depth gate (SPEC §1 ADVANCE; DESIGN-RECORD quality). |
| `docs/borrowed-patterns.md` | reaffirmed | Operational harvest ledger for scout; empty template still needed. |
| `docs/doctrine.md` | rewritten | Studio design discipline + forge gate (SPEC §3.4–§3.5); intake default entry; revision side-path; asset-library seam; portfolio-at-front-door NN (ADR 0011 / grill-refresh B). |
| `docs/engine-matrix.md` | rewritten | non-Godot engine decisions remain valid, but only godot-4 packs proceed into forge (SPEC §3.5 / T06 AC6); game feel vocabulary. |
| `docs/feel-doctrine.md` | rewritten | Studio term game feel; feel-slang scrubbed; forge verify pointer (DESIGN-RECORD §5). |
| `docs/game-dev-bridge.md` | rewritten | Bridge retargeted to co-dev/forge + games/ lifecycle; dropped tgf-games default (DESIGN-RECORD §2–§3). |
| `docs/handoffs/antiphon-design-review-HANDOFF.md` | culled | Historical seed-run handoff; process debris, not studio doctrine (DESIGN-RECORD §8). |
| `docs/handoffs/claude-architecture-deepening.md` | culled | Historical mission brief for TGF deepening; quarantine cull (DESIGN-RECORD §8). |
| `docs/handoffs/claude-architecture-deepening-RESULT.md` | culled | Historical architecture-pass result; decision substance lives in ADRs 0001–0006. |
| `docs/handoffs/dolphin-tgf-e2e-RESULT.md` | culled | Historical e2e mission result; not a living doctrine surface. |
| `docs/hooks-and-guards.md` | reaffirmed | 3 design hooks + 8 shipped pack guards still enforce separation and carried obligations (DESIGN-RECORD §3). |
| `docs/initialization-handoff.md` | culled | Historical TGF v0.1 init record; not re-derived doctrine under DESIGN-RECORD §8. |
| `docs/repo-radar.md` | reaffirmed | Scout radar of borrowable primitives still valid operational surface. |
| `docs/source-ledger.md` | reaffirmed | Re-probe list for fast-moving tools still supports probe-before-assume. |
| `docs/toolchain-verification-ledger.md` | reaffirmed | ACCEPT/PROBE ledger still the truth source for agent tool assumptions. |
| `.factory/prompts/attic/P03_BRANCH_BAKEOFF_DISPATCH.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P04_FIRST_PLAYABLE_SLICE.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P05_CONTENT_PACK.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P06_PROCEDURAL_ART.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P08_BRANCH_BAKEOFF.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P09_POLISH_GAME_FEEL.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P10_PERFORMANCE_AUDIT.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P11_ACCESSIBILITY_AUDIT.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P12_IP_ORIGINALITY_AUDIT.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/P15_RELEASE_CANDIDATE.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/attic/README.md` | culled | Attic default-culled (T04/SPEC §3.2); retired build-phase TGF v0.1 surface, not re-derived under DESIGN-RECORD §8. |
| `.factory/prompts/P00_ORCHESTRATOR_ULTRAGOAL.md` | rewritten | Routes `intake` (default entry) + `deepen`; aligns router with run-state graph (ADR 0011 / grill-refresh B). |
| `.factory/prompts/P01_SEED_COMPILE.md` | reaffirmed | Thesis compile remains the design entry gate before engine (DESIGN-RECORD §3; no default engine). |
| `.factory/prompts/P02_ENGINE_PROFILE.md` | reaffirmed | Engine decision phase remains; forge gate is export-time not decision-time (DESIGN-RECORD §3). |
| `.factory/prompts/P07_DEPTH_RED_TEAM.md` | reaffirmed | Paper anti-boring / ADVANCE design-lock is still design's quality gate (DESIGN-RECORD §5 game-feel companion; SPEC ADVANCE). |
| `.factory/prompts/P13_EXISTING_PROJECT_RESCUE.md` | reaffirmed | Inherited-repo intake still valid; existing projects are evidence not destiny (doctrine + DESIGN-RECORD openness). |
| `.factory/prompts/P14_KILL_RESTART.md` | reaffirmed | Kill/restart after failed deepen is still the evidence-over-sunk-cost exit (DESIGN-RECORD quality stance). |
| `.factory/prompts/P16_REPO_SCOUT.md` | reaffirmed | Scout harvest of primitives still serves design reuse without cargo-cult (discipline ownership test in DESIGN-RECORD §5). |
| `.factory/prompts/P17_VERIFY_TOOLCHAIN.md` | reaffirmed | Probe-before-assume tool doctrine still binds (design needs verified agent surfaces). |
| `.factory/prompts/P18_DECOMPOSE_SPEC.md` | rewritten | Feel first-class + forge-authoring (SPEC §3.4 / T06); optional ext.disciplines (GB01); post-issue fail-fast `spec:package --require-manifest` dry-run (grill-refresh B / ADR 0011). |
| `.factory/prompts/P19_PACKAGE_SPEC.md` | rewritten | Forge-manifest emission + Godot-gate + --require-manifest (SPEC §3.4–§3.5 / T06). |
| `hooks/engine_migration_requires_adr.mjs` | reaffirmed | Still enforces seed-scoped engine decision files (DESIGN-RECORD engine phase remains). |
| `hooks/lib/guard.mjs` | reaffirmed | Shared portable guard plumbing; required for design hooks and shipped pack guards. |
| `hooks/mcp_mutation_must_emit_text.mjs` | reaffirmed | Code-native-over-opaque still binds design mutations (doctrine principle 4). |
| `hooks/scope_brake.mjs` | reaffirmed | No game/gameplay edits before thesis; enforces DESIGN-RECORD §3 no-game-code-in-design. |
| `schemas/asset-provenance.schema.json` | reaffirmed | Shipped-pack provenance recipe still needed for opaque-asset doctrine. |
| `schemas/depth-vector.schema.json` | reaffirmed | Design-lock depth vector schema still the ADVANCE gate input. |
| `schemas/engine-profile-decision.schema.json` | rewritten | Optional godot_min/godot_max/renderer/language for forge-manifest engine block (SPEC §3.4 / T06). |
| `schemas/execution-ledger-row.schema.json` | reaffirmed | Evidence-backed phase transitions remain run resumption truth. |
| `schemas/game-thesis.schema.json` | rewritten | Structured feel_targets (T05) + optional out_of_scope for manifest mapping (SPEC §3.4 / T06). |
| `schemas/module-card.schema.json` | reaffirmed | Scout module-card still validates harvested primitives before adoption. |
| `schemas/playtest-report.schema.json` | reaffirmed | Shipped-pack playtest evidence schema still carries bot/human proof obligations. |
| `schemas/seed-manifest.schema.json` | reaffirmed | Per-seed run manifest still resumption source of truth. |
| `schemas/spec-decomposition.schema.json` | rewritten | Structured acceptance (T05) + asset_requests/lore_refs/capabilities/verify_plan (SPEC §3.4 / T06); optional permissive ext.disciplines (enum validated in mapper per ADR-0005 / GB01). |
| `templates/run/decisions/0001-engine-profile.md` | rewritten | Godot version/renderer/language fields for forge-manifest mapping (SPEC §3.4 / T06). |
| `templates/run/GAME_SEED.md` | reaffirmed | Run-dir seed template still the intake capture surface. |
| `templates/run/GAME_THESIS.template.md` | rewritten | Structured feel_targets (T05) + out_of_scope for manifest mapping (T06). |
| `templates/run/manifest.json` | reaffirmed | Seed manifest template still initializes run state. |
| `templates/run/README_AGENT_BOOT.md` | reaffirmed | Per-run agent boot still routes by manifest.current_phase. |
| `templates/run/README_NEXT_ACTIONS.md` | reaffirmed | Next-actions stub still orients cold agents on a run. |
| `templates/spec-pack/AGENTS.md` | reaffirmed | Pack-local AGENTS still orients co-dev without design harness leakage (ADR 0006). |
| `templates/spec-pack/guards/afk_heartbeat_required.mjs` | reaffirmed | Shipped AFK heartbeat still downstream carried obligation. |
| `templates/spec-pack/guards/art_fidelity_cap.mjs` | reaffirmed | Art fidelity cap still enforces programmer-art-before-fun-lock pack doctrine. |
| `templates/spec-pack/guards/asset_provenance.mjs` | reaffirmed | Asset provenance guard still aligns with assets discipline ownership (DESIGN-RECORD §5 licensing visibility). |
| `templates/spec-pack/guards/lib/guard.mjs` | reaffirmed | Byte-identical pack copy of guard lib; portability of shipped guards. |
| `templates/spec-pack/guards/minimum_bot_session_gate.mjs` | reaffirmed | Min bot session still prevents trivially short 'played' claims. |
| `templates/spec-pack/guards/no_content_before_fun_lock.mjs` | reaffirmed | No content before fun-lock remains shipped-pack doctrine. |
| `templates/spec-pack/guards/phaser_version_pin.mjs` | reaffirmed | Engine pin guard still valid when Phaser packs exist; no default engine claim. |
| `templates/spec-pack/guards/playtest_report_required.mjs` | reaffirmed | Playtest report required still enforces evidence over prose. |
| `templates/spec-pack/guards/two_bot_spread_gate.mjs` | reaffirmed | Two-bot spread still the deferred paper Two-Bot falsifier in the pack. |
| `templates/spec-pack/MISSION.md` | reaffirmed | Pack mission stub still frames the co-dev goal. |
| `templates/spec-pack/NOTES.md` | reaffirmed | Pack notes stub still a clean co-dev scratch surface. |
| `templates/spec-pack/PLAYTEST_PLAN.md` | reaffirmed | Playtest plan still carries bot + human feel session obligations (DESIGN-RECORD §5). |
| `templates/spec-pack/README.md` | reaffirmed | Pack README still the human entry for the terminal artifact. |
| `templates/spec-pack/RESOURCES.md` | reaffirmed | Pack resources still hand tooling possibilities without requiring them. |

## Post-audit additions (not in start universe)

These paths were created by the audit itself and are required to appear
in the regenerated universe list.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/adr/0010-feel-doctrine-studio-terms.md` | rewritten | Re-derived feel + design_canon under studio terms; supersedes culled 0009 (DESIGN-RECORD §5). |
| `docs/doctrine-audit-ledger.md` | rewritten | Exhaustive provenance ledger (DESIGN-RECORD §8 / T04); Slice B rows for ADR 0011 + in-universe rewrites (grill-refresh 2026-07-12). |

## Grill-refresh Slice B (2026-07-12) — front-end wiring truth

Portfolio-at-front-door doctrine + P00/skill/P18 prompt repairs + handoffs cull.
Consult-reviewed; Slice A owns schemas/init/validate-artifacts in parallel.
In-universe rows above already rewritten for P00/P18/doctrine/domain; this
section adds only **new** universe paths. Out-of-universe surfaces also touched:
`.codex/skills/tgf-office-hours-grill/SKILL.md`, `CONTEXT.md`, `AGENTS.md`,
`README.md`, `scripts/lib/run-state.mjs` (RUN_DIRS cull), `tests/factory.test.mjs`.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/adr/0011-portfolio-at-front-door.md` | rewritten | New ADR: intake default entry, portfolio distinctness, depth evidence/provenance, both consult positions on default-entry (grill-refresh B). |

| `schemas/intake-grill.schema.json` | rewritten | New schema: ten office-hours pressure fields + digest ref as the intake artifact machine surface (ADR 0011 / grill-refresh A). |
| `schemas/portfolio-digest.schema.json` | rewritten | New schema: portfolio memory — prior theses, lifecycle, sealed human verdicts (UNKNOWN when absent), honest skipped rows (ADR 0011 / grill-refresh A). |
