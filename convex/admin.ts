// Operator-only mutations: all exports are internalMutation, so they are not
// reachable from the client and must be invoked from an admin HTTP route or
// scheduler. Bans both stamp bannedAt and revoke every active session token in
// the same transaction so the next authed request fails. fraudFlags and
// xpEvents double as the audit trail; retireItem never hard-deletes because
// existing inventory rows still reference the item id.

import { internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import { err } from "./lib/errors.js";
import { now as nowMs } from "./lib/time.js";

/** Bans a user and revokes every unrevoked session token; next authed request fails with USER_BANNED. */
export const banUser = internalMutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) err("INVALID_INPUT", "user not found");

    const now = nowMs();
    await ctx.db.patch(args.userId, { bannedAt: now });

    const tokens = await ctx.db
      .query("sessionTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    let revoked = 0;
    for (const t of tokens) {
      if (!t.revokedAt) {
        await ctx.db.patch(t._id, { revokedAt: now });
        revoked++;
      }
    }

    await ctx.db.insert("fraudFlags", {
      userId: args.userId,
      kind: "admin.banUser",
      severity: 10,
      detail: args.reason ? { reason: args.reason } : undefined,
      at: now,
    });

    return { banned: true, tokensRevoked: revoked };
  },
});

/** Clears bannedAt and fraudFlagged on the user. */
export const unbanUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) err("INVALID_INPUT", "user not found");
    await ctx.db.patch(args.userId, {
      bannedAt: undefined,
      fraudFlagged: false,
    });
    return { unbanned: true };
  },
});

/** Retires an item from catalog/tiers/rolls; not hard-deleted since existing inventory still references it. */
export const retireItem = internalMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) err("INVALID_INPUT", "item not found");
    if (item.retired) return { retired: false, alreadyRetired: true };
    await ctx.db.patch(args.itemId, { retired: true });
    return { retired: true, alreadyRetired: false };
  },
});

/** Adjusts user scrap by delta (floored at 0) and writes an xpEvents audit row with source=admin. */
export const adjustScrap = internalMutation({
  args: {
    userId: v.id("users"),
    delta: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) err("INVALID_INPUT", "user not found");
    const newScrap = Math.max(0, user.scrap + args.delta);
    const now = nowMs();
    await ctx.db.patch(args.userId, { scrap: newScrap, lastActiveAt: now });
    await ctx.db.insert("xpEvents", {
      userId: args.userId,
      source: "admin",
      amount: 0,
      newLevel: user.level,
      meta: {
        kind: "scrapAdjust",
        delta: args.delta,
        newScrap,
        reason: args.reason ?? null,
      },
      at: now,
    });
    return { newScrap };
  },
});

/** Sets fraudFlagged and records a fraudFlags row; severity 1-9 is soft flag, 10 is admin action. */
export const flagUser = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.string(),
    severity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) err("INVALID_INPUT", "user not found");
    const now = nowMs();
    await ctx.db.patch(args.userId, { fraudFlagged: true });
    await ctx.db.insert("fraudFlags", {
      userId: args.userId,
      kind: args.kind,
      severity: args.severity,
      detail: args.reason ? { reason: args.reason } : undefined,
      at: now,
    });
    return { flagged: true };
  },
});

/** Clears fraudFlagged on the user without touching ban state. */
export const clearFlag = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) err("INVALID_INPUT", "user not found");
    await ctx.db.patch(args.userId, { fraudFlagged: false });
    return { cleared: true };
  },
});
