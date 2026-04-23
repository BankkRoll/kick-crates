// The active season is read through a denormalized configFlags row keyed by
// ACTIVE_SEASON_ID_FLAG_KEY; never query seasons.active directly from hot
// paths. `activate` is the sole writer of both seasons.active and the flag
// and must be invoked via cron or an operator call — never patched by hand.
// claimTier computes rewards from lib/tiers.ts against the season's items
// and awards one season crate token every 5 tiers.
import { query, mutation, internalMutation } from "./_generated/server.js";
import type { QueryCtx, MutationCtx } from "./_generated/server.js";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import { requireUser } from "./auth.js";
import { err } from "./lib/errors.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import { now as nowMs } from "./lib/time.js";
import { computeTierRewards, xpRequiredForTier } from "./lib/tiers.js";
import { syncSeasonXp } from "./lib/seasonXp.js";
import { ACTIVE_SEASON_ID_FLAG_KEY } from "./lib/constants.js";

/** Denormalized active-season lookup via configFlags; `activate` is the sole writer. */
export async function readActiveSeasonId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"seasons"> | null> {
  const row = await ctx.db
    .query("configFlags")
    .withIndex("by_key", (q) => q.eq("key", ACTIVE_SEASON_ID_FLAG_KEY))
    .first();
  const val = row?.value;
  if (typeof val !== "string") return null;
  return val as Id<"seasons">;
}

/** Resolves the active season document via the denormalized flag. */
export async function readActiveSeason(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"seasons"> | null> {
  const id = await readActiveSeasonId(ctx);
  if (!id) return null;
  return await ctx.db.get(id);
}

/** Lists non-retired items for the given or active season. */
export const listItems = query({
  args: { seasonId: v.optional(v.id("seasons")) },
  handler: async (ctx, args) => {
    const seasonId = args.seasonId ?? (await readActiveSeasonId(ctx));
    if (!seasonId) return [];
    const rows = await ctx.db
      .query("items")
      .withIndex("by_season_rarity", (q) => q.eq("seasonId", seasonId))
      .collect();
    return rows.filter((r) => !r.retired);
  },
});

/** Returns the active season wrapped in an array, or empty. */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const active = await readActiveSeason(ctx);
    return active ? [active] : [];
  },
});

/** Computed battle-pass tier rewards with per-tier xp thresholds and item payloads. */
export const listTierRewards = query({
  args: { seasonId: v.optional(v.id("seasons")) },
  handler: async (ctx, args) => {
    const seasonId = args.seasonId ?? (await readActiveSeasonId(ctx));
    if (!seasonId) return [];
    const season = await ctx.db.get(seasonId);
    if (!season) return [];
    const items = await ctx.db
      .query("items")
      .withIndex("by_season_rarity", (q) => q.eq("seasonId", seasonId))
      .collect();
    const rewards = computeTierRewards(items, season.tierCount);
    return rewards.map((r) => {
      const item = items.find((i) => i._id === r.itemId);
      return {
        tier: r.tier,
        rarity: r.rarity,
        xpRequired: xpRequiredForTier(r.tier, season.xpPerTier),
        item: item
          ? {
              _id: item._id,
              slug: item.slug,
              name: item.name,
              type: item.type,
              rarity: item.rarity,
              assetSvg: item.assetSvg,
              animated: item.animated,
              description: item.description ?? "",
              scrapValueOnDupe: item.scrapValueOnDupe,
            }
          : null,
      };
    });
  },
});

/** Tier claims made by the caller for the given or active season. */
export const listMyTierClaims = query({
  args: { seasonId: v.optional(v.id("seasons")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;
    const seasonId = args.seasonId ?? (await readActiveSeasonId(ctx));
    if (!seasonId) return [];
    const claims = await ctx.db
      .query("tierClaims")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", userId).eq("seasonId", seasonId),
      )
      .collect();
    return claims.map((c) => ({
      tierNumber: c.tierNumber,
      claimedAt: c.claimedAt,
    }));
  },
});

/** Claims a reached battle-pass tier; grants item/scrap-on-dupe and a season crate token every 5 tiers. */
export const claimTier = mutation({
  args: { tierNumber: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "claimTier", { key: user._id, throws: true });

    const season = await readActiveSeason(ctx);
    if (!season) err("SERVER_MISCONFIGURED", "no active season");

    if (args.tierNumber < 1 || args.tierNumber > season.tierCount) {
      err("TIER_OUT_OF_RANGE");
    }

    const { seasonXp } = await syncSeasonXp(ctx, user);
    const requiredXp = xpRequiredForTier(args.tierNumber, season.xpPerTier);
    if (seasonXp < requiredXp) err("TIER_NOT_REACHED");

    const existingClaim = await ctx.db
      .query("tierClaims")
      .withIndex("by_user_season_tier", (q) =>
        q
          .eq("userId", user._id)
          .eq("seasonId", season._id)
          .eq("tierNumber", args.tierNumber),
      )
      .first();
    if (existingClaim) err("TIER_ALREADY_CLAIMED");

    const items = await ctx.db
      .query("items")
      .withIndex("by_season_rarity", (q) => q.eq("seasonId", season._id))
      .collect();
    const rewards = computeTierRewards(items, season.tierCount);
    const reward = rewards.find((r) => r.tier === args.tierNumber);
    if (!reward) err("SERVER_MISCONFIGURED", "no reward computed for tier");
    const item = items.find((i) => i._id === reward.itemId);
    if (!item) err("SERVER_MISCONFIGURED", "reward item missing");

    const now = nowMs();

    const existingInv = await ctx.db
      .query("inventory")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", user._id).eq("itemId", item._id),
      )
      .first();
    let wasDuplicate = false;
    let scrapAwarded = 0;
    if (existingInv) {
      await ctx.db.patch(existingInv._id, {
        duplicates: existingInv.duplicates + 1,
      });
      wasDuplicate = true;
      scrapAwarded = item.scrapValueOnDupe;
    } else {
      await ctx.db.insert("inventory", {
        userId: user._id,
        itemId: item._id,
        acquiredAt: now,
        acquiredFrom: "pass",
        duplicates: 0,
      });
    }

    let tokensAwarded = 0;
    if (args.tierNumber % 5 === 0) {
      const seasonCrate = await ctx.db
        .query("crateDef")
        .withIndex("by_slug", (q) => q.eq("slug", "season"))
        .first();
      if (seasonCrate) {
        tokensAwarded = 1;
        const cs = await ctx.db
          .query("crateState")
          .withIndex("by_user_crate", (q) =>
            q.eq("userId", user._id).eq("crateDefId", seasonCrate._id),
          )
          .first();
        if (cs) {
          await ctx.db.patch(cs._id, {
            tokensHeld: cs.tokensHeld + 1,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("crateState", {
            userId: user._id,
            crateDefId: seasonCrate._id,
            secondsEarned: 0,
            tokensHeld: 1,
            updatedAt: now,
          });
        }
      }
    }

    await ctx.db.insert("tierClaims", {
      userId: user._id,
      seasonId: season._id,
      tierNumber: args.tierNumber,
      itemId: item._id,
      tokensAwarded,
      scrapAwarded,
      wasDuplicate,
      claimedAt: now,
    });

    await ctx.db.patch(user._id, {
      scrap: user.scrap + scrapAwarded,
      lastActiveAt: now,
    });

    return {
      tierNumber: args.tierNumber,
      item: {
        _id: item._id,
        slug: item.slug,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        assetSvg: item.assetSvg,
        animated: item.animated,
        description: item.description ?? "",
      },
      wasDuplicate,
      scrapAwarded,
      tokensAwarded,
    };
  },
});

/** Claims every reached, unclaimed tier in one mutation; consumes a single `claimTier` rate-limit token regardless of count. */
export const claimEligibleTiers = mutation({
  args: { tierNumbers: v.optional(v.array(v.number())) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "claimTier", { key: user._id, throws: true });

    const season = await readActiveSeason(ctx);
    if (!season) err("SERVER_MISCONFIGURED", "no active season");

    const { seasonXp } = await syncSeasonXp(ctx, user);

    const items = await ctx.db
      .query("items")
      .withIndex("by_season_rarity", (q) => q.eq("seasonId", season._id))
      .collect();
    const rewards = computeTierRewards(items, season.tierCount);
    const itemById = new Map(items.map((i) => [i._id, i]));

    const existingClaims = await ctx.db
      .query("tierClaims")
      .withIndex("by_user_season_tier", (q) =>
        q.eq("userId", user._id).eq("seasonId", season._id),
      )
      .collect();
    const claimedSet = new Set(existingClaims.map((c) => c.tierNumber));

    let candidates: number[];
    if (args.tierNumbers && args.tierNumbers.length > 0) {
      const seen = new Set<number>();
      candidates = args.tierNumbers
        .filter((n) => {
          if (seen.has(n) || n < 1 || n > season.tierCount) return false;
          seen.add(n);
          return true;
        })
        .sort((a, b) => a - b);
    } else {
      candidates = Array.from({ length: season.tierCount }, (_, i) => i + 1);
    }

    let seasonCrate: Doc<"crateDef"> | null = null;
    let seasonCrateState: Doc<"crateState"> | null = null;
    const willAwardToken = candidates.some(
      (t) =>
        t % 5 === 0 &&
        !claimedSet.has(t) &&
        seasonXp >= xpRequiredForTier(t, season.xpPerTier),
    );
    if (willAwardToken) {
      seasonCrate =
        (await ctx.db
          .query("crateDef")
          .withIndex("by_slug", (q) => q.eq("slug", "season"))
          .first()) ?? null;
      if (seasonCrate) {
        seasonCrateState =
          (await ctx.db
            .query("crateState")
            .withIndex("by_user_crate", (q) =>
              q.eq("userId", user._id).eq("crateDefId", seasonCrate!._id),
            )
            .first()) ?? null;
      }
    }

    const now = nowMs();
    type Claimed = {
      tierNumber: number;
      item: {
        _id: Id<"items">;
        slug: string;
        name: string;
        type: "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";
        rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
        assetSvg: string;
        animated: boolean;
        description: string;
      };
      wasDuplicate: boolean;
      scrapAwarded: number;
      tokensAwarded: number;
    };
    const claimed: Claimed[] = [];
    let totalScrap = 0;
    let totalTokens = 0;

    for (const tierNumber of candidates) {
      if (claimedSet.has(tierNumber)) continue;
      const requiredXp = xpRequiredForTier(tierNumber, season.xpPerTier);
      if (seasonXp < requiredXp) continue;

      const reward = rewards.find((r) => r.tier === tierNumber);
      if (!reward) continue;
      const item = itemById.get(reward.itemId);
      if (!item) continue;

      const existingInv = await ctx.db
        .query("inventory")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", user._id).eq("itemId", item._id),
        )
        .first();
      let wasDuplicate = false;
      let scrapAwarded = 0;
      if (existingInv) {
        await ctx.db.patch(existingInv._id, {
          duplicates: existingInv.duplicates + 1,
        });
        wasDuplicate = true;
        scrapAwarded = item.scrapValueOnDupe;
      } else {
        await ctx.db.insert("inventory", {
          userId: user._id,
          itemId: item._id,
          acquiredAt: now,
          acquiredFrom: "pass",
          duplicates: 0,
        });
      }

      const tokensAwarded =
        tierNumber % 5 === 0 && seasonCrate ? 1 : 0;

      await ctx.db.insert("tierClaims", {
        userId: user._id,
        seasonId: season._id,
        tierNumber,
        itemId: item._id,
        tokensAwarded,
        scrapAwarded,
        wasDuplicate,
        claimedAt: now,
      });

      claimedSet.add(tierNumber);
      totalScrap += scrapAwarded;
      totalTokens += tokensAwarded;
      claimed.push({
        tierNumber,
        item: {
          _id: item._id,
          slug: item.slug,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          assetSvg: item.assetSvg,
          animated: item.animated,
          description: item.description ?? "",
        },
        wasDuplicate,
        scrapAwarded,
        tokensAwarded,
      });
    }

    if (claimed.length === 0) {
      return { claimed, totalScrapAwarded: 0, totalTokensAwarded: 0 };
    }

    await ctx.db.patch(user._id, {
      scrap: user.scrap + totalScrap,
      lastActiveAt: now,
    });

    if (totalTokens > 0 && seasonCrate) {
      if (seasonCrateState) {
        await ctx.db.patch(seasonCrateState._id, {
          tokensHeld: seasonCrateState.tokensHeld + totalTokens,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("crateState", {
          userId: user._id,
          crateDefId: seasonCrate._id,
          secondsEarned: 0,
          tokensHeld: totalTokens,
          updatedAt: now,
        });
      }
    }

    return {
      claimed,
      totalScrapAwarded: totalScrap,
      totalTokensAwarded: totalTokens,
    };
  },
});

/** Atomic season rollover: deactivate others, activate target, rewrite the denormalized flag. Operator-only. */
export const activate = internalMutation({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.seasonId);
    if (!target) err("SERVER_MISCONFIGURED", "season not found");

    const currentlyActive = await ctx.db
      .query("seasons")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    for (const s of currentlyActive) {
      if (s._id !== args.seasonId) {
        await ctx.db.patch(s._id, { active: false });
      }
    }
    if (!target.active) {
      await ctx.db.patch(args.seasonId, { active: true });
    }

    const now = nowMs();
    const flagRow = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", ACTIVE_SEASON_ID_FLAG_KEY))
      .first();
    if (flagRow) {
      await ctx.db.patch(flagRow._id, { value: args.seasonId, updatedAt: now });
    } else {
      await ctx.db.insert("configFlags", {
        key: ACTIVE_SEASON_ID_FLAG_KEY,
        value: args.seasonId,
        updatedAt: now,
      });
    }

    return {
      activatedSeasonId: args.seasonId,
      deactivatedSeasonIds: currentlyActive
        .filter((s) => s._id !== args.seasonId)
        .map((s) => s._id),
    };
  },
});
