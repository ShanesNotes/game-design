// Reference-card schema + validate-reference-cards.mjs (canon membership + index).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib/validate-json-schema.mjs";
import { validateReferenceCards } from "../scripts/validate-reference-cards.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgf-ref-cards-"));
}

function loadSchema() {
  return JSON.parse(fs.readFileSync(rel("schemas/reference-card.schema.json"), "utf8"));
}

function validCard(overrides = {}) {
  return {
    schema_version: "1.0.0",
    id: "phantom-garden",
    title: "Phantom Garden (FIXTURE)",
    edition_pinned: "v0-fixture — test card",
    genre_tags: ["fixture"],
    register_mapping: "mechanics-first",
    moat: "Water rewrites adjacency so routes cannot reuse the first path.",
    loop_skeleton: {
      verbs: ["plant", "water", "rotate"],
      description: "Plant, water to rewrite edges, rotate for light."
    },
    depth_mechanisms: [
      {
        name: "adjacency rewrite",
        mechanism: "Water swaps edge sets between tiles.",
        falsifiable_claim: "Without water-order planning, clear rates stay flat."
      },
      {
        name: "wilt clock",
        mechanism: "Unlit plants wilt out in three ticks.",
        falsifiable_claim: "Removing wilt drops solve time over 30%."
      }
    ],
    feel_signature: "Irreversible adjacency edits; failure is a dark bed.",
    second_session_answer: "Return to re-route through water scars.",
    packaging_lessons: ["Ship one bed before meta layers."],
    anti_lessons: ["Do not add XP to hide adjacency mistakes."],
    system_bom: [
      { system: "play-loop", note: "core cycle" },
      { system: "win-loss-death", note: "wilt ends run" },
      { system: "save-state", note: "adjacency persists" }
    ],
    citations: [
      { claim: "Synthetic fixture.", source: "test" }
    ],
    status: "draft",
    ...overrides
  };
}

function setupTree(dir, { cards = [], canon = "" } = {}) {
  const cardsDir = path.join(dir, "cards");
  const canonPath = path.join(dir, "CANON.md");
  const indexPath = path.join(dir, "index.jsonl");
  fs.mkdirSync(cardsDir, { recursive: true });
  for (const card of cards) {
    fs.writeFileSync(path.join(cardsDir, `${card.id}.json`), JSON.stringify(card, null, 2) + "\n");
  }
  fs.writeFileSync(canonPath, canon);
  return {
    cardsDir,
    canonPath,
    indexPath,
    schemaPath: rel("schemas/reference-card.schema.json")
  };
}

test("valid reference card passes schema", () => {
  const errs = validate(loadSchema(), validCard());
  assert.deepEqual(errs, []);
});

test("repo fixture card validates against schema", () => {
  const card = JSON.parse(fs.readFileSync(rel("docs/reference-games/cards/_example.json"), "utf8"));
  assert.deepEqual(validate(loadSchema(), card), []);
});

test("schema-invalid card fails", () => {
  const bad = validCard({ genre_tags: [] }); // minItems: 1
  const errs = validate(loadSchema(), bad);
  assert.ok(errs.some((e) => /minItems|genre_tags/.test(e)), errs.join("\n"));

  const dir = tmp();
  try {
    const paths = setupTree(dir, {
      cards: [bad],
      canon: "| phantom-garden |\n"
    });
    const { errors } = validateReferenceCards(paths);
    assert.ok(errors.length > 0);
    assert.ok(errors.some((e) => /minItems|genre_tags|schema/.test(e) || /\$\.genre_tags/.test(e)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("card absent from canon fails", () => {
  const dir = tmp();
  try {
    const paths = setupTree(dir, {
      cards: [validCard({ id: "missing-from-canon" })],
      canon: "<!-- ratified 2026-07-12 -->\n| other-game | Other |\n"
    });
    const { errors } = validateReferenceCards(paths);
    assert.ok(errors.some((e) => /not listed in CANON/.test(e)), errors.join("\n"));
    assert.ok(!fs.existsSync(paths.indexPath), "index must not write on failure");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("filename must equal <id>.json for non-fixture cards", () => {
  const dir = tmp();
  try {
    const cardsDir = path.join(dir, "cards");
    const canonPath = path.join(dir, "CANON.md");
    const indexPath = path.join(dir, "index.jsonl");
    fs.mkdirSync(cardsDir, { recursive: true });
    const card = validCard({ id: "age-of-empires-2" });
    // Drift: body id does not match filename (README: cards/<id>.json).
    fs.writeFileSync(
      path.join(cardsDir, "wrong-name.json"),
      JSON.stringify(card, null, 2) + "\n"
    );
    fs.writeFileSync(
      canonPath,
      "| id | title |\n|----|-------|\n| age-of-empires-2 | Age of Empires II |\n"
    );
    const { errors } = validateReferenceCards({
      cardsDir,
      canonPath,
      indexPath,
      schemaPath: rel("schemas/reference-card.schema.json")
    });
    assert.ok(
      errors.some((e) => /filename must be 'age-of-empires-2\.json'/.test(e)),
      errors.join("\n")
    );
    assert.ok(!fs.existsSync(indexPath), "index must not write on failure");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CANON membership requires a data-row id column, not header/prose tokens", () => {
  const dir = tmp();
  try {
    // Card id "id" matches only the table header first column — no data row.
    const card = validCard({ id: "id", title: "Header Token" });
    const paths = setupTree(dir, {
      cards: [card],
      canon:
        "<!-- ratified -->\n" +
        "Prose mentioning id is not membership.\n" +
        "| id | title | notes |\n" +
        "|----|-------|-------|\n" +
        "| other-game | Other | real row |\n"
    });
    const { errors } = validateReferenceCards(paths);
    assert.ok(
      errors.some((e) => /not listed in CANON/.test(e)),
      "header/prose token must not count as membership:\n" + errors.join("\n")
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("valid card in canon writes deterministic index.jsonl", () => {
  const dir = tmp();
  try {
    const cardA = validCard({ id: "alpha-game", title: "Alpha" });
    const cardB = validCard({ id: "zeta-game", title: "Zeta" });
    const paths = setupTree(dir, {
      cards: [cardB, cardA], // write order B then A; index must sort by id
      canon: "| alpha-game | Alpha |\n| zeta-game | Zeta |\n"
    });
    const first = validateReferenceCards(paths);
    assert.deepEqual(first.errors, [], first.errors.join("\n"));
    const body1 = fs.readFileSync(paths.indexPath, "utf8");
    const second = validateReferenceCards(paths);
    assert.deepEqual(second.errors, []);
    const body2 = fs.readFileSync(paths.indexPath, "utf8");
    assert.equal(body1, body2, "index must be deterministic across runs");
    const rows = body1.trim().split("\n").map(JSON.parse);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, "alpha-game");
    assert.equal(rows[1].id, "zeta-game");
    assert.deepEqual(Object.keys(rows[0]), ["id", "title", "genre_tags", "register_mapping", "status"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI validates repo cards and refreshes index.jsonl", () => {
  const r = spawnSync(process.execPath, [rel("scripts/validate-reference-cards.mjs")], {
    encoding: "utf8",
    cwd: REPO
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(rel("docs/reference-games/index.jsonl")));
  const rows = fs.readFileSync(rel("docs/reference-games/index.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  assert.ok(rows.some((row) => row.id === "phantom-garden"));
});
