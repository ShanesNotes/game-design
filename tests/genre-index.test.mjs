import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGenreIndex } from "../scripts/validate-genre-index.mjs";
import { critiqueGenreIndex } from "../scripts/genre-index-critic.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...parts) => path.join(REPO, ...parts);

function validRow(overrides = {}) {
  return {
    schema_version: "1.0.0",
    taxonomy_version: "1.0.0",
    id: "test-game",
    title: "Test Game",
    edition_pinned: "Test Game 1.0",
    design_shape: {
      register: { primary: "mechanics-first", secondary: [] },
      loop_class: { primary: "optimization", secondary: [] },
      session_structure: { primary: "runs", secondary: [] },
      progression_form: { primary: "run-reset", secondary: [] },
      player_count: { primary: "solo", secondary: [] }
    },
    market_genres: { primary: "strategy", secondary: ["puzzle"] },
    moat: "Visible threats force each turn to trade damage against position.",
    scope_efficiency_hypothesis: "A small ruleset recombines through state.",
    exemplar_rationale: "It exposes optimization through readable choices.",
    evidence: [
      {
        claim: "Steam reported 10000 all-language user reviews.",
        metric_type: "steam_user_reviews",
        value_or_range: 10000,
        class: "review-established",
        class_definition: "taxonomy-v1#steam-user-reviews/review-established",
        platform: "Steam",
        territory: "worldwide",
        observed_at: "2026-07-13",
        source: "https://store.steampowered.com/appreviews/1?json=1",
        source_tier: "primary-platform"
      },
      {
        claim: "Steam listed Strategy and Puzzle storefront genres.",
        metric_type: "storefront_genres",
        value_or_range: ["Strategy", "Puzzle"],
        class: "storefront-listed",
        class_definition: "taxonomy-v1#storefront-genres/storefront-listed",
        platform: "Steam",
        territory: "United States",
        observed_at: "2026-07-13",
        source: "https://store.steampowered.com/api/appdetails?appids=1&cc=us&l=en",
        source_tier: "primary-platform"
      }
    ],
    ...overrides
  };
}

function tempCorpus(rows, cards = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "genre-index-"));
  const rowsDir = path.join(root, "genre-index");
  const cardsDir = path.join(root, "cards");
  const indexPath = path.join(root, "genre-index.jsonl");
  fs.mkdirSync(rowsDir);
  fs.mkdirSync(cardsDir);
  for (const row of rows) {
    fs.writeFileSync(path.join(rowsDir, `${row.id}.json`), JSON.stringify(row));
  }
  for (const card of cards) {
    fs.writeFileSync(path.join(cardsDir, `${card.id}.json`), JSON.stringify(card));
  }
  return { root, rowsDir, cardsDir, indexPath, schemaPath: rel("schemas/genre-index-row.schema.json") };
}

test("valid genre-index row writes a deterministic grep summary", () => {
  const paths = tempCorpus([validRow()]);
  try {
    const first = validateGenreIndex(paths);
    assert.deepEqual(first.errors, []);
    const body = fs.readFileSync(paths.indexPath, "utf8");
    const second = validateGenreIndex(paths);
    assert.deepEqual(second.errors, []);
    assert.equal(fs.readFileSync(paths.indexPath, "utf8"), body);
    const summary = JSON.parse(body);
    assert.deepEqual(Object.keys(summary), [
      "id", "title", "register", "loop_class", "session_structure",
      "progression_form", "player_count", "market_genres"
    ]);
    assert.deepEqual(summary.market_genres, ["strategy", "puzzle"]);
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("a row may omit Steam reviews when storefront genre evidence is present", () => {
  const row = validRow();
  row.evidence = row.evidence.filter((item) => item.metric_type !== "steam_user_reviews");
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.deepEqual(errors, []);
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("present Steam review evidence still uses taxonomy-derived classes", () => {
  const row = validRow();
  row.evidence[0].class = "review-breakout";
  row.evidence[0].class_definition = "taxonomy-v1#steam-user-reviews/review-breakout";
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((error) => /expected class 'review-established'/.test(error)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("every row still requires storefront genre evidence", () => {
  const row = validRow();
  row.evidence = row.evidence.filter((item) => item.metric_type !== "storefront_genres");
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((error) => /must include storefront_genres evidence/.test(error)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("archived Role-Playing storefront evidence supports rpg membership", () => {
  const row = validRow({ market_genres: { primary: "rpg", secondary: [] } });
  row.evidence[1].value_or_range = ["Role-Playing"];
  row.evidence[1].platform = "Nintendo Store (archived 3DS Virtual Console)";
  row.evidence[1].source =
    "https://web.archive.org/web/20170104032221/http://www.nintendo.com/games/detail/pokemon-red-version-3ds";
  row.evidence[1].source_tier = "archival-secondary";
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.deepEqual(errors, []);
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("explicit fetched storefront aliases support frozen action membership", () => {
  for (const fetchedGenre of ["Action & Adventure", "FIGHTING"]) {
    const row = validRow({ market_genres: { primary: "action", secondary: [] } });
    row.evidence[1].value_or_range = [fetchedGenre];
    const paths = tempCorpus([row]);
    try {
      const { errors } = validateGenreIndex(paths);
      assert.deepEqual(errors, [], fetchedGenre);
    } finally {
      fs.rmSync(paths.root, { recursive: true, force: true });
    }
  }
});

test("an unaliased storefront genre still fails market membership validation", () => {
  const row = validRow({ market_genres: { primary: "rpg", secondary: [] } });
  row.evidence[1].value_or_range = ["Roleplaying"];
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((error) => /market genre 'rpg'.*absent/.test(error)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("storefront genre aliases require an exact case-insensitive match", () => {
  const row = validRow({ market_genres: { primary: "rpg", secondary: [] } });
  row.evidence[1].value_or_range = ["role-playing games"];
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((error) => /market genre 'rpg'.*absent/.test(error)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("semantic checks enforce membership uniqueness, moat length, and evidence classes", () => {
  const row = validRow({ moat: "x".repeat(121) });
  row.design_shape.loop_class.secondary = ["optimization", "optimization"];
  row.evidence[0].class = "review-breakout";
  row.evidence[0].class_definition = "taxonomy-v1#steam-user-reviews/review-breakout";
  row.evidence[1].value_or_range = ["Strategy"];
  const paths = tempCorpus([row]);
  try {
    fs.writeFileSync(paths.indexPath, "sentinel\n");
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((e) => /moat.*120/.test(e)), errors.join("\n"));
    assert.ok(errors.some((e) => /loop_class.*primary.*secondary/.test(e)), errors.join("\n"));
    assert.ok(errors.some((e) => /loop_class.*duplicate/.test(e)), errors.join("\n"));
    assert.ok(errors.some((e) => /expected class 'review-established'/.test(e)), errors.join("\n"));
    assert.ok(errors.some((e) => /market genre 'puzzle'.*absent/.test(e)), errors.join("\n"));
    assert.equal(fs.readFileSync(paths.indexPath, "utf8"), "sentinel\n");
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("card_ref must resolve to the same Tier-1 card id", () => {
  const paths = tempCorpus([validRow({ card_ref: "missing-card" })]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((e) => /card_ref.*does not resolve/.test(e)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("card_ref cannot point at a different game's existing Tier-1 card", () => {
  const paths = tempCorpus(
    [validRow({ card_ref: "other-game" })],
    [{ id: "other-game", title: "Other Game" }]
  );
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((e) => /card_ref must equal row id/.test(e)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("critic flags facet floors and missing cross-genre representation deterministically", () => {
  const rows = [
    validRow({
      id: "alpha",
      title: "Alpha",
      design_shape: {
        ...validRow().design_shape,
        loop_class: { primary: "optimization", secondary: ["discovery"] }
      },
      market_genres: { primary: "strategy", secondary: [] }
    }),
    validRow({ id: "beta", title: "Beta", market_genres: { primary: "strategy", secondary: [] } })
  ];
  const first = critiqueGenreIndex(rows);
  const second = critiqueGenreIndex(rows);
  assert.equal(first.report, second.report);
  assert.ok(first.findings.some((f) => /floor 2 < 3/.test(f)), first.report);
  assert.ok(first.findings.some((f) => /hybrid market genres 1 < 2/.test(f)), first.report);
});

test("production evidence cannot classify a zero-person team", () => {
  const row = validRow({
    production_scale_evidence: [{
      claim: "A source reported a zero-person team.",
      metric_type: "development_team_size",
      value_or_range: 0,
      class: "team-micro",
      class_definition: "taxonomy-v1#development-team-size/team-micro",
      platform: "Developer postmortem",
      territory: "worldwide",
      observed_at: "2026-07-13",
      source: "https://example.com/postmortem",
      source_tier: "primary-developer"
    }]
  });
  const paths = tempCorpus([row]);
  try {
    const { errors } = validateGenreIndex(paths);
    assert.ok(errors.some((e) => /cannot be classified/.test(e)), errors.join("\n"));
  } finally {
    fs.rmSync(paths.root, { recursive: true, force: true });
  }
});

test("critic passes three-row facet coverage spanning two market genres", () => {
  const rows = [
    validRow({ id: "alpha", title: "Alpha", market_genres: { primary: "strategy", secondary: [] } }),
    validRow({ id: "beta", title: "Beta", market_genres: { primary: "puzzle", secondary: [] } }),
    validRow({ id: "gamma", title: "Gamma", market_genres: { primary: "strategy", secondary: [] } })
  ];
  const result = critiqueGenreIndex(rows);
  assert.deepEqual(result.findings, [], result.report);
  assert.match(result.report, /RESULT CLEAN/);
});

test("critic rejects an empty corpus", () => {
  const result = critiqueGenreIndex([]);
  assert.ok(result.findings.some((f) => /empty corpus/.test(f)), result.report);
});

test("repo pilot validates, generates 20 rows, and demonstrates Tier-1 navigation", () => {
  const result = validateGenreIndex({
    rowsDir: rel("docs/reference-games/genre-index"),
    indexPath: rel("docs/reference-games/genre-index.jsonl"),
    schemaPath: rel("schemas/genre-index-row.schema.json"),
    cardsDir: rel("docs/reference-games/cards"),
    today: "2026-07-13"
  });
  assert.deepEqual(result.errors, [], result.errors.join("\n"));
  assert.ok(result.rows.length >= 20, result.rows.length);
  assert.ok(result.rows.filter((row) => row.card_ref).length >= 4);
  assert.equal(new Set(result.rows.map((row) => row.id)).size, result.rows.length);
});

test("repo critic has deterministic clean CLI output", () => {
  const run = () => spawnSync(process.execPath, [rel("scripts/genre-index-critic.mjs")], {
    cwd: REPO,
    encoding: "utf8"
  });
  const first = run();
  const second = run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.match(first.stdout, /RESULT CLEAN/);
});
