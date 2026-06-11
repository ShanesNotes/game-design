// Accessors for the deliberately tiny YAML front-matter subset used by local
// issue files (docs/agents/issue-tracker.md): single-line scalars and two-space
// `- item` lists only. The renderer (emit-local-issues.mjs) and the validator
// (validate-artifacts.mjs checkIssueDir) must read the format identically, so
// the accessors live here rather than in either caller.
export function frontMatterAccessors(front) {
  const field = (k) => {
    const m = front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : null;
  };
  const hasKey = (k) => new RegExp(`^${k}:\\s*$`, "m").test(front) || field(k) !== null;
  const listItems = (k) => {
    const m = front.match(new RegExp(`^${k}:\\s*\\n((?:  - .+\\n?)*)`, "m"));
    return m ? m[1].split("\n").filter((line) => line.trim().startsWith("- ")).map((line) => line.trim().slice(2)) : [];
  };
  return { field, hasKey, listItems };
}
