// Crate opening is one read-modify-write mutation: gate check, rarity rolls,
// dedupe-to-scrap, XP grant via seasonXp, inline quest bump, then decrement
// the user's crateState (seconds or tokens). RNG and rarity tables live in
// lib/roll.ts and lib/constants.ts; this file only orchestrates. Rarity falls
// back to the next non-empty bucket in common->legendary order when a season
// has no items of the rolled rarity. Token-gated crates consume tokensHeld;
// all others consume watchMinutesRequired worth of secondsEarned.
import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import { requireUser } from "./auth.js";
import { err } from "./lib/errors.js";
import {
  CARDS_PER_CRATE,
  levelFromTotalXp,
  type Rarity,
} from "./lib/constants.js";
import { randomHex } from "./lib/crypto.js";
import { prngFromSeed, rollRarity, pickIndex, rarityRank } from "./lib/roll.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import { bumpQuestProgressInline } from "./quests.js";
import { grantXp } from "./lib/seasonXp.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { now as nowMs } from "./lib/time.js";

async function getActiveSeason(ctx: MutationCtx): Promise<Doc<"seasons">> {
  const s = await ctx.db
    .query("seasons")
    .withIndex("by_active", (q) => q.eq("active", true))
    .first();
  if (!s) err("SERVER_MISCONFIGURED", "no active season configured");
  return s;
}

async function getSeasonItemsByRarity(
  ctx: MutationCtx,
  seasonId: Id<"seasons">,
): Promise<Record<Rarity, Doc<"items">[]>> {
  const buckets: Record<Rarity, Doc<"items">[]> = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: [],
  };
  const rows = await ctx.db
    .query("items")
    .withIndex("by_season_rarity", (q) => q.eq("seasonId", seasonId))
    .collect();
  for (const r of rows) {
    if (!r.retired) buckets[r.rarity].push(r);
  }
  return buckets;
}

async function awardItem(
  ctx: MutationCtx,
  userId: Id<"users">,
  item: Doc<"items">,
  at: number,
): Promise<{ wasDuplicate: boolean; scrapAwarded: number }> {
  const existing = await ctx.db
    .query("inventory")
    .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemId", item._id))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { duplicates: existing.duplicates + 1 });
    return { wasDuplicate: true, scrapAwarded: item.scrapValueOnDupe };
  }
  await ctx.db.insert("inventory", {
    userId,
    itemId: item._id,
    acquiredAt: at,
    acquiredFrom: "crate",
    duplicates: 0,
  });
  return { wasDuplicate: false, scrapAwarded: 0 };
}

/** Rolls a crate open: rarity draws, dedupe-to-scrap, XP grant, quest bump, state decrement. */
export const openCrate = mutation({
  args: { crateSlug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "openCrate", { key: user._id, throws: true });

    const crate = await ctx.db
      .query("crateDef")
      .withIndex("by_slug", (q) => q.eq("slug", args.crateSlug as Doc<"crateDef">["slug"]))
      .first();
    if (!crate || !crate.active) err("INVALID_INPUT", "crate not found or inactive");

    const state = await ctx.db
      .query("crateState")
      .withIndex("by_user_crate", (q) => q.eq("userId", user._id).eq("crateDefId", crate._id))
      .first();

    const now = nowMs();

    if (crate.tokenGated) {
      if (!state || state.tokensHeld <= 0) err("CRATE_INSUFFICIENT_TOKENS");
    } else {
      const requiredSec = (crate.watchMinutesRequired ?? 0) * 60;
      if (!state) err("CRATE_NOT_READY", "no progress yet");
      if (state.secondsEarned < requiredSec) err("CRATE_NOT_READY", "watch more first");
      if (crate.cooldownHours && state.lastOpenedAt) {
        const nextAllowed = state.lastOpenedAt + crate.cooldownHours * 3600 * 1000;
        if (now < nextAllowed) err("CRATE_NOT_READY", "cooldown active");
      }
    }

    const season = await getActiveSeason(ctx);
    const buckets = await getSeasonItemsByRarity(ctx, season._id);

    const hasAny = Object.values(buckets).some((b) => b.length > 0);
    if (!hasAny) err("SERVER_MISCONFIGURED", "no items in active season");

    const rollSeed = randomHex(16);
    const rand = prngFromSeed(rollSeed);

    const cards = crate.cardsPerOpen > 0 ? crate.cardsPerOpen : CARDS_PER_CRATE;
    const results: Array<{
      itemId: Id<"items">;
      rarity: Rarity;
      wasDuplicate: boolean;
      scrapAwarded: number;
    }> = [];
    let totalScrap = 0;

    for (let i = 0; i < cards; i++) {
      let rarity = rollRarity(rand, crate.rarityWeights);
      let pool = buckets[rarity];
      if (pool.length === 0) {
        const order: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
        for (const r of order) {
          if (buckets[r].length > 0) {
            rarity = r;
            pool = buckets[r];
            break;
          }
        }
      }
      if (pool.length === 0) continue;
      const idx = pickIndex(rand, pool.length);
      const item = pool[idx]!;
      const aw = await awardItem(ctx, user._id, item, now);
      totalScrap += aw.scrapAwarded;
      results.push({
        itemId: item._id,
        rarity,
        wasDuplicate: aw.wasDuplicate,
        scrapAwarded: aw.scrapAwarded,
      });
    }

    if (results.length === 0) err("SERVER_MISCONFIGURED", "roll produced no results");

    const featured = results.reduce((best, cur) =>
      rarityRank(cur.rarity) > rarityRank(best.rarity) ? cur : best,
    );

    const xpAwarded = 50 + 10 * results.length;

    await ctx.db.insert("crateOpens", {
      userId: user._id,
      crateDefId: crate._id,
      openedAt: now,
      rollSeed,
      featuredItemId: featured.itemId,
      results,
      totalScrapAwarded: totalScrap,
      xpAwarded,
    });

    if (state) {
      const patch: Partial<Doc<"crateState">> = { lastOpenedAt: now, updatedAt: now };
      if (crate.tokenGated) {
        patch.tokensHeld = Math.max(0, state.tokensHeld - 1);
      } else {
        const requiredSec = (crate.watchMinutesRequired ?? 0) * 60;
        patch.secondsEarned = Math.max(0, state.secondsEarned - requiredSec);
      }
      await ctx.db.patch(state._id, patch);
    } else {
      await ctx.db.insert("crateState", {
        userId: user._id,
        crateDefId: crate._id,
        secondsEarned: 0,
        lastOpenedAt: now,
        tokensHeld: 0,
        updatedAt: now,
      });
    }

    const { newTotalXp, newSeasonXp, newLevel } = await grantXp(
      ctx,
      user,
      xpAwarded,
      levelFromTotalXp,
    );
    const newScrap = user.scrap + totalScrap;
    await ctx.db.patch(user._id, {
      totalXp: newTotalXp,
      seasonXp: newSeasonXp,
      level: newLevel,
      scrap: newScrap,
      lastActiveAt: now,
    });
    await ctx.db.insert("xpEvents", {
      userId: user._id,
      source: "bonus",
      amount: xpAwarded,
      newLevel,
      meta: { kind: "crate_open", crateSlug: crate.slug },
      at: now,
    });

    await bumpQuestProgressInline(ctx, user._id, "open_crate", 1, now);

    return {
      rollSeed,
      featuredItemId: featured.itemId,
      results,
      totalScrapAwarded: totalScrap,
      xpAwarded,
      newTotalXp,
      newLevel,
      newScrap,
    };
  },
});

/** Active crate definitions available for opening. */
export const listCrates = query({
  args: {},
  handler: async (ctx) => {
    const crates = await ctx.db.query("crateDef").collect();
    return crates.filter((c) => c.active);
  },
});

/** Caller's per-crate progress rows; empty array when unauthenticated. */
export const myCrateStates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;
    const rows = await ctx.db
      .query("crateState")
      .withIndex("by_user_crate", (q) => q.eq("userId", userId))
      .collect();
    return rows;
  },
});

/** Accrues watch seconds into every active, non-token-gated crate for the user. */
export async function addSecondsToCratesInline(
  ctx: MutationCtx,
  userId: Id<"users">,
  seconds: number,
): Promise<void> {
  if (seconds <= 0) return;
  const crates = await ctx.db.query("crateDef").collect();
  const now = Date.now();
  for (const crate of crates) {
    if (!crate.active) continue;
    if (crate.tokenGated) continue;
    const state = await ctx.db
      .query("crateState")
      .withIndex("by_user_crate", (q) =>
        q.eq("userId", userId).eq("crateDefId", crate._id),
      )
      .first();
    if (state) {
      await ctx.db.patch(state._id, {
        secondsEarned: state.secondsEarned + seconds,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("crateState", {
        userId,
        crateDefId: crate._id,
        secondsEarned: seconds,
        tokensHeld: 0,
        updatedAt: now,
      });
    }
  }
}
