import { mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { optionalUser } from "./auth.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import { now as nowMs } from "./lib/time.js";

/** Public telemetry sink; accepts anonymous callers so pre-session boot errors surface. Rate-limited per user or "anon", and clamps client timestamps to prevent clock-skew poisoning of the by_at index. */
export const log = mutation({
  args: {
    events: v.array(
      v.object({
        kind: v.string(),
        at: v.number(),
        detail: v.optional(v.any()),
      }),
    ),
    extensionVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.events.length === 0) return { accepted: 0 };
    if (args.events.length > 100) {
      args.events = args.events.slice(0, 100);
    }

    const user = await optionalUser(ctx);
    const rateKey = user?._id ?? "anon";
    const result = await rateLimiter.limit(ctx, "telemetry", { key: rateKey });
    if (!result.ok) return { accepted: 0, rateLimited: true };

    const serverNow = nowMs();
    for (const e of args.events) {
      const at = Math.min(
        serverNow,
        Math.max(serverNow - 7 * 24 * 3600 * 1000, e.at),
      );
      await ctx.db.insert("telemetry", {
        userId: user?._id,
        kind: e.kind.slice(0, 64),
        at,
        extensionVersion: args.extensionVersion?.slice(0, 32),
        detail: e.detail,
      });
    }
    return { accepted: args.events.length };
  },
});
