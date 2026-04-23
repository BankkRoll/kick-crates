// TTL sweeps for transient tables. Each reaper deletes up to REAP_BATCH_SIZE
// rows and reschedules itself via ctx.scheduler when the batch saturates,
// keeping every transaction under Convex's 8192-op limit. Driven by cron,
// not user traffic. xpEvents and crateOpens are intentionally never reaped —
// they are the audit trail for XP and reward grants.
import { internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { now as nowMs } from "./lib/time.js";
import {
  DAILY_USAGE_RETENTION_DAYS,
  REAP_BATCH_SIZE,
  SESSION_TOKEN_RETENTION_DAYS,
  TELEMETRY_RETENTION_DAYS,
} from "./lib/constants.js";

/** TTL sweep for pendingOauth; self-reschedules when batch saturates to stay under the 8192-op transaction limit. */
export const reapExpiredOauth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = nowMs();
    const expired = await ctx.db
      .query("pendingOauth")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(REAP_BATCH_SIZE);
    for (const row of expired) {
      await ctx.db.delete(row._id);
    }
    if (expired.length === REAP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.reap.reapExpiredOauth, {});
    }
    return { deleted: expired.length };
  },
});

/** TTL sweep for sessionTokens; self-reschedules when batch saturates to stay under the 8192-op transaction limit. */
export const reapOldSessionTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = nowMs() - SESSION_TOKEN_RETENTION_DAYS * 24 * 3600 * 1000;
    const stale = await ctx.db
      .query("sessionTokens")
      .withIndex("by_expires", (q) => q.lt("expiresAt", cutoff))
      .take(REAP_BATCH_SIZE);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    if (stale.length === REAP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.reap.reapOldSessionTokens, {});
    }
    return { deleted: stale.length };
  },
});

/** TTL sweep for dailyUsage; self-reschedules when batch saturates to stay under the 8192-op transaction limit. */
export const reapOldDailyUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = nowMs() - DAILY_USAGE_RETENTION_DAYS * 24 * 3600 * 1000;
    const stale = await ctx.db
      .query("dailyUsage")
      .withIndex("by_updated", (q) => q.lt("updatedAt", cutoff))
      .take(REAP_BATCH_SIZE);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    if (stale.length === REAP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.reap.reapOldDailyUsage, {});
    }
    return { deleted: stale.length };
  },
});

/** TTL sweep for telemetry; self-reschedules when batch saturates. xpEvents and crateOpens are deliberately not reaped (audit logs). */
export const reapOldTelemetry = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = nowMs() - TELEMETRY_RETENTION_DAYS * 24 * 3600 * 1000;
    const stale = await ctx.db
      .query("telemetry")
      .withIndex("by_at", (q) => q.lt("at", cutoff))
      .take(REAP_BATCH_SIZE);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    if (stale.length === REAP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.reap.reapOldTelemetry, {});
    }
    return { deleted: stale.length };
  },
});

