// One finder seam over canonical asset_requests (spec-decomposition schema).
// Hides request→query rules, finder discovery, subprocess argv, JSONL parse,
// and error semantics so recommend-assets and probe-spec-availability cannot drift.
//
// Exact {pack_id, name} stays exact and is tried first (forge resolve preference).
// Production adapter: find_assets.py subprocess. Test adapter: in-memory handler.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveAssetsRoot } from "./studio-paths.mjs";

export const ASSET_INDEXES = [
  "packs", "tags", "atlases", "models", "normalized", "retarget",
  "animations", "audio", "ui", "icons"
];

/** Specialized match-array field names used by find_assets / probe (kind → field). */
export const MATCH_FIELD = {
  sprite: "sprite_matches",
  model: "model_matches",
  animation: "animation_matches",
  audio: "audio_matches"
};

const SPECIALIZED_FIELDS = Object.values(MATCH_FIELD);

/**
 * Ordered free-text queries for a canonical asset request.
 * Exact {pack_id, name} is authoritative and first; free-text query is secondary.
 */
export function queriesForRequest(request) {
  if (!request || typeof request !== "object") return [];
  const pack = typeof request.pack_id === "string" ? request.pack_id.trim() : "";
  const name = typeof request.name === "string" ? request.name.trim() : "";
  const query = typeof request.query === "string" ? request.query.trim() : "";
  const exactPair = pack && name ? `${pack} ${name}` : "";
  const fallback = query || [pack, name].filter(Boolean).join(" ");
  return [...new Set([exactPair, fallback].filter(Boolean))];
}

/** Display / logging label for a request (first query candidate). */
export function requestLabel(request) {
  const qs = queriesForRequest(request);
  return qs[0] || "";
}

/**
 * Parse finder JSONL stdout into row objects.
 * Throws on any non-blank unparseable line (malformed stdout is not silent zero).
 */
export function parseFinderJsonl(stdout) {
  const rows = [];
  for (const line of String(stdout || "").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (err) {
      throw new Error(err.message || "JSON parse failed");
    }
  }
  return rows;
}

/**
 * Classify a single finder invocation result.
 * @returns {{ status: 'matches'|'no_match'|'error', rows: object[], note?: string, stderr?: string }}
 */
export function classifyFinderResult({ status, stdout, stderr, error }) {
  if (error) {
    return {
      status: "error",
      rows: [],
      note: `finder error: ${error.message || "spawn error"}`,
      stderr: stderr || ""
    };
  }
  let rows;
  try {
    rows = parseFinderJsonl(stdout);
  } catch (err) {
    return {
      status: "error",
      rows: [],
      note: `invalid finder JSONL (${err.message})`,
      stderr: stderr || ""
    };
  }
  if (status === 1 && rows.length === 1 && rows[0].no_match === true) {
    return { status: "no_match", rows: [], note: "no_match" };
  }
  if (status !== 0) {
    const detail = String(stderr || "").trim() || `finder exit ${status}`;
    return { status: "error", rows: [], note: detail, stderr: stderr || "" };
  }
  const matches = rows.filter((row) => row && row.no_match !== true && row.pack_id != null);
  if (!matches.length) {
    // empty success or only no_match rows
    if (rows.some((row) => row && row.no_match === true)) {
      return { status: "no_match", rows: [], note: "no_match" };
    }
    return { status: "matches", rows: [] };
  }
  return { status: "matches", rows: matches };
}

/** True when any row carries a specialized *_matches array (probe-shaped results). */
export function hasSpecializedMatches(rows) {
  return (rows || []).some(
    (row) => row && SPECIALIZED_FIELDS.some((f) => Array.isArray(row[f]))
  );
}

/**
 * Count hits for a requested kind. When rows are specialized, only the kind's
 * match array counts; pack-level shopping rows (no *_matches) count as one hit
 * per row when kind is absent or rows are non-specialized.
 */
export function kindHitCount(rows, kind) {
  const list = rows || [];
  const field = kind ? MATCH_FIELD[kind] : null;
  if (field && hasSpecializedMatches(list)) {
    return list.reduce(
      (total, row) => total + (Array.isArray(row[field]) ? row[field].length : 0),
      0
    );
  }
  return list.length;
}

/**
 * Resolve default find_assets argv prefix: ["python3", "/path/to/find_assets.py"].
 * RECOMMEND_FINDER_CMD / ASSET_FINDER_CMD env overrides (space-separated or JSON array).
 * Returns null when neither override nor assets root is available.
 */
export function resolveFinderCmd(startDir = process.cwd(), env = process.env) {
  const override = env.ASSET_FINDER_CMD || env.RECOMMEND_FINDER_CMD;
  if (override && String(override).trim()) {
    const trimmed = String(override).trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr;
      } catch {
        // fall through to whitespace split
      }
    }
    return trimmed.split(/\s+/);
  }
  const assetsRoot = resolveAssetsRoot(startDir);
  if (!assetsRoot) return null;
  const finder = path.join(assetsRoot, "_tools", "find_assets.py");
  return ["python3", finder];
}

/**
 * Production adapter: shells out to find_assets (or RECOMMEND_FINDER_CMD override).
 * When assetsRoot is known and cmd is the real finder (not an env override),
 * passes explicit index paths so GAME_ASSETS_ROOT fixtures work.
 */
export function createSubprocessAdapter({
  finderCmd = null,
  assetsRoot = null,
  env = process.env,
  startDir = process.cwd()
} = {}) {
  const override = Boolean(env.ASSET_FINDER_CMD || env.RECOMMEND_FINDER_CMD);
  const cmd = finderCmd || resolveFinderCmd(startDir, env);
  const root = assetsRoot || resolveAssetsRoot(startDir);

  return {
    kind: "subprocess",
    available() {
      return Boolean(cmd && cmd.length);
    },
    /**
     * @param {{ query: string, limit?: number, checkLocal?: boolean }} opts
     */
    run({ query, limit = 10, checkLocal = false }) {
      if (!cmd || !cmd.length) {
        return {
          status: null,
          stdout: "",
          stderr: "",
          error: new Error("assets root / finder unavailable")
        };
      }
      if (!query) {
        return { status: 0, stdout: "", stderr: "", error: null, emptyQuery: true };
      }
      const args = [...cmd.slice(1), "find", query];
      // Env-overridden stubs (tests) only accept the short shopping argv.
      if (!override && root) {
        const indexes = path.join(root, "_indexes");
        for (const name of ASSET_INDEXES) {
          args.push(`--${name}`, path.join(indexes, `${name}.jsonl`));
        }
        args.push("--source-root", root);
      }
      args.push("--limit", String(limit));
      if (checkLocal) args.push("--check-local");

      try {
        const proc = spawnSync(cmd[0], args, {
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
          env: process.env
        });
        return {
          status: proc.status,
          stdout: proc.stdout || "",
          stderr: proc.stderr || "",
          error: proc.error || null
        };
      } catch (err) {
        return {
          status: null,
          stdout: "",
          stderr: "",
          error: err
        };
      }
    }
  };
}

/**
 * In-memory test adapter. handler({ query, limit, checkLocal }) returns either
 * raw { status, stdout, stderr? } or structured { status: 'matches'|'no_match'|'error', rows, note? }.
 */
export function createMemoryAdapter(handler) {
  return {
    kind: "memory",
    available() {
      return typeof handler === "function";
    },
    run(opts) {
      const out = handler(opts);
      if (out && Array.isArray(out.rows)) {
        // structured short-circuit: synthesize stdout for classify path
        if (out.status === "no_match") {
          return {
            status: 1,
            stdout: JSON.stringify({ no_match: true, query: opts.query, nearest: [] }) + "\n",
            stderr: "",
            error: null
          };
        }
        if (out.status === "error") {
          return {
            status: 2,
            stdout: "",
            stderr: out.note || "finder error",
            error: null
          };
        }
        const stdout = (out.rows || []).map((r) => JSON.stringify(r)).join("\n") + (out.rows?.length ? "\n" : "");
        return { status: 0, stdout, stderr: "", error: null };
      }
      return {
        status: out?.status ?? 0,
        stdout: out?.stdout ?? "",
        stderr: out?.stderr ?? "",
        error: out?.error ?? null
      };
    }
  };
}

/**
 * Run the finder for one free-text query through an adapter.
 */
export function queryViaAdapter(adapter, query, { limit = 10, checkLocal = false } = {}) {
  if (!adapter || !adapter.available()) {
    return { status: "error", rows: [], note: "assets root / finder unavailable", query };
  }
  if (!query) {
    return { status: "error", rows: [], note: "empty request text", query: "" };
  }
  const raw = adapter.run({ query, limit, checkLocal });
  if (raw.emptyQuery) {
    return { status: "error", rows: [], note: "empty request text", query: "" };
  }
  const classified = classifyFinderResult(raw);
  return { ...classified, query };
}

/**
 * Resolve a canonical asset request: try exact pair first, then fallbacks.
 * Returns structured matches or a structured refusal (never throws on finder miss).
 *
 * @returns {{
 *   status: 'matches'|'no_match'|'error'|'empty',
 *   query: string,
 *   rows: object[],
 *   note?: string,
 *   stderr?: string
 * }}
 */
export function findForRequest(adapter, request, { limit = 10, checkLocal = false } = {}) {
  const queries = queriesForRequest(request);
  if (!queries.length) {
    return { status: "empty", query: "", rows: [], note: "empty request text" };
  }
  if (!adapter || !adapter.available()) {
    return {
      status: "error",
      query: queries[0],
      rows: [],
      note: "assets root / finder unavailable"
    };
  }
  let last = null;
  for (const query of queries) {
    last = queryViaAdapter(adapter, query, { limit, checkLocal });
    // Accept only when the result has hits of the REQUESTED KIND (BASE probe
    // semantics). Kind-mismatched specialized rows fall through to free-text.
    if (last.status === "matches" && kindHitCount(last.rows, request.kind) > 0) {
      return last;
    }
  }
  // Prefer last attempt's classification; keep primary query label for notes.
  return { ...last, query: last?.query || queries[0] };
}
