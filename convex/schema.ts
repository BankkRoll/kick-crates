// Single source of truth for the domain. Timestamps are ms-since-epoch unless
// a field name ends in Seconds. Shared union validators (rarity, itemType,
// crateSlug, questCadence) are declared once here and must stay in lockstep
// with their string-literal twins in lib/constants.ts. Indexes are the only
// supported read path; no table is meant to be full-scanned at runtime.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const rarity = v.union(
  v.literal("common"),
  v.literal("uncommon"),
  v.literal("rare"),
  v.literal("epic"),
  v.literal("legendary"),
);

const itemType = v.union(
  v.literal("emote"),
  v.literal("badge"),
  v.literal("nameColor"),
  v.literal("profileCard"),
  v.literal("chatFlair"),
);

const crateSlug = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("season"),
);

const questCadence = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("season"),
);

const xpSource = v.union(
  v.literal("watch"),
  v.literal("quest"),
  v.literal("bonus"),
  v.literal("admin"),
);

const sessionEndReason = v.union(
  v.literal("heartbeat_missed"),
  v.literal("stream_ended"),
  v.literal("user_ended"),
  v.literal("superseded"),
  v.literal("flagged"),
);

export default defineSchema({
  users: defineTable({
    kickUserId: v.number(),
    kickUsername: v.string(),
    kickProfilePicture: v.optional(v.string()),
    email: v.optional(v.string()),
    totalXp: v.number(),
    level: v.number(),
    scrap: v.number(),
    seasonXp: v.number(),
    currentSeasonId: v.optional(v.id("seasons")),
    firstSeenAt: v.number(),
    lastActiveAt: v.number(),
    // Kill-switch set by admin or auto-flag on hard violations; blocks auth entirely. fraudFlags holds the audit trail.
    fraudFlagged: v.boolean(),
    bannedAt: v.optional(v.number()),
    welcomeGrantedAt: v.optional(v.number()),
    welcomeAcknowledgedAt: v.optional(v.number()),
  })
    .index("by_kick_user_id", ["kickUserId"])
    .index("by_last_active", ["lastActiveAt"]),

  kickTokens: defineTable({
    userId: v.id("users"),
    accessTokenCipher: v.string(),
    accessTokenIv: v.string(),
    refreshTokenCipher: v.string(),
    refreshTokenIv: v.string(),
    expiresAt: v.number(),
    scopes: v.array(v.string()),
    rotatedAt: v.number(),
  }).index("by_user", ["userId"]),

  sessionTokens: defineTable({
    userId: v.id("users"),
    jti: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    extensionVersion: v.optional(v.string()),
  })
    .index("by_jti", ["jti"])
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),

  pendingOauth: defineTable({
    extState: v.string(),
    codeVerifier: v.string(),
    codeChallenge: v.string(),
    redirectUri: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    returnExtensionId: v.optional(v.string()),
  })
    .index("by_ext_state", ["extState"])
    .index("by_expires", ["expiresAt"]),

  watchSessions: defineTable({
    userId: v.id("users"),
    broadcasterUserId: v.number(),
    channelSlug: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    lastHeartbeatAt: v.number(),
    currentNonce: v.string(),
    nonceIssuedAt: v.number(),
    nextHeartbeatDueBy: v.number(),
    activeSeconds: v.number(),
    xpEarned: v.number(),
    heartbeatCount: v.number(),
    flagged: v.boolean(),
    endReason: v.optional(sessionEndReason),
  })
    .index("by_user_active", ["userId", "endedAt"])
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_due", ["endedAt", "nextHeartbeatDueBy"]),

  xpEvents: defineTable({
    userId: v.id("users"),
    source: xpSource,
    amount: v.number(),
    newLevel: v.number(),
    watchSessionId: v.optional(v.id("watchSessions")),
    questDefId: v.optional(v.id("questDef")),
    meta: v.optional(v.any()),
    at: v.number(),
  })
    .index("by_user_at", ["userId", "at"])
    .index("by_session", ["watchSessionId"]),

  dailyUsage: defineTable({
    userId: v.id("users"),
    dateKey: v.string(),
    totalSeconds: v.number(),
    totalXp: v.number(),
    perChannelSeconds: v.record(v.string(), v.number()),
    distinctChannels: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_date", ["userId", "dateKey"])
    .index("by_updated", ["updatedAt"]),

  seasons: defineTable({
    seasonNumber: v.number(),
    name: v.string(),
    theme: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    tierCount: v.number(),
    xpPerTier: v.number(),
    bonusXpMultiplier: v.number(),
    active: v.boolean(),
  })
    .index("by_active", ["active"])
    .index("by_number", ["seasonNumber"]),

  items: defineTable({
    seasonId: v.id("seasons"),
    slug: v.string(),
    name: v.string(),
    type: itemType,
    rarity: rarity,
    assetSvg: v.string(),
    animated: v.boolean(),
    description: v.optional(v.string()),
    scrapValueOnDupe: v.number(),
    retired: v.boolean(),
  })
    .index("by_season_rarity", ["seasonId", "rarity"])
    .index("by_season_slug", ["seasonId", "slug"])
    .index("by_type", ["type"]),

  inventory: defineTable({
    userId: v.id("users"),
    itemId: v.id("items"),
    acquiredAt: v.number(),
    acquiredFrom: v.union(
      v.literal("crate"),
      v.literal("quest"),
      v.literal("pass"),
      v.literal("promo"),
      v.literal("admin"),
    ),
    duplicates: v.number(),
  })
    .index("by_user_item", ["userId", "itemId"])
    .index("by_user", ["userId"]),

  loadouts: defineTable({
    userId: v.id("users"),
    badgeItemId: v.optional(v.id("items")),
    nameColorItemId: v.optional(v.id("items")),
    profileCardItemId: v.optional(v.id("items")),
    chatFlairItemId: v.optional(v.id("items")),
    title: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  crateDef: defineTable({
    slug: crateSlug,
    name: v.string(),
    description: v.string(),
    watchMinutesRequired: v.optional(v.number()),
    cooldownHours: v.optional(v.number()),
    cardsPerOpen: v.number(),
    rarityWeights: v.object({
      common: v.number(),
      uncommon: v.number(),
      rare: v.number(),
      epic: v.number(),
      legendary: v.number(),
    }),
    seasonId: v.optional(v.id("seasons")),
    tokenGated: v.boolean(),
    active: v.boolean(),
  }).index("by_slug", ["slug"]),

  crateState: defineTable({
    userId: v.id("users"),
    crateDefId: v.id("crateDef"),
    secondsEarned: v.number(),
    lastOpenedAt: v.optional(v.number()),
    tokensHeld: v.number(),
    updatedAt: v.number(),
  }).index("by_user_crate", ["userId", "crateDefId"]),

  crateOpens: defineTable({
    userId: v.id("users"),
    crateDefId: v.id("crateDef"),
    openedAt: v.number(),
    rollSeed: v.string(),
    featuredItemId: v.id("items"),
    results: v.array(
      v.object({
        itemId: v.id("items"),
        rarity: rarity,
        wasDuplicate: v.boolean(),
        scrapAwarded: v.number(),
      }),
    ),
    totalScrapAwarded: v.number(),
    xpAwarded: v.number(),
  })
    .index("by_user_opened", ["userId", "openedAt"])
    .index("by_user", ["userId"]),

  questDef: defineTable({
    slug: v.string(),
    cadence: questCadence,
    name: v.string(),
    description: v.string(),
    xpReward: v.number(),
    scrapReward: v.number(),
    crateTokenReward: v.optional(v.number()),
    // Restricted to types whose progress is emitted from our own write paths; chat-DOM or per-channel webhook types are intentionally absent.
    requirement: v.object({
      type: v.union(
        v.literal("watch_minutes"),
        v.literal("watch_distinct_channels"),
        v.literal("open_crate"),
      ),
      target: v.number(),
    }),
    seasonId: v.optional(v.id("seasons")),
    active: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_cadence_active", ["cadence", "active"]),

  questProgress: defineTable({
    userId: v.id("users"),
    questDefId: v.id("questDef"),
    cadenceKey: v.string(),
    progressValue: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    claimed: v.boolean(),
    claimedAt: v.optional(v.number()),
  })
    .index("by_user_quest_cadence", ["userId", "questDefId", "cadenceKey"])
    .index("by_user_cadence", ["userId", "cadenceKey"]),

  // Key/value kill-switches + denormalized pointers. Keys: "minExtensionVersion", "enabledFeatures" (see constants.ts); "activeSeasonId" mirrors seasons.by_active for cheap reads; "kickAppToken" caches the client_credentials bearer; "kickChannel:<slug>" caches channel lookups.
  configFlags: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Audit trail for hard anti-cheat violations and admin.flagUser actions; writes here increment users.fraudFlagged once severity crosses threshold.
  fraudFlags: defineTable({
    userId: v.id("users"),
    kind: v.string(),
    severity: v.number(),
    detail: v.optional(v.any()),
    at: v.number(),
  }).index("by_user_at", ["userId", "at"]),

  tierClaims: defineTable({
    userId: v.id("users"),
    seasonId: v.id("seasons"),
    tierNumber: v.number(),
    itemId: v.id("items"),
    tokensAwarded: v.number(),
    scrapAwarded: v.number(),
    wasDuplicate: v.boolean(),
    claimedAt: v.number(),
  })
    .index("by_user_season", ["userId", "seasonId"])
    .index("by_user_season_tier", ["userId", "seasonId", "tierNumber"]),

  // Bounded observability stream; extension flushes batched events, reap cron deletes rows older than TELEMETRY_RETENTION_DAYS.
  telemetry: defineTable({
    userId: v.optional(v.id("users")),
    kind: v.string(),
    at: v.number(),
    extensionVersion: v.optional(v.string()),
    detail: v.optional(v.any()),
  })
    .index("by_at", ["at"])
    .index("by_user_at", ["userId", "at"])
    .index("by_kind_at", ["kind", "at"]),
});
