// All scheduled jobs for the app live here. Cadence matters: the reap jobs
// assume they run often enough that each batch stays under Convex's
// per-mutation transaction limits, and each reaper self-reschedules via
// scheduler.runAfter(0, ...) when a batch fills. Functions listed here are
// defined in their home modules (sessions, kickTokens, reap) and only
// registered by this file.

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

crons.interval(
  "reap stale watch sessions",
  { minutes: 2 },
  internal.sessions.reapStale,
);

crons.interval(
  "rotate Kick user tokens nearing expiry",
  { hours: 1 },
  internal.kickTokens.rotateExpiring,
);

crons.interval(
  "reap expired pendingOauth",
  { hours: 1 },
  internal.reap.reapExpiredOauth,
);

crons.interval(
  "reap old sessionTokens",
  { hours: 6 },
  internal.reap.reapOldSessionTokens,
);

crons.interval(
  "reap old dailyUsage",
  { hours: 24 },
  internal.reap.reapOldDailyUsage,
);

crons.interval(
  "reap old telemetry",
  { hours: 24 },
  internal.reap.reapOldTelemetry,
);

/** Retention sweeps self-reschedule via scheduler.runAfter(0,...) after a 500-row batch to stay within per-mutation transaction limits. */
export default crons;
