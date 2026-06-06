# Hooks & Guardrails

These are policy hooks first and executable scripts second. The included scripts are starter guards; agents may harden them but may not remove them without ADR. Every guard listed here is registered in `scripts/lib/factory-contract.mjs` (`HOOKS`) and ships an executable in `hooks/`; `run-gates` fails if any registered guard lacks a proof scenario. Shared plumbing (the opaque-asset pattern, the playtests walker, argv/block/allow) lives in `hooks/lib/guard.mjs`, so each guard carries only its rule and stays portable to a child game repo.

| Guard | Trigger | Block condition |
|---|---|---|
| `scope_brake` | pre-edit / pre-commit | Feature outside current `GAME_THESIS.md` first-slice scope (`src`/`assets`/`packs`/`server`/`app`). |
| `art_fidelity_cap` | pre-edit assets | Opaque/high-fidelity asset before G1+G2. |
| `asset_provenance` | pre-edit assets | Opaque asset without prompt/seed/model/version recipe. |
| `mcp_mutation_must_emit_text` | post-MCP | MCP/editor mutation that emits opaque output with no diffable artifact alongside it. |
| `engine_migration_requires_adr` | pre-edit config | Engine/library migration without decision file. |
| `phaser_version_pin` | pre-edit/package scan | Phaser lane uses unpinned/stale major or v3-only API pattern. |
| `playtest_report_required` | turn-stop / merge | Gameplay change without `playtests/**/playtest_report.json`. |
| `afk_heartbeat_required` | routine | Nightly/long run without 300s bot + falsifier report. |
| `no_content_before_fun_lock` | pre-edit content | Content/level/narrative authoring before `.factory/FUN_LOCK`. |
| `minimum_bot_session_gate` | turn-stop / merge | No playtest session reaches the 60s minimum (`gates.minimum_bot_session_seconds`). |
| `two_bot_spread_gate` | depth-review / merge | Fewer than 2 distinct `bot_type` playtests (anti-boring Two-Bot test). |

## Hook enforcement philosophy

Warnings are not enough. A guard that protects against sunk-cost, visual-wow, or wrote-it-never-played-it must block the turn/merge. A guard declared in `factory.config.toml` must be an executable in `hooks/` (no policy-only entries), or its claim of enforcement is a lie the factory tells itself.
