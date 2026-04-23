// Viewer-facing profile, inventory, loadout, and session surface. Season
// rollover is lazy: seasonXp reads zero once the active season advances past
// the user's currentSeasonId, and the stored value is only rewritten on the
// next XP grant. setLoadout normalizes nulls to absent fields so the schema
// never stores explicit null, and ownership+type are re-checked server-side
// on every equip. logout revokes one token by jti; admin.banUser is the only
// path that revokes all of a user's tokens at once.

import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { requireUser, optionalUser } from "./auth.js";
import { err } from "./lib/errors.js";
import {
  levelFromTotalXp,
  totalXpForLevel,
  xpRequiredForLevel,
  MAX_LOADOUT_TITLE_LENGTH,
} from "./lib/constants.js";
import { dayKeyUTC, now as nowMs } from "./lib/time.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import {
  WELCOME_EMOTE_SLUG,
  WELCOME_BADGE_SLUG,
  WELCOME_XP,
  WELCOME_SCRAP,
} from "./lib/welcome.js";
import { readActiveSeasonId } from "./seasons.js";
import type { Id } from "./_generated/dataModel.js";

/** Current viewer profile with level derived from totalXp; seasonXp is zeroed when the stored currentSeasonId no longer matches the active season (rollover is lazy, deferred to next XP grant). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const level = levelFromTotalXp(user.totalXp);
    const xpForNextLevel = xpRequiredForLevel(level + 1);
    const xpAtThisLevel = totalXpForLevel(level);
    const xpIntoLevel = Math.max(0, user.totalXp - xpAtThisLevel);

    const activeSeasonId = await readActiveSeasonId(ctx);
    const seasonXp =
      activeSeasonId && user.currentSeasonId === activeSeasonId
        ? user.seasonXp
        : 0;

    const loadout = await ctx.db
      .query("loadouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      id: user._id,
      kickUserId: user.kickUserId,
      kickUsername: user.kickUsername,
      kickProfilePicture: user.kickProfilePicture ?? null,
      totalXp: user.totalXp,
      seasonXp,
      level,
      scrap: user.scrap,
      xpIntoLevel,
      xpForNextLevel,
      progressToNextLevel: xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0,
      fraudFlagged: user.fraudFlagged,
      bannedAt: user.bannedAt ?? null,
      welcomeAcknowledged: user.welcomeAcknowledgedAt !== undefined,
      loadout: loadout
        ? {
            badgeItemId: loadout.badgeItemId ?? null,
            nameColorItemId: loadout.nameColorItemId ?? null,
            profileCardItemId: loadout.profileCardItemId ?? null,
            chatFlairItemId: loadout.chatFlairItemId ?? null,
            title: loadout.title ?? null,
          }
        : null,
    };
  },
});

/** Viewer's inventory joined with item metadata. */
export const myInventory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as Id<"users">;
    const rows = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out: Array<{
      inventoryId: Id<"inventory">;
      itemId: Id<"items">;
      duplicates: number;
      acquiredAt: number;
      acquiredFrom: "crate" | "quest" | "pass" | "promo" | "admin";
      item: {
        slug: string;
        name: string;
        type: string;
        rarity: string;
        assetSvg: string;
        animated: boolean;
        description: string;
      };
    }> = [];
    for (const inv of rows) {
      const item = await ctx.db.get(inv.itemId);
      if (!item) continue;
      out.push({
        inventoryId: inv._id,
        itemId: inv.itemId,
        duplicates: inv.duplicates,
        acquiredAt: inv.acquiredAt,
        acquiredFrom: inv.acquiredFrom,
        item: {
          slug: item.slug,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          assetSvg: item.assetSvg,
          animated: item.animated,
          description: item.description ?? "",
        },
      });
    }
    return out;
  },
});

/** Today's watch stats for the viewer keyed by UTC day. */
export const myDailyUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;
    const dateKey = dayKeyUTC(nowMs());
    const row = await ctx.db
      .query("dailyUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", dateKey))
      .first();
    if (!row) {
      return {
        dateKey,
        totalSeconds: 0,
        totalXp: 0,
        distinctChannels: [],
      };
    }
    return {
      dateKey: row.dateKey,
      totalSeconds: row.totalSeconds,
      totalXp: row.totalXp,
      distinctChannels: row.distinctChannels,
    };
  },
});

/** Sets all five loadout slots at once; callers pass null to clear a slot, which is translated to an absent field rather than a stored null. */
export const setLoadout = mutation({
  args: {
    badgeItemId: v.union(v.id("items"), v.null()),
    nameColorItemId: v.union(v.id("items"), v.null()),
    profileCardItemId: v.union(v.id("items"), v.null()),
    chatFlairItemId: v.union(v.id("items"), v.null()),
    title: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "setLoadout", { key: user._id, throws: true });

    if (args.title !== null && args.title.length > MAX_LOADOUT_TITLE_LENGTH) {
      err(
        "INVALID_INPUT",
        `title must be ${MAX_LOADOUT_TITLE_LENGTH} characters or fewer`,
      );
    }

    async function requireOwnedOfType(
      itemId: Id<"items"> | null,
      expectedType: "badge" | "nameColor" | "profileCard" | "chatFlair",
    ): Promise<void> {
      if (itemId === null) return;
      const row = await ctx.db
        .query("inventory")
        .withIndex("by_user_item", (q) => q.eq("userId", user._id).eq("itemId", itemId))
        .first();
      if (!row) err("UNAUTHORIZED", "you do not own this item");
      const item = await ctx.db.get(itemId);
      if (!item) err("INVALID_INPUT", "item not found");
      if (item.type !== expectedType) {
        err(
          "INVALID_INPUT",
          "cannot equip a " + item.type + " in the " + expectedType + " slot",
        );
      }
    }

    await Promise.all([
      requireOwnedOfType(args.badgeItemId, "badge"),
      requireOwnedOfType(args.nameColorItemId, "nameColor"),
      requireOwnedOfType(args.profileCardItemId, "profileCard"),
      requireOwnedOfType(args.chatFlairItemId, "chatFlair"),
    ]);

    const slot = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
    const fields = {
      badgeItemId: slot(args.badgeItemId),
      nameColorItemId: slot(args.nameColorItemId),
      profileCardItemId: slot(args.profileCardItemId),
      chatFlairItemId: slot(args.chatFlairItemId),
      title: slot(args.title),
      updatedAt: nowMs(),
    };

    const loadout = await ctx.db
      .query("loadouts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (loadout) {
      await ctx.db.patch(loadout._id, fields);
    } else {
      await ctx.db.insert("loadouts", { userId: user._id, ...fields });
    }
    return { ok: true };
  },
});

/** Welcome-kit payload shown until the user acknowledges it; resolves the current season's welcome emote and badge. */
export const myWelcomeKit = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;
    if (user.welcomeAcknowledgedAt !== undefined) return null;

    const season = user.currentSeasonId
      ? await ctx.db.get(user.currentSeasonId)
      : await ctx.db
          .query("seasons")
          .withIndex("by_active", (q) => q.eq("active", true))
          .first();
    if (!season) return null;

    const [emote, badge] = await Promise.all([
      ctx.db
        .query("items")
        .withIndex("by_season_slug", (q) =>
          q.eq("seasonId", season._id).eq("slug", WELCOME_EMOTE_SLUG),
        )
        .first(),
      ctx.db
        .query("items")
        .withIndex("by_season_slug", (q) =>
          q.eq("seasonId", season._id).eq("slug", WELCOME_BADGE_SLUG),
        )
        .first(),
    ]);

    const toPayload = (it: typeof emote) =>
      it
        ? {
            _id: it._id,
            slug: it.slug,
            name: it.name,
            type: it.type,
            rarity: it.rarity,
            assetSvg: it.assetSvg,
            animated: it.animated,
            description: it.description ?? "",
          }
        : null;

    return {
      items: [toPayload(emote), toPayload(badge)].filter(
        (x): x is NonNullable<ReturnType<typeof toPayload>> => x !== null,
      ),
      xpAwarded: WELCOME_XP,
      scrapAwarded: WELCOME_SCRAP,
      username: user.kickUsername,
    };
  },
});

/** Marks the welcome kit as seen; idempotent. */
export const acknowledgeWelcome = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.welcomeAcknowledgedAt !== undefined) return { ok: true };
    await ctx.db.patch(user._id, { welcomeAcknowledgedAt: nowMs() });
    return { ok: true };
  },
});

/** Revokes a specific session token; verifies caller owns it before revocation. */
export const logout = mutation({
  args: { jti: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tok = await ctx.db
      .query("sessionTokens")
      .withIndex("by_jti", (q) => q.eq("jti", args.jti))
      .first();
    if (!tok) return { ok: true };
    if (tok.userId !== user._id) err("UNAUTHORIZED", "session token does not belong to caller");
    if (tok.revokedAt) return { ok: true };
    await ctx.db.patch(tok._id, { revokedAt: Date.now() });
    return { ok: true };
  },
});
