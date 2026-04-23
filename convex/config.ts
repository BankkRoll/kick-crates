import { query, internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import {
  MIN_EXTENSION_VERSION_FLAG_KEY,
  ENABLED_FEATURES_FLAG_KEY,
} from "./lib/constants.js";

type FeatureFlags = Record<string, boolean>;

/** Client bootstrap payload: min extension version, feature flags, active season, and server time. */
export const clientConfig = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("configFlags").collect();
    const byKey = new Map(rows.map((r) => [r.key, r.value] as const));
    const minExtVersion = typeof byKey.get(MIN_EXTENSION_VERSION_FLAG_KEY) === "string"
      ? (byKey.get(MIN_EXTENSION_VERSION_FLAG_KEY) as string)
      : "0.0.0";
    const features: FeatureFlags =
      typeof byKey.get(ENABLED_FEATURES_FLAG_KEY) === "object" &&
      byKey.get(ENABLED_FEATURES_FLAG_KEY) !== null
        ? (byKey.get(ENABLED_FEATURES_FLAG_KEY) as FeatureFlags)
        : {};

    const activeSeason = await ctx.db
      .query("seasons")
      .withIndex("by_active", (q) => q.eq("active", true))
      .first();

    return {
      minExtensionVersion: minExtVersion,
      features,
      activeSeason: activeSeason
        ? {
            id: activeSeason._id,
            seasonNumber: activeSeason.seasonNumber,
            name: activeSeason.name,
            theme: activeSeason.theme,
            startsAt: activeSeason.startsAt,
            endsAt: activeSeason.endsAt,
            tierCount: activeSeason.tierCount,
            xpPerTier: activeSeason.xpPerTier,
            bonusXpMultiplier: activeSeason.bonusXpMultiplier,
          }
        : null,
      now: Date.now(),
    };
  },
});

export const setFlag = internalMutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("configFlags", { key, value, updatedAt: Date.now() });
    }
  },
});
