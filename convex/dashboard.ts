// One-shot dashboard prime. The dialog still subscribes to the granular
// queries in users.ts, seasons.ts, etc. for live updates; Convex de-dupes
// shared reads so the bootstrap is pure latency optimization, not a cache.
// Anonymous callers get a trimmed payload (config + crates + tier rewards)
// with me/inventory/quests stubbed out, so the landing UI can render before
// login. Welcome-kit logic is mirrored from users.myWelcomeKit — keep the two
// in sync when acknowledgement rules change.

import { query } from "./_generated/server.js";
import { optionalUser } from "./auth.js";
import {
  levelFromTotalXp,
  totalXpForLevel,
  xpRequiredForLevel,
  MIN_EXTENSION_VERSION_FLAG_KEY,
  ENABLED_FEATURES_FLAG_KEY,
} from "./lib/constants.js";
import { readActiveSeason } from "./seasons.js";
import { computeTierRewards, xpRequiredForTier } from "./lib/tiers.js";
import { dayKeyUTC, weekKeyUTC, now as nowMs } from "./lib/time.js";
import {
  WELCOME_EMOTE_SLUG,
  WELCOME_BADGE_SLUG,
  WELCOME_XP,
  WELCOME_SCRAP,
} from "./lib/welcome.js";
import type { Doc } from "./_generated/dataModel.js";

/** Single round-trip dashboard prime; dialog still subscribes to granular queries for live updates, Convex de-dupes shared rows. */
export const bootstrap = query({
  args: {},
  handler: async (ctx) => {
    const now = nowMs();
    const [minExtVersionRow, featuresRow] = await Promise.all([
      ctx.db
        .query("configFlags")
        .withIndex("by_key", (q) => q.eq("key", MIN_EXTENSION_VERSION_FLAG_KEY))
        .first(),
      ctx.db
        .query("configFlags")
        .withIndex("by_key", (q) => q.eq("key", ENABLED_FEATURES_FLAG_KEY))
        .first(),
    ]);

    const activeSeason = await readActiveSeason(ctx);

    const user = await optionalUser(ctx);

    const clientConfig = {
      minExtensionVersion:
        typeof minExtVersionRow?.value === "string"
          ? (minExtVersionRow.value as string)
          : "0.0.0",
      features:
        typeof featuresRow?.value === "object" && featuresRow.value !== null
          ? (featuresRow.value as Record<string, boolean>)
          : {},
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
      now,
    };

    const crates = (await ctx.db.query("crateDef").collect()).filter(
      (c) => c.active,
    );

    const seasonItems = activeSeason
      ? (
          await ctx.db
            .query("items")
            .withIndex("by_season_rarity", (q) =>
              q.eq("seasonId", activeSeason._id),
            )
            .collect()
        ).filter((it) => !it.retired)
      : [];

    const tierRewards = activeSeason
      ? computeTierRewards(seasonItems, activeSeason.tierCount).map((r) => {
          const item = seasonItems.find((i) => i._id === r.itemId);
          return {
            tier: r.tier,
            rarity: r.rarity,
            xpRequired: xpRequiredForTier(r.tier, activeSeason.xpPerTier),
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
                  sellValue: item.sellValue,
                }
              : null,
          };
        })
      : [];

    if (!user) {
      return {
        clientConfig,
        me: null,
        inventory: [],
        crates,
        myCrateStates: [],
        quests: [],
        seasonItems,
        tierRewards,
        myTierClaims: [],
        welcomeKit: null,
      };
    }

    const [
      loadout,
      inventoryRows,
      myCrateStates,
      dailyDefs,
      weeklyDefs,
      seasonDefs,
      myTierClaims,
    ] = await Promise.all([
      ctx.db
        .query("loadouts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first(),
      ctx.db
        .query("inventory")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("crateState")
        .withIndex("by_user_crate", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("questDef")
        .withIndex("by_cadence_active", (q) =>
          q.eq("cadence", "daily").eq("active", true),
        )
        .collect(),
      ctx.db
        .query("questDef")
        .withIndex("by_cadence_active", (q) =>
          q.eq("cadence", "weekly").eq("active", true),
        )
        .collect(),
      ctx.db
        .query("questDef")
        .withIndex("by_cadence_active", (q) =>
          q.eq("cadence", "season").eq("active", true),
        )
        .collect(),
      activeSeason
        ? ctx.db
            .query("tierClaims")
            .withIndex("by_user_season", (q) =>
              q.eq("userId", user._id).eq("seasonId", activeSeason._id),
            )
            .collect()
        : Promise.resolve([] as Doc<"tierClaims">[]),
    ]);

    const level = levelFromTotalXp(user.totalXp);
    const xpForNextLevel = xpRequiredForLevel(level + 1);
    const xpIntoLevel = Math.max(0, user.totalXp - totalXpForLevel(level));
    const seasonXp =
      activeSeason && user.currentSeasonId === activeSeason._id
        ? user.seasonXp
        : 0;

    const me = {
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
      progressToNextLevel:
        xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0,
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

    const itemsById = new Map<string, Doc<"items">>();
    for (const it of seasonItems) itemsById.set(it._id, it);
    for (const inv of inventoryRows) {
      if (!itemsById.has(inv.itemId)) {
        const it = await ctx.db.get(inv.itemId);
        if (it) itemsById.set(it._id, it);
      }
    }
    const inventory = inventoryRows
      .map((inv) => {
        const item = itemsById.get(inv.itemId);
        if (!item) return null;
        return {
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
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const questDefs = [...dailyDefs, ...weeklyDefs, ...seasonDefs];
    const quests: Array<{
      def: Doc<"questDef">;
      cadenceKey: string;
      progress: number;
      completed: boolean;
      claimed: boolean;
    }> = [];
    for (const def of questDefs) {
      const cadenceKey =
        def.cadence === "daily"
          ? dayKeyUTC(now)
          : def.cadence === "weekly"
            ? weekKeyUTC(now)
            : "season";
      const prog = await ctx.db
        .query("questProgress")
        .withIndex("by_user_quest_cadence", (q) =>
          q
            .eq("userId", user._id)
            .eq("questDefId", def._id)
            .eq("cadenceKey", cadenceKey),
        )
        .first();
      quests.push({
        def,
        cadenceKey,
        progress: prog?.progressValue ?? 0,
        completed: prog?.completed ?? false,
        claimed: prog?.claimed ?? false,
      });
    }

    const welcomeKit =
      user.welcomeAcknowledgedAt === undefined && activeSeason
        ? await (async () => {
            const [emote, badge] = await Promise.all([
              ctx.db
                .query("items")
                .withIndex("by_season_slug", (q) =>
                  q
                    .eq("seasonId", activeSeason._id)
                    .eq("slug", WELCOME_EMOTE_SLUG),
                )
                .first(),
              ctx.db
                .query("items")
                .withIndex("by_season_slug", (q) =>
                  q
                    .eq("seasonId", activeSeason._id)
                    .eq("slug", WELCOME_BADGE_SLUG),
                )
                .first(),
            ]);
            const pack = (it: typeof emote) =>
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
              items: [pack(emote), pack(badge)].filter(
                (x): x is NonNullable<ReturnType<typeof pack>> => x !== null,
              ),
              xpAwarded: WELCOME_XP,
              scrapAwarded: WELCOME_SCRAP,
              username: user.kickUsername,
            };
          })()
        : null;

    return {
      clientConfig,
      me,
      inventory,
      crates,
      myCrateStates,
      quests,
      seasonItems,
      tierRewards,
      myTierClaims: myTierClaims.map((c) => ({
        tierNumber: c.tierNumber,
        claimedAt: c.claimedAt,
      })),
      welcomeKit,
    };
  },
});
