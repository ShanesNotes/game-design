// Shared argv parsing for the factory CLIs. Every script reads `--name value`
// options, boolean `--flag`s, and (rarely) repeatable options the same way;
// before this module each script re-implemented the same three helpers inline.
const argv = process.argv.slice(2);

export function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
}

export function multi(name) {
  const out = [];
  argv.forEach((a, i) => { if (a === `--${name}`) out.push(argv[i + 1]); });
  return out;
}

export function hasFlag(name) {
  return argv.includes(`--${name}`);
}
