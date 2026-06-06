#!/usr/bin/env node
// Anti-boring evidence floor: a slice cannot claim a played loop on a trivially
// short session. Blocks unless a playtest report records a session of at least the
// minimum length. Mirrors factory.config.toml [gates] minimum_bot_session_seconds.
import { playtestReports, readJsonSafe, block, allow } from "./lib/guard.mjs";

const MIN_SECONDS = 60; // keep in sync with factory.config.toml minimum_bot_session_seconds
const longEnough = playtestReports().some((p) => {
  const r = readJsonSafe(p);
  return r && Number(r.duration_seconds) >= MIN_SECONDS;
});

if (!longEnough) block(`no playtest session reaches the ${MIN_SECONDS}s minimum bot session.`);
allow();
