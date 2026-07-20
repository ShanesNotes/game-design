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

That universe is exactly `git ls-files docs .factory/prompts schemas templates
hooks`: `scripts/` and `tests/` are deliberately outside it. Code truth is
carried by the test suite (186 tests at this slice's baseline), so validator
and test changes rely on review convention rather than this audit gate.

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
| `docs/doctrine.md` | rewritten | Studio design discipline + forge gate (SPEC §3.4–§3.5); intake default entry; revision side-path; asset-library seam; portfolio-at-front-door (ADR 0011); equal-rigor grill/yolo attention lanes + hard stop line (ADR 0012); reference-game canon pointer (audited-only phase-tier + pigeonhole; FUE W2-B). |
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
| `.factory/prompts/P01_SEED_COMPILE.md` | rewritten | Thesis compile remains the design entry gate before engine; MAY cite audited reference ids as contrast only — pigeonhole doctrine forbids reference-as-target (FUE W2-B). |

| `.factory/prompts/P00_ORCHESTRATOR_ULTRAGOAL.md` | rewritten | Routes `intake` + `deepen`, grill/yolo attention semantics with yolo hard-stop, auto-originated yolo runs, and G1 brief generation at ADVANCE before either stop behavior (ADR 0011/0012). |
| `.factory/prompts/P02_ENGINE_PROFILE.md` | reaffirmed | Engine decision phase remains; forge gate is export-time not decision-time (DESIGN-RECORD §3). |
| `.factory/prompts/P07_DEPTH_RED_TEAM.md` | rewritten | Paper anti-boring / ADVANCE design-lock remains; audited reference cards supply depth_mechanisms/anti_lessons attack vectors (findings, not depth points) with SKIPPED when empty (FUE W2-B). |
| `.factory/prompts/P13_EXISTING_PROJECT_RESCUE.md` | reaffirmed | Inherited-repo intake still valid; existing projects are evidence not destiny (doctrine + DESIGN-RECORD openness). |
| `.factory/prompts/P14_KILL_RESTART.md` | reaffirmed | Kill/restart after failed deepen is still the evidence-over-sunk-cost exit (DESIGN-RECORD quality stance). |
| `.factory/prompts/P16_REPO_SCOUT.md` | reaffirmed | Scout harvest of primitives still serves design reuse without cargo-cult (discipline ownership test in DESIGN-RECORD §5). |
| `.factory/prompts/P17_VERIFY_TOOLCHAIN.md` | reaffirmed | Probe-before-assume tool doctrine still binds (design needs verified agent surfaces). |
| `.factory/prompts/P17_5_UNDERSTANDING_CHECKPOINT.md` | rewritten | Owner-requested process gate: one-page "game as I understand it" between design-lock and decompose (grill sign-off / yolo self-review); kingdoms Ruling-A redirect cost ~40m without it. |
| `.factory/prompts/P18_DECOMPOSE_SPEC.md` | rewritten | Feel first-class + forge-authoring (SPEC §3.4 / T06); optional ext.disciplines (GB01); post-issue fail-fast `spec:package --require-manifest` dry-run (grill-refresh B / ADR 0011); audited reference packaging_lessons + system_bom disposition checklist with SKIPPED when empty (FUE W2-B). |
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
| `schemas/seed-manifest.schema.json` | rewritten | Per-seed run manifest remains resumption truth; optional enum'd `design_lane` preserves legacy runs while making new grill/yolo mode, stop line, and origination durable (ADR 0012). |
| `schemas/spec-decomposition.schema.json` | rewritten | Structured acceptance (T05) + asset_requests/lore_refs/capabilities/verify_plan (SPEC §3.4 / T06); optional permissive ext.disciplines (enum validated in mapper per ADR-0005 / GB01). |
| `templates/run/decisions/0001-engine-profile.md` | rewritten | Godot version/renderer/language fields for forge-manifest mapping (SPEC §3.4 / T06). |
| `templates/run/GAME_SEED.md` | reaffirmed | Run-dir seed template still the intake capture surface. |
| `templates/run/GAME_THESIS.template.md` | rewritten | Structured feel_targets (T05) + out_of_scope for manifest mapping (T06). |
| `templates/run/manifest.json` | rewritten | Seed manifest template initializes the collaborative-default `{grill, pack, user}` design lane (ADR 0012). |
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
| `docs/adr/0012-design-lanes.md` | rewritten | Owner-confirmed grill/yolo attention lanes, equal-strength gates, recorded-question split, G1 seam, and yolo stop-line release contract (2026-07-12). |

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
| `schemas/portfolio-digest.schema.json` | rewritten | Portfolio memory includes prior theses, parked proposals, lifecycle, sealed human verdicts (UNKNOWN when absent), and honest source/skipped rows (ADR 0011/0012). |

## Design lanes (2026-07-12)

ADR 0012 re-derived the touched in-universe surfaces in their existing rows
above (`docs/doctrine.md`, P00, seed-manifest schema, and run-manifest template)
and added the new ADR row. Out-of-universe implementation surfaces:
`.codex/skills/tgf-office-hours-grill/SKILL.md`, `scripts/init-game-run.mjs`,
`scripts/lib/run-state.mjs`, `scripts/validate-artifacts.mjs`, and co-located
tests.

## FUE e3 (2026-07-12) — reference-game card substrate

Machine substrate only (schema, canon, validator, index). Pipeline cite hooks
landed later in FUE W2-B; pigeonhole doctrine lives in
`docs/reference-games/README.md`.

Tier-2 work in this section is the **genre-index pilot**; **canon** is reserved
for Tier-1 reference cards. Machine-readable rows below remain historical audit
records and are not rewritten by this prose correction.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/CANON.md` | rewritten | Shane-ratified membership list for reference cards; substrate for later pipeline cites (orchestrate FUE e3). |
| `docs/reference-games/README.md` | rewritten | Phase-tiered roles + pigeonhole doctrine for the reference-game canon (FUE e3). |
| `docs/reference-games/cards/.gitkeep` | culled | Purpose expired — 16 real research cards landed in cards/; placeholder removed (historical row kept). |
| `docs/reference-games/cards/_example.json` | rewritten | Fictional fixture card proving schema/validator path; not research, not citable. |
| `docs/reference-games/index.jsonl` | rewritten | Generated summary index (id/title/genre_tags/register_mapping/status) refreshed by validate-reference-cards. |
| `docs/reference-games/TAXONOMY.md` | rewritten | Frozen Tier-2 design-shape ontology, storefront-derived market vocabulary, evidence thresholds, and completeness rules for the reference canon pilot. |
| `docs/reference-games/genre-index.jsonl` | rewritten | Generated greppable Tier-2 navigation summary, regenerated for the 112-row corpus after classics wave batch E1; coverage counts remain derived rather than stored. |
| `docs/reference-games/genre-index/baba-is-you.json` | rewritten | Sourced Tier-2 pilot row for Baba Is You under frozen taxonomy v1. |
| `docs/reference-games/genre-index/balatro.json` | rewritten | Sourced Tier-2 pilot row for Balatro under frozen taxonomy v1. |
| `docs/reference-games/genre-index/celeste.json` | rewritten | Sourced Tier-2 pilot row for Celeste with Tier-1 card navigation. |
| `docs/reference-games/genre-index/civilization-6.json` | rewritten | Sourced Tier-2 pilot row for Sid Meier's Civilization VI under frozen taxonomy v1. |
| `docs/reference-games/genre-index/dead-cells.json` | rewritten | Sourced Tier-2 pilot row for Dead Cells under frozen taxonomy v1. |
| `docs/reference-games/genre-index/dont-starve-together.json` | rewritten | Sourced Tier-2 pilot row for Don't Starve Together under frozen taxonomy v1. |
| `docs/reference-games/genre-index/dredge.json` | rewritten | Sourced Tier-2 pilot row for DREDGE under frozen taxonomy v1. |
| `docs/reference-games/genre-index/factorio.json` | rewritten | Sourced Tier-2 pilot row for Factorio under frozen taxonomy v1. |
| `docs/reference-games/genre-index/hades.json` | rewritten | Sourced Tier-2 pilot row for Hades with Tier-1 card navigation. |
| `docs/reference-games/genre-index/hollow-knight.json` | rewritten | Sourced Tier-2 pilot row for Hollow Knight under frozen taxonomy v1. |
| `docs/reference-games/genre-index/inscryption.json` | rewritten | Sourced Tier-2 pilot row for Inscryption under frozen taxonomy v1. |
| `docs/reference-games/genre-index/into-the-breach.json` | rewritten | Sourced Tier-2 pilot row for Into the Breach with Tier-1 card navigation. |
| `docs/reference-games/genre-index/outer-wilds.json` | rewritten | Sourced Tier-2 pilot row for Outer Wilds under frozen taxonomy v1. |
| `docs/reference-games/genre-index/overcooked-2.json` | rewritten | Sourced Tier-2 pilot row for Overcooked! 2 under frozen taxonomy v1. |
| `docs/reference-games/genre-index/papers-please.json` | rewritten | Sourced Tier-2 pilot row for Papers, Please under frozen taxonomy v1. |
| `docs/reference-games/genre-index/portal-2.json` | rewritten | Sourced Tier-2 pilot row for Portal 2 under frozen taxonomy v1. |
| `docs/reference-games/genre-index/rimworld.json` | rewritten | Sourced Tier-2 pilot row for RimWorld under frozen taxonomy v1. |
| `docs/reference-games/genre-index/slay-the-spire.json` | rewritten | Sourced Tier-2 pilot row for Slay the Spire with Tier-1 card navigation. |
| `docs/reference-games/genre-index/stardew-valley.json` | rewritten | Sourced Tier-2 pilot row for Stardew Valley with Tier-1 card navigation. |
| `docs/reference-games/genre-index/terraria.json` | rewritten | Sourced Tier-2 pilot row for Terraria under frozen taxonomy v1. |
| `docs/reference-games/genre-index/age-of-empires-2.json` | rewritten | Sourced Tier-2 fill row for Age of Empires II with Tier-1 card navigation. |
| `docs/reference-games/genre-index/baldurs-gate-3.json` | rewritten | Sourced Tier-2 fill row for Baldur's Gate 3 under frozen taxonomy v1. |
| `docs/reference-games/genre-index/call-of-duty.json` | rewritten | Sourced Tier-2 fill row for Call of Duty with Tier-1 card navigation. |
| `docs/reference-games/genre-index/counter-strike-2.json` | rewritten | Sourced Tier-2 fill row for Counter-Strike 2 under frozen taxonomy v1. |
| `docs/reference-games/genre-index/cuphead.json` | rewritten | Sourced Tier-2 fill row for Cuphead under frozen taxonomy v1. |
| `docs/reference-games/genre-index/disco-elysium.json` | rewritten | Sourced Tier-2 fill row for Disco Elysium with Tier-1 card navigation. |
| `docs/reference-games/genre-index/doom-eternal.json` | rewritten | Sourced Tier-2 fill row for DOOM Eternal under frozen taxonomy v1. |
| `docs/reference-games/genre-index/elden-ring.json` | rewritten | Sourced Tier-2 fill row for ELDEN RING under frozen taxonomy v1. |
| `docs/reference-games/genre-index/frostpunk.json` | rewritten | Sourced Tier-2 fill row for Frostpunk under frozen taxonomy v1. |
| `docs/reference-games/genre-index/it-takes-two.json` | rewritten | Sourced Tier-2 fill row for It Takes Two under frozen taxonomy v1. |
| `docs/reference-games/genre-index/kerbal-space-program.json` | rewritten | Sourced Tier-2 fill row for Kerbal Space Program under frozen taxonomy v1. |
| `docs/reference-games/genre-index/league-of-legends.json` | rewritten | Sourced Tier-2 fill row for League of Legends with Tier-1 card navigation and Epic storefront evidence. |
| `docs/reference-games/genre-index/mario-odyssey.json` | rewritten | Sourced Tier-2 fill row for Super Mario Odyssey with Tier-1 card navigation and Nintendo storefront evidence. |
| `docs/reference-games/genre-index/megabonk.json` | rewritten | Sourced Tier-2 fill row for Megabonk with Tier-1 card navigation. |
| `docs/reference-games/genre-index/minecraft.json` | rewritten | Sourced Tier-2 fill row for Minecraft with Tier-1 card navigation and Microsoft/Nintendo storefront evidence. |
| `docs/reference-games/genre-index/return-of-the-obra-dinn.json` | rewritten | Sourced Tier-2 fill row for Return of the Obra Dinn under frozen taxonomy v1. |
| `docs/reference-games/genre-index/rocket-league.json` | rewritten | Sourced Tier-2 fill row for Rocket League under frozen taxonomy v1. |
| `docs/reference-games/genre-index/street-fighter-6.json` | rewritten | Sourced Tier-2 fill row for Street Fighter 6 under frozen taxonomy v1. |
| `docs/reference-games/genre-index/subnautica.json` | rewritten | Sourced Tier-2 fill row for Subnautica under frozen taxonomy v1. |
| `docs/reference-games/genre-index/tetris-effect.json` | rewritten | Sourced Tier-2 fill row for Tetris Effect: Connected under frozen taxonomy v1. |
| `docs/reference-games/genre-index/the-witness.json` | rewritten | Sourced Tier-2 fill row for The Witness under frozen taxonomy v1. |
| `docs/reference-games/genre-index/vampire-survivors.json` | rewritten | Sourced Tier-2 fill row for Vampire Survivors with Tier-1 card navigation. |
| `docs/reference-games/genre-index/xcom-2.json` | rewritten | Sourced Tier-2 fill row for XCOM 2 under frozen taxonomy v1. |
| `docs/reference-games/genre-index/zelda-botw.json` | rewritten | Sourced Tier-2 fill row for Breath of the Wild with Tier-1 card navigation and Nintendo storefront evidence. |
| `schemas/reference-card.schema.json` | rewritten | Draft 2020-12 card shape (moat, loop, depth mechanisms, system BOM, status draft\|audited) for the reference-game canon (FUE e3). |
| `schemas/genre-index-row.schema.json` | rewritten | Draft 2020-12 Tier-2 row contract for design facets, market memberships, typed evidence, hypotheses, and optional Tier-1 navigation. |
| `scripts/validate-genre-index.mjs` | rewritten | Validator retains optional Steam review reach and adds an explicit exact, case-insensitive storefront-genre alias table for role-playing→rpg, fighting→action, and action & adventure→action. |
| `tests/genre-index.test.mjs` | rewritten | Regression coverage for optional Steam reviews plus exact alias acceptance, unaliased mismatches, and near-match alias rejection. |

## FUE cards batch Grok (2026-07-12) — draft research cards (8/16)

Eight draft research cards for the Shane-ratified canon. Status remains
`draft` (cross-audit later). (Since ratified: 6 repaired cards, commit fe49f81, 2026-07-13; all cards now `audited`.) Mechanical universe rows only.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/cards/call-of-duty.json` | rewritten | Draft reference card; COD4 pin; killstreak + create-a-class + XP (orch/fue-cards-grok). |
| `docs/reference-games/cards/celeste.json` | rewritten | Draft reference card; dash budget + screen retry + Assist Mode (orch/fue-cards-grok). |
| `docs/reference-games/cards/hades.json` | rewritten | Draft reference card; death-as-narrative + boons + God Mode (orch/fue-cards-grok). |
| `docs/reference-games/cards/mario-odyssey.json` | rewritten | Draft reference card; Capture + over-supplied moons (orch/fue-cards-grok). |
| `docs/reference-games/cards/megabonk.json` | rewritten | Draft reference card; 2025 3D survivor-like + Silver meta (orch/fue-cards-grok). |
| `docs/reference-games/cards/age-of-empires-2.json` | rewritten | Draft reference card; AoE II DE four-resource timing + scouting (orch/fue-cards-codex). |
| `docs/reference-games/cards/league-of-legends.json` | rewritten | Draft reference card; LoL 12.22 fog/income/objective economy (orch/fue-cards-codex). |
| `docs/reference-games/cards/diablo-2.json` | rewritten | Draft reference card; D2 LoD 1.14d drop-routed builds (orch/fue-cards-codex). |
| `docs/reference-games/cards/slay-the-spire.json` | rewritten | Draft reference card; StS 2.3.4 intent-priced cards (orch/fue-cards-codex). |
| `docs/reference-games/cards/into-the-breach.json` | rewritten | Draft reference card; ItB AE intent+displacement (orch/fue-cards-codex). |
| `docs/reference-games/cards/disco-elysium.json` | rewritten | Draft reference card; DE Final Cut skills-as-dialogue (orch/fue-cards-codex). |
| `docs/reference-games/cards/minecraft.json` | rewritten | Draft reference card; Java 1.21 block economy (orch/fue-cards-codex). |
| `docs/reference-games/cards/rust.json` | rewritten | Draft reference card; Rust 2025 upkeep/raid contested gains (orch/fue-cards-codex). |
| `docs/reference-games/cards/stardew-valley.json` | rewritten | Draft reference card; day energy + seasons + bundles (orch/fue-cards-grok). |
| `docs/reference-games/cards/vampire-survivors.json` | rewritten | Draft reference card; auto-attack + level forks + gold meta (orch/fue-cards-grok). |
| `docs/reference-games/cards/zelda-botw.json` | rewritten | Draft reference card; chemistry engine + durability + stamina (orch/fue-cards-grok). |
| `docs/reference-games/cards/warcraft-3.json` | rewritten | Tier-1 promotion ratified by Shane 2026-07-19 (665e704); per-claim Blizzard classic-guide citations — upkeep tiers, creeps, hero revival, day/night. Ledger row added during kingdoms e2e (validator audit gap). |

## FUE W2-B (2026-07-12) — reference-game pipeline hooks

Phase-tiered cite hooks on existing in-universe rows above (P01 / P07 / P18 /
`docs/doctrine.md`). Audited-only; empty canon → SKIPPED evidence rows; no card
authoring. Out-of-universe surfaces also touched:
`.codex/skills/tgf-office-hours-grill/SKILL.md` (intake vocabulary),
`tgf-seed-compile/SKILL.md`, `tgf-depth-redteam/SKILL.md`,
`tgf-decompose/SKILL.md`.

## Fill-to-floors batch B (2026-07-13) — genre-index MMO + breadth

Twenty-seven sourced Tier-2 rows under ratified taxonomy v1: massively-multiplayer
floor (Rust + FFXIV + OSRS + EVE) plus racing/sports/sim/casual/narrative/coop/systems
breadth. Reserves used: deep-rock-galactic, shapez-2. Mechanical ledger rows only.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/genre-index/art-of-rally.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for art of rally under ratified taxonomy v1. |
| `docs/reference-games/genre-index/cities-skylines.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Cities: Skylines under ratified taxonomy v1. |
| `docs/reference-games/genre-index/deep-rock-galactic.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Deep Rock Galactic under ratified taxonomy v1. |
| `docs/reference-games/genre-index/dwarf-fortress.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Dwarf Fortress under ratified taxonomy v1. |
| `docs/reference-games/genre-index/ea-sports-fc-25.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for EA Sports FC 25 under ratified taxonomy v1. |
| `docs/reference-games/genre-index/euro-truck-simulator-2.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Euro Truck Simulator 2 under ratified taxonomy v1. |
| `docs/reference-games/genre-index/eve-online.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for EVE Online under ratified taxonomy v1. |
| `docs/reference-games/genre-index/final-fantasy-xiv.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for FINAL FANTASY XIV Online under ratified taxonomy v1. |
| `docs/reference-games/genre-index/football-manager-2024.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Football Manager 2024 under ratified taxonomy v1. |
| `docs/reference-games/genre-index/her-story.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Her Story under ratified taxonomy v1. |
| `docs/reference-games/genre-index/kentucky-route-zero.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Kentucky Route Zero under ratified taxonomy v1. |
| `docs/reference-games/genre-index/lethal-company.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Lethal Company under ratified taxonomy v1. |
| `docs/reference-games/genre-index/microsoft-flight-simulator.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Microsoft Flight Simulator under ratified taxonomy v1. |
| `docs/reference-games/genre-index/noita.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Noita under ratified taxonomy v1. |
| `docs/reference-games/genre-index/old-school-runescape.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Old School RuneScape under ratified taxonomy v1. |
| `docs/reference-games/genre-index/phasmophobia.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Phasmophobia under ratified taxonomy v1. |
| `docs/reference-games/genre-index/powerwash-simulator.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for PowerWash Simulator under ratified taxonomy v1. |
| `docs/reference-games/genre-index/project-zomboid.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Project Zomboid under ratified taxonomy v1. |
| `docs/reference-games/genre-index/risk-of-rain-2.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Risk of Rain 2 under ratified taxonomy v1. |
| `docs/reference-games/genre-index/rust.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Rust with required Tier-1 card_ref under ratified taxonomy v1. |
| `docs/reference-games/genre-index/shapez-2.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for shapez 2 under ratified taxonomy v1. |
| `docs/reference-games/genre-index/tabletop-simulator.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Tabletop Simulator under ratified taxonomy v1. |
| `docs/reference-games/genre-index/trackmania.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Trackmania under ratified taxonomy v1. |
| `docs/reference-games/genre-index/unpacking.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Unpacking under ratified taxonomy v1. |
| `docs/reference-games/genre-index/valheim.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Valheim under ratified taxonomy v1. |
| `docs/reference-games/genre-index/what-remains-of-edith-finch.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for What Remains of Edith Finch under ratified taxonomy v1. |
| `docs/reference-games/genre-index/wingspan.json` | rewritten | Sourced Tier-2 fill-to-floors batch B row for Wingspan under ratified taxonomy v1. |


## Classics wave batch C (2026-07-13) — console-era genre-index rows

Fifteen sourced Tier-2 rows under ratified taxonomy v1 + classics evidence doctrine
(archival storefront / live re-release listings). Disposition `rewritten` for new
paths (ledger convention). Dropped: pokemon-red-blue (storefront Role-Playing
string does not match market_genres enum `rpg` — validator gap reported, not patched).
Reserves unused. Mechanical ledger rows only.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/genre-index/super-mario-bros.json` | rewritten | Sourced Tier-2 classics batch C row; NES design; archived Wii U VC Action. |
| `docs/reference-games/genre-index/super-mario-bros-3.json` | rewritten | Sourced Tier-2 classics batch C row; NES design; archived Wii U VC Action/Adventure. |
| `docs/reference-games/genre-index/super-mario-world.json` | rewritten | Sourced Tier-2 classics batch C row; SNES design; archived 3DS VC Action. |
| `docs/reference-games/genre-index/super-mario-64.json` | rewritten | Sourced Tier-2 classics batch C row; N64 design; archived 3D All-Stars Platformer/Action. |
| `docs/reference-games/genre-index/zelda-link-to-the-past.json` | rewritten | Sourced Tier-2 classics batch C row; SNES design; archived Wii U VC Action. |
| `docs/reference-games/genre-index/zelda-ocarina-of-time.json` | rewritten | Sourced Tier-2 classics batch C row; N64 design; archived OoT 3D Action. |
| `docs/reference-games/genre-index/super-metroid.json` | rewritten | Sourced Tier-2 classics batch C row; SNES design; archived Wii U VC Action/Adventure. |
| `docs/reference-games/genre-index/chrono-trigger.json` | rewritten | Sourced Tier-2 classics batch C row; SNES design; Steam re-release RPG. |
| `docs/reference-games/genre-index/final-fantasy-7.json` | rewritten | Sourced Tier-2 classics batch C row; PS1 design; Steam re-release RPG. |
| `docs/reference-games/genre-index/castlevania-symphony-of-the-night.json` | rewritten | Sourced Tier-2 classics batch C row; PS1 design; PS Store Requiem Action. |
| `docs/reference-games/genre-index/street-fighter-2.json` | rewritten | Sourced Tier-2 classics batch C row; SFII lineage; Steam 30th Collection Action. |
| `docs/reference-games/genre-index/mega-man-2.json` | rewritten | Sourced Tier-2 classics batch C row; NES design; Steam Legacy Collection Action. |
| `docs/reference-games/genre-index/donkey-kong-arcade.json` | rewritten | Sourced Tier-2 classics batch C row; 1981 arcade; live Arcade Archives Action. |
| `docs/reference-games/genre-index/super-mario-kart.json` | rewritten | Sourced Tier-2 classics batch C row; SNES design; archived Wii U VC Racing. |
| `docs/reference-games/genre-index/earthbound.json` | rewritten | Sourced Tier-2 classics batch C row; SNES design; archived Wii U VC Action. |
## Classics wave batch D (2026-07-13) — PC/arcade/western classics genre-index

Sixteen sourced Tier-2 rows under ratified taxonomy v1 and classics evidence doctrine
(README ratifications; f857d6a). Steam/GOG live storefront genres; diablo-2 uses D2:R
Infernal Edition listing with edition_pinned recording classic LoD design. Drops:
starcraft, warcraft-3 (no honest storefront genre field on allowed platforms). Mechanical
ledger rows only; disposition rewritten.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/genre-index/diablo-2.json` | rewritten | Sourced Tier-2 classics batch D row for Diablo II (LoD via D2:R evidence) with Tier-1 card_ref. |
| `docs/reference-games/genre-index/doom-1993.json` | rewritten | Sourced Tier-2 classics batch D row for DOOM (1993) under ratified taxonomy v1. |
| `docs/reference-games/genre-index/quake.json` | rewritten | Sourced Tier-2 classics batch D row for Quake under ratified taxonomy v1. |
| `docs/reference-games/genre-index/half-life.json` | rewritten | Sourced Tier-2 classics batch D row for Half-Life under ratified taxonomy v1. |
| `docs/reference-games/genre-index/half-life-2.json` | rewritten | Sourced Tier-2 classics batch D row for Half-Life 2 under ratified taxonomy v1. |
| `docs/reference-games/genre-index/portal.json` | rewritten | Sourced Tier-2 classics batch D row for Portal under ratified taxonomy v1. |
| `docs/reference-games/genre-index/baldurs-gate-2.json` | rewritten | Sourced Tier-2 classics batch D row for Baldur's Gate II under ratified taxonomy v1. |
| `docs/reference-games/genre-index/deus-ex.json` | rewritten | Sourced Tier-2 classics batch D row for Deus Ex under ratified taxonomy v1. |
| `docs/reference-games/genre-index/the-sims.json` | rewritten | Sourced Tier-2 classics batch D row for The Sims under ratified taxonomy v1. |
| `docs/reference-games/genre-index/simcity-2000.json` | rewritten | Sourced Tier-2 classics batch D row for SimCity 2000 (GOG storefront genres) under ratified taxonomy v1. |
| `docs/reference-games/genre-index/gta-san-andreas.json` | rewritten | Sourced Tier-2 classics batch D row for GTA: San Andreas under ratified taxonomy v1. |
| `docs/reference-games/genre-index/halo-combat-evolved.json` | rewritten | Sourced Tier-2 classics batch D row for Halo: CE (MCC listing evidence) under ratified taxonomy v1. |
| `docs/reference-games/genre-index/metal-gear-solid.json` | rewritten | Sourced Tier-2 classics batch D row for Metal Gear Solid under ratified taxonomy v1. |
| `docs/reference-games/genre-index/resident-evil-4.json` | rewritten | Sourced Tier-2 classics batch D row for Resident Evil 4 (2005) under ratified taxonomy v1. |
| `docs/reference-games/genre-index/pac-man.json` | rewritten | Sourced Tier-2 classics batch D row for PAC-MAN (Museum+ listing evidence) under ratified taxonomy v1. |
| `docs/reference-games/genre-index/myst.json` | rewritten | Sourced Tier-2 classics batch D row for Myst under ratified taxonomy v1. |

## Classics wave batch E1 (2026-07-13) — required and lineage classics

Ten sourced Tier-2 rows under ratified taxonomy v1 and classics evidence doctrine.
StarCraft and Warcraft III use archived boxed-retail storefront genre fields; Pokémon
Red/Blue uses an archived Nintendo Role-Playing field through the validator's explicit
genre alias. No publisher-genre extension or reserve swap was required.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/genre-index/starcraft.json` | rewritten | Sourced Tier-2 batch E1 row for the 1998 StarCraft base game, pinned separately from Brood War, with archived boxed-retail Strategy evidence. |
| `docs/reference-games/genre-index/warcraft-3.json` | rewritten | Sourced Tier-2 batch E1 row for 2002 Warcraft III: Reign of Chaos, pinned separately from The Frozen Throne, with archived boxed-retail Strategy evidence. |
| `docs/reference-games/genre-index/pokemon-red-blue.json` | rewritten | Sourced Tier-2 batch E1 row for Pokémon Red/Blue using archived Nintendo 3DS VC Role-Playing evidence through the exact role-playing→rpg alias. |
| `docs/reference-games/genre-index/sonic-the-hedgehog.json` | rewritten | Sourced Tier-2 batch E1 lineage row for the 1991 Sonic the Hedgehog design using Steam Action/Adventure evidence. |
| `docs/reference-games/genre-index/tetris.json` | rewritten | Sourced Tier-2 batch E1 lineage row for the 1984 Tetris design using Tetris Forever Puzzle/Arcade evidence. |
| `docs/reference-games/genre-index/final-fantasy-6.json` | rewritten | Sourced Tier-2 batch E1 lineage row for the 1994 Final Fantasy VI design using Pixel Remaster RPG evidence. |
| `docs/reference-games/genre-index/super-smash-bros-64.json` | rewritten | Sourced Tier-2 batch E1 lineage row for 1999 Super Smash Bros. using Nintendo VC Fighting evidence through the fighting→action alias. |
| `docs/reference-games/genre-index/goldeneye-007.json` | rewritten | Sourced Tier-2 batch E1 lineage row for 1997 GoldenEye 007 using the faithful Xbox re-release's Action & adventure/Shooter evidence. |
| `docs/reference-games/genre-index/mortal-kombat-1992.json` | rewritten | Sourced Tier-2 batch E1 lineage row for the 1992 Mortal Kombat arcade design using GOG Action/Arcade/Fighting evidence. |
| `docs/reference-games/genre-index/prince-of-persia-1989.json` | rewritten | Sourced Tier-2 batch E1 lineage row for the 1989 Prince of Persia design using Nintendo VC Action/Adventure evidence. |
## Classics wave batch E2 (2026-07-13) — point-and-click / strategy roots / immersive-sim / arcade / sports

Ten sourced Tier-2 rows under ratified taxonomy v1 + classics evidence doctrine
(README ratifications). Live Steam GENRE fields (or Nintendo eShop for Space Invaders
Invincible Collection). Memberships subset of fetched storefront strings under current
validator (no alias table). Disposition `rewritten` for new paths (ledger convention).
Drops: space-invaders (E2-01: Shooting-only genre). Reserves used: quake-3-arena. Mechanical ledger rows only.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/genre-index/secret-of-monkey-island.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1990 point-and-click; Steam SE Adventure. |
| `docs/reference-games/genre-index/x-com-ufo-defense.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1994 tactical strategy root; Steam Strategy. |
| `docs/reference-games/genre-index/command-and-conquer.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1995 RTS root; Remastered Collection Strategy. |
| `docs/reference-games/genre-index/system-shock-2.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1999 immersive-sim; Steam Action/RPG. |
| `docs/reference-games/genre-index/unreal-tournament-99.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1999 arena FPS; Steam UT GOTY Action. |
| `docs/reference-games/genre-index/rollercoaster-tycoon.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1999 management sim; Steam Deluxe Simulation/Strategy. |
| `docs/reference-games/genre-index/tony-hawk-pro-skater.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1999 extreme sports; THPS 1+2 Sports. |
| `docs/reference-games/genre-index/space-invaders.json` | culled | E2-01: cited Invincible Collection product node genre is Shooting-only; Shooting ∉ market vocab; replaced by quake-3-arena. |
| `docs/reference-games/genre-index/quake-3-arena.json` | rewritten | E2-01 reserve swap for space-invaders; 1999 arena FPS; Steam app 2200 Action (verified). |
| `docs/reference-games/genre-index/wolfenstein-3d.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1992 FPS root; Steam Action. |
| `docs/reference-games/genre-index/worms-armageddon.json` | rewritten | Sourced Tier-2 classics batch E2 row; 1999 turn-based multiplayer; Steam Strategy. |

## Housekeeping follow-up (2026-07-14) — durability promotion

Shane approved the housekeeping/legibility proposals; the standing Tier-2
expansion contract was promoted out of `.scratch/orchestrate/fue/` (untracked
run ephemera) into docs/ for git durability. Content unchanged apart from the
provenance header; the `.scratch` copy is frozen with a pointer.

| path | disposition | rationale |
| --- | --- | --- |
| `docs/reference-games/EXPANSION-DISPOSITION.md` | rewritten | Standing two-tier expansion contract (trinity council 2026-07-12) promoted from untracked .scratch for durability; Shane-approved 2026-07-14. |
