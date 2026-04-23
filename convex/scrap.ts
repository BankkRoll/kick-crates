// Scrap is the soft currency earned from duplicate item rolls; the season
// crate is its only sink, so this file is deliberately tiny. Keep it that
// way — any new scrap spend should stay earn-only in spirit (cosmetic,
// non-p2w) and route through a named mutation here rather than ad-hoc
// ctx.db.patch of users.scrap elsewhere.
import { mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { requireUser } from "./auth.js";
import { err } from "./lib/errors.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import { now as nowMs } from "./lib/time.js";
import { SCRAP_COST_PER_SEASON_TOKEN } from "./lib/constants.js";

/** Converts scrap into season-crate tokens; the only sink for scrap since season is the sole gated pool. */
export const buyCrateToken = mutation({
  args: { quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "buyCrateToken", {
      key: user._id,
      throws: true,
    });

    if (!Number.isInteger(args.quantity) || args.quantity < 1) {
      err("INVALID_INPUT", "quantity must be a positive integer");
    }
    if (args.quantity > 20) {
      err("INVALID_INPUT", "quantity may not exceed 20 tokens per call");
    }

    const cost = SCRAP_COST_PER_SEASON_TOKEN * args.quantity;
    if (user.scrap < cost) err("INSUFFICIENT_SCRAP");

    const seasonCrate = await ctx.db
      .query("crateDef")
      .withIndex("by_slug", (q) => q.eq("slug", "season"))
      .first();
    if (!seasonCrate) err("CRATE_NOT_FOUND", "season crate not defined");
    if (!seasonCrate.active) {
      err("CRATE_NOT_FOUND", "season crate is inactive");
    }

    const now = nowMs();
    const state = await ctx.db
      .query("crateState")
      .withIndex("by_user_crate", (q) =>
        q.eq("userId", user._id).eq("crateDefId", seasonCrate._id),
      )
      .first();
    if (state) {
      await ctx.db.patch(state._id, {
        tokensHeld: state.tokensHeld + args.quantity,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("crateState", {
        userId: user._id,
        crateDefId: seasonCrate._id,
        secondsEarned: 0,
        tokensHeld: args.quantity,
        updatedAt: now,
      });
    }

    const newScrap = user.scrap - cost;
    await ctx.db.patch(user._id, {
      scrap: newScrap,
      lastActiveAt: now,
    });

    return {
      tokensBought: args.quantity,
      scrapSpent: cost,
      newScrap,
    };
  },
});
