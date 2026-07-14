# Hooks & Guardrails

These are policy hooks first and executable scripts second. The included scripts are starter guards; agents may harden them but may not remove them without ADR. Since the spec-pack pivot (ADR 0006) the 11 guards are split: **3 factory hooks** stay live in this repo (`factory.config.toml` `[hooks]`, executables in `hooks/`), and **8 build-time guards** ship inside every exported spec pack (`factory.config.toml` `[spec_pack.guards]`, executables in `templates/spec-pack/guards/`) to enforce doctrine downstream in the co-dev repo. Every guard is registered in `scripts/lib/factory-contract.mjs` and ships an executable (no policy-only entries); `run-gates` proves all 11 — 36 scenarios — and fails if any registered guard lacks a proof scenario.

Shared plumbing (the opaque-asset pattern, the evidence walker, argv/block/allow) lives in `hooks/lib/guard.mjs`. The copy shipped at `templates/spec-pack/guards/lib/guard.mjs` must stay **byte-identical** to `hooks/lib/guard.mjs` — this is validator-enforced — so each guard carries only its rule and runs identically in a co-dev repo or the gate sandbox.

## Factory hooks (`hooks/`)

| Guard | Trigger | Block condition |
|---|---|---|
| `scope_brake` | pre-edit / pre-commit | Game code in the factory (`src`/`assets`/`packs`/`server`/`app`); enforcement proof: `tests/factory.test.mjs` → `run-gates --dry-run proves all guards gate`. |
| `engine_migration_requires_adr` | pre-edit config | Engine/library migration without decision file. |
| `mcp_mutation_must_emit_text` | post-MCP | MCP/editor mutation that emits opaque output with no diffable artifact alongside it. |

## Shipped pack guards (`templates/spec-pack/guards/`)

| Guard | Trigger | Block condition |
|---|---|---|
| `art_fidelity_cap` | pre-edit assets | Opaque/high-fidelity asset before G1+G2. |
| `asset_provenance` | pre-edit assets | Opaque asset without prompt/seed/model/version recipe. |
| `phaser_version_pin` | pre-edit/package scan | Phaser project uses unpinned/stale major or v3-only API pattern. |
| `playtest_report_required` | turn-stop / merge | Gameplay change without `playtests/**/playtest_report.json`. |
| `afk_heartbeat_required` | routine | Nightly/long run without 300s bot + falsifier report. |
| `no_content_before_fun_lock` | pre-edit content | Content/level/narrative authoring before `.factory/FUN_LOCK`. Narrative-first packs (`guards/guard-config.json`, ADR 0007) are allowed pre-fun-lock content once playtest evidence exists. |
| `minimum_bot_session_gate` | turn-stop / merge | No playtest session reaches the 60s minimum (`gates.minimum_bot_session_seconds`). |
| `two_bot_spread_gate` | depth review / merge | Fewer than 2 distinct `bot_type` playtests (anti-boring Two-Bot test). |

## Hook enforcement philosophy

Warnings are not enough. A guard that protects against sunk-cost, visual-wow, or wrote-it-never-played-it must block the turn/merge. A guard declared in `factory.config.toml` must be an executable (in `hooks/` or `templates/spec-pack/guards/`), or its claim of enforcement is a lie the factory tells itself. The shipped guards reference fun-lock and playtest evidence deliberately: those gates fire in the co-dev repo, where the game is actually built.
