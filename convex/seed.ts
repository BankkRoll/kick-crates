import { v } from "convex/values";
import { internalMutation } from "./_generated/server.js";
import {
  ACTIVE_SEASON_ID_FLAG_KEY,
  CARDS_PER_CRATE,
  DAILY_CRATE_WATCH_MINUTES,
  DEFAULT_RARITY_WEIGHTS,
  MONTHLY_CRATE_WATCH_MINUTES,
  SCRAP_VALUE_PER_RARITY,
  WEEKLY_CRATE_WATCH_MINUTES,
  type ItemType,
  type Rarity,
} from "./lib/constants.js";
import { generateItemSvg } from "./lib/seed/svgGen.js";

type SeedItem = {
  slug: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  description: string;
  animated?: boolean;
};

const SEASON_ITEMS: SeedItem[] = [
  {
    slug: "smile",
    name: "Smile",
    type: "emote",
    rarity: "common",
    description:
      "The friendly Kick classic. Everyone starts with this one — the welcome emote.",
  },
  {
    slug: "laugh",
    name: "Laugh",
    type: "emote",
    rarity: "common",
    description: "Eyes shut, open mouth — the universal laugh.",
  },
  {
    slug: "happy",
    name: "Happy",
    type: "emote",
    rarity: "common",
    description: "Content and cozy. A warm smile for casual chat.",
  },
  {
    slug: "wink",
    name: "Wink",
    type: "emote",
    rarity: "common",
    description: "One-eye wink. Playful, flirty, or just agreeing.",
  },
  {
    slug: "sad",
    name: "Sad",
    type: "emote",
    rarity: "common",
    description: "Drooping eyes, drooping mouth. For the rough losses.",
  },
  {
    slug: "cry",
    name: "Cry",
    type: "emote",
    rarity: "common",
    description: "Big tears, dripping mouth. When the clip hits too hard.",
  },
  {
    slug: "shy",
    name: "Shy",
    type: "emote",
    rarity: "common",
    description: "Quiet little smile. For the wholesome moments.",
  },
  {
    slug: "plain",
    name: "Plain",
    type: "emote",
    rarity: "common",
    description: "Deadpan. Nothing to add.",
  },
  {
    slug: "shock",
    name: "Shock",
    type: "emote",
    rarity: "common",
    description: "Mouth wide open. For the plot twists.",
  },

  {
    slug: "grin",
    name: "Grin",
    type: "emote",
    rarity: "uncommon",
    description: "Full-wide grin. Caught mid-celebration.",
  },
  {
    slug: "sassy",
    name: "Sassy",
    type: "emote",
    rarity: "uncommon",
    description: "Wink with teeth out. Serving energy.",
  },
  {
    slug: "tongue",
    name: "Tongue",
    type: "emote",
    rarity: "uncommon",
    description: "Tongue out, eyes shut. For the cheeky takes.",
  },
  {
    slug: "annoyed",
    name: "Annoyed",
    type: "emote",
    rarity: "uncommon",
    description: "Squinted eyes, pissed mouth. You're done.",
  },
  {
    slug: "sleepy",
    name: "Sleepy",
    type: "emote",
    rarity: "uncommon",
    description: "Drooping eyes, tiny mouth. Stream is late, chat is tired.",
  },

  {
    slug: "kiss",
    name: "Kiss",
    type: "emote",
    rarity: "rare",
    animated: true,
    description: "Heart eyes, blowing a kiss. For the goodnight raids.",
  },
  {
    slug: "starstruck",
    name: "Starstruck",
    type: "emote",
    rarity: "rare",
    animated: true,
    description: "Stars for eyes, grinning. Fanboy unlocked.",
  },
  {
    slug: "cool",
    name: "Cool",
    type: "emote",
    rarity: "rare",
    animated: true,
    description: "Sunglasses on, half-smile. For the clutch plays.",
  },

  {
    slug: "toothy",
    name: "Toothy",
    type: "emote",
    rarity: "epic",
    animated: true,
    description: "All teeth, all hype. Maximum grin.",
  },
  {
    slug: "masked",
    name: "Masked",
    type: "emote",
    rarity: "epic",
    animated: true,
    description: "Incognito vibes. For the anonymous lurkers.",
  },

  {
    slug: "superstar",
    name: "Superstar",
    type: "emote",
    rarity: "legendary",
    animated: true,
    description:
      "Season 1's rarest drop — stars for eyes, full-wide grin, total main-character energy.",
  },

  {
    slug: "watcher-bronze",
    name: "Bronze Watcher",
    type: "badge",
    rarity: "common",
    description: "Awarded on sign-up. Your first badge — prove you showed up.",
  },
  {
    slug: "watcher-silver",
    name: "Silver Watcher",
    type: "badge",
    rarity: "uncommon",
    description: "Casual but consistent. Shows you're logging real watch time.",
  },
  {
    slug: "watcher-gold",
    name: "Gold Watcher",
    type: "badge",
    rarity: "rare",
    description:
      "Dedicated. Hundreds of minutes watched, and you're still here.",
  },
  {
    slug: "watcher-diamond",
    name: "Diamond Watcher",
    type: "badge",
    rarity: "epic",
    description: "Certified degen. Only for the deep grinders.",
  },
  {
    slug: "founding-badge",
    name: "Season 1 Founder",
    type: "badge",
    rarity: "legendary",
    description:
      "Reserved for Season 1 veterans — never appears again in any future season.",
  },

  {
    slug: "leaf-green",
    name: "Leaf Green",
    type: "nameColor",
    rarity: "common",
    description: "A soft leafy green for your name in chat.",
  },
  {
    slug: "forest-green",
    name: "Forest Green",
    type: "nameColor",
    rarity: "uncommon",
    description: "Deep forest tone — bolder and darker.",
  },
  {
    slug: "emerald-gradient",
    name: "Emerald Gradient",
    type: "nameColor",
    rarity: "rare",
    description: "Gradient from aquamarine to emerald. Two-tone name color.",
  },
  {
    slug: "aurora",
    name: "Aurora",
    type: "nameColor",
    rarity: "epic",
    description:
      "Animated aurora gradient — shifts between violet, teal, and green.",
  },
  {
    slug: "sunset-chroma",
    name: "Sunset Chroma",
    type: "nameColor",
    rarity: "legendary",
    description:
      "Legendary animated chroma — gold through rose through amber. Head-turning.",
  },

  {
    slug: "card-matte",
    name: "Matte Card",
    type: "profileCard",
    rarity: "common",
    description: "Simple matte-dark profile card with subtle green accent.",
  },
  {
    slug: "card-shwompy",
    name: "Shwompy Card",
    type: "profileCard",
    rarity: "uncommon",
    description: "Shwompy lounging in the corner of your profile card.",
  },
  {
    slug: "card-circuit",
    name: "Circuit Card",
    type: "profileCard",
    rarity: "rare",
    description: "Glowing circuit traces as the card background.",
  },
  {
    slug: "card-holographic",
    name: "Holographic Card",
    type: "profileCard",
    rarity: "epic",
    description:
      "Shimmering holographic finish — the card catches the light as your viewers hover it.",
  },
  {
    slug: "card-seasonal-hero",
    name: "Season 1 Hero Card",
    type: "profileCard",
    rarity: "legendary",
    description:
      "The season hero card. Green & Black art, glowing Shwompy crest, animated border.",
  },

  {
    slug: "flair-ember",
    name: "Ember Flair",
    type: "chatFlair",
    rarity: "rare",
    description: "Your chat messages glow with a warm ember border.",
  },
  {
    slug: "flair-holo",
    name: "Holo Flair",
    type: "chatFlair",
    rarity: "epic",
    description:
      "Holographic frame on your chat line. Shifts through the rainbow.",
  },
  {
    slug: "flair-shwompy-glow",
    name: "Shwompy Glow Flair",
    type: "chatFlair",
    rarity: "legendary",
    description:
      "Signature Season 1 flair — animated green glow pulsing around each message.",
  },
];

const SEASON_QUESTS = [
  {
    slug: "daily-keep-it-going",
    cadence: "daily" as const,
    name: "Keep It Going",
    description: "Watch at least 5 minutes today.",
    xpReward: 75,
    scrapReward: 10,
    crateTokenReward: 0,
    requirement: { type: "watch_minutes" as const, target: 5 },
    active: true,
  },
  {
    slug: "daily-crate-opener",
    cadence: "daily" as const,
    name: "Crate Opener",
    description: "Open any crate today.",
    xpReward: 150,
    scrapReward: 15,
    crateTokenReward: 1,
    requirement: { type: "open_crate" as const, target: 1 },
    active: true,
  },
  {
    slug: "daily-deep-watcher",
    cadence: "daily" as const,
    name: "Deep Watcher",
    description: "Watch 30 minutes today — enough for a daily crate.",
    xpReward: 250,
    scrapReward: 25,
    crateTokenReward: 0,
    requirement: { type: "watch_minutes" as const, target: 30 },
    active: true,
  },
  {
    slug: "weekly-community-explorer",
    cadence: "weekly" as const,
    name: "Community Explorer",
    description: "Watch 10 different channels this week.",
    xpReward: 600,
    scrapReward: 60,
    crateTokenReward: 2,
    requirement: { type: "watch_distinct_channels" as const, target: 10 },
    active: true,
  },
  {
    slug: "weekly-marathon",
    cadence: "weekly" as const,
    name: "Marathon",
    description: "Watch 3 hours this week.",
    xpReward: 800,
    scrapReward: 80,
    crateTokenReward: 1,
    requirement: { type: "watch_minutes" as const, target: 180 },
    active: true,
  },
];

/** Idempotently seeds Season 1 catalog, crates, and quests; retires missing slugs to preserve inventory references. */
export const seedSeason1 = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const existing = await ctx.db
      .query("seasons")
      .withIndex("by_number", (q) => q.eq("seasonNumber", 1))
      .first();

    const now = Date.now();
    const seasonStart = now - 5 * 24 * 3600 * 1000;
    const seasonEnd = now + 85 * 24 * 3600 * 1000;

    let seasonId;
    if (existing) {
      if (!force) {
        return { seasonId: existing._id, alreadySeeded: true };
      }
      seasonId = existing._id;
      await ctx.db.patch(seasonId, {
        name: "Green & Black",
        theme: "green-black",
        startsAt: seasonStart,
        endsAt: seasonEnd,
        tierCount: 20,
        xpPerTier: 500,
        bonusXpMultiplier: 1.5,
        active: true,
      });
    } else {
      seasonId = await ctx.db.insert("seasons", {
        seasonNumber: 1,
        name: "Green & Black",
        theme: "green-black",
        startsAt: seasonStart,
        endsAt: seasonEnd,
        tierCount: 20,
        xpPerTier: 500,
        bonusXpMultiplier: 1.5,
        active: true,
      });
    }

    const flagRow = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", ACTIVE_SEASON_ID_FLAG_KEY))
      .first();
    if (flagRow) {
      await ctx.db.patch(flagRow._id, { value: seasonId, updatedAt: now });
    } else {
      await ctx.db.insert("configFlags", {
        key: ACTIVE_SEASON_ID_FLAG_KEY,
        value: seasonId,
        updatedAt: now,
      });
    }

    let itemsInserted = 0;
    let itemsPatched = 0;
    let itemsRetired = 0;
    let itemsUnretired = 0;
    const currentSlugs = new Set(SEASON_ITEMS.map((i) => i.slug));

    for (const it of SEASON_ITEMS) {
      const existingItem = await ctx.db
        .query("items")
        .withIndex("by_season_slug", (q) =>
          q.eq("seasonId", seasonId).eq("slug", it.slug),
        )
        .first();
      const base = {
        seasonId,
        slug: it.slug,
        name: it.name,
        type: it.type,
        rarity: it.rarity,
        assetSvg: generateItemSvg({
          slug: it.slug,
          type: it.type,
          rarity: it.rarity,
        }),
        animated: it.animated === true,
        description: it.description,
        sellValue: SCRAP_VALUE_PER_RARITY[it.rarity],
        retired: false,
      };
      if (existingItem) {
        if (existingItem.retired) itemsUnretired++;
        await ctx.db.patch(existingItem._id, base);
        itemsPatched++;
      } else {
        await ctx.db.insert("items", base);
        itemsInserted++;
      }
    }

    const allSeasonItems = await ctx.db
      .query("items")
      .withIndex("by_season_rarity", (q) => q.eq("seasonId", seasonId))
      .collect();
    for (const item of allSeasonItems) {
      if (!currentSlugs.has(item.slug) && !item.retired) {
        await ctx.db.patch(item._id, { retired: true });
        itemsRetired++;
      }
    }

    const crateDefs = [
      {
        slug: "daily" as const,
        name: "Daily Crate",
        description: "Watch 30 minutes to unlock. Resets every 24 hours.",
        watchMinutesRequired: DAILY_CRATE_WATCH_MINUTES,
        cooldownHours: 24,
        cardsPerOpen: CARDS_PER_CRATE,
        rarityWeights: DEFAULT_RARITY_WEIGHTS.daily,
        tokenGated: false,
        active: true,
      },
      {
        slug: "weekly" as const,
        name: "Weekly Crate",
        description:
          "Watch 3 hours this week. Better odds for rare and epic drops.",
        watchMinutesRequired: WEEKLY_CRATE_WATCH_MINUTES,
        cooldownHours: 24 * 7,
        cardsPerOpen: CARDS_PER_CRATE,
        rarityWeights: DEFAULT_RARITY_WEIGHTS.weekly,
        tokenGated: false,
        active: true,
      },
      {
        slug: "monthly" as const,
        name: "Monthly Crate",
        description: "The big one. 10 hours for the best legendary odds.",
        watchMinutesRequired: MONTHLY_CRATE_WATCH_MINUTES,
        cooldownHours: 24 * 30,
        cardsPerOpen: CARDS_PER_CRATE,
        rarityWeights: DEFAULT_RARITY_WEIGHTS.monthly,
        tokenGated: false,
        active: true,
      },
      {
        slug: "season" as const,
        name: "Season Crate",
        description:
          "Green & Black exclusive drops. Earn tokens from the Battle Pass or weekly quests.",
        cardsPerOpen: CARDS_PER_CRATE,
        rarityWeights: DEFAULT_RARITY_WEIGHTS.season,
        tokenGated: true,
        active: true,
        seasonId,
      },
    ];

    for (const def of crateDefs) {
      const existingCrate = await ctx.db
        .query("crateDef")
        .withIndex("by_slug", (q) => q.eq("slug", def.slug))
        .first();
      if (existingCrate) {
        await ctx.db.patch(existingCrate._id, def);
      } else {
        await ctx.db.insert("crateDef", def);
      }
    }

    for (const def of SEASON_QUESTS) {
      const existingQuest = await ctx.db
        .query("questDef")
        .withIndex("by_slug", (q) => q.eq("slug", def.slug))
        .first();
      if (existingQuest) {
        await ctx.db.patch(existingQuest._id, def);
      } else {
        await ctx.db.insert("questDef", def);
      }
    }

    return {
      seasonId,
      alreadySeeded: false,
      itemsInserted,
      itemsPatched,
      itemsRetired,
      itemsUnretired,
      cratesDefined: crateDefs.length,
      questsDefined: SEASON_QUESTS.length,
    };
  },
});

/**
 * One-shot migration for the `scrapValueOnDupe` → `sellValue` rename.
 *
 * Walks every row in `items` and:
 *  - Sets `sellValue` from the legacy `scrapValueOnDupe` value when
 *    the new field is missing, so the UI's sell button lights up on
 *    duplicates without waiting for a full re-seed.
 *  - Unsets the legacy field so schema strictness doesn't flag rows
 *    that still carry an unknown extra key.
 *
 * Run once after deploying the schema rename:
 *   npx convex run seed:migrateSellValue
 *
 * Safe to re-run — no-op on rows that already carry only `sellValue`.
 */
export const migrateSellValue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("items").collect();
    let filled = 0;
    let cleaned = 0;
    for (const row of rows) {
      const raw = row as unknown as {
        sellValue?: number;
        scrapValueOnDupe?: number;
      };
      const legacy = raw.scrapValueOnDupe;
      const hasNew = typeof raw.sellValue === "number";
      const hasLegacy = typeof legacy === "number";
      if (!hasNew && hasLegacy) {
        await ctx.db.patch(row._id, {
          sellValue: legacy,
          scrapValueOnDupe: undefined,
        } as unknown as { sellValue: number });
        filled++;
        continue;
      }
      if (hasLegacy) {
        await ctx.db.patch(row._id, {
          scrapValueOnDupe: undefined,
        } as unknown as Record<string, never>);
        cleaned++;
      }
    }
    return { total: rows.length, filled, cleaned };
  },
});
