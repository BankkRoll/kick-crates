// Game-balance knobs and the level curve. Units are explicit in each name:
// *_SECONDS, *_MINUTES, *_HOURS, *_DAYS. Crate watch requirements are
// minutes; caps and TTLs are seconds. Rarity and slug string literals here
// mirror the union validators in schema.ts and drift between the two is a
// silent bug. Changing any weight, cap, or curve constant is a balance
// change that also ships to the extension build.

export const XP_PER_ACTIVE_SECOND = 1 / 60;

export const DAILY_XP_CAP_SECONDS = 240 * 60;
export const PER_CHANNEL_DAILY_CAP_SECONDS = 60 * 60;

export const HEARTBEAT_MIN_INTERVAL_SECONDS = 30;
export const HEARTBEAT_MAX_INTERVAL_SECONDS = 60;
export const HEARTBEAT_GRACE_SECONDS = 20;
export const HEARTBEAT_JITTER_SECONDS = 10;

export const SESSION_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const PKCE_TTL_SECONDS = 10 * 60;

export const KICK_CHANNEL_CACHE_PREFIX = "kickChannel:";
export const KICK_CHANNEL_CACHE_TTL_SECONDS = 60;
/** Intentionally longer than the cache TTL so clock drift between writer and reader doesn't reject legitimate sessions, but short enough that an abandoned entry can't be replayed. */
export const KICK_CHANNEL_VERIFY_STALENESS_SECONDS = 5 * 60;

export const DAILY_CRATE_WATCH_MINUTES = 30;
export const WEEKLY_CRATE_WATCH_MINUTES = 180;
export const MONTHLY_CRATE_WATCH_MINUTES = 600;

export const CARDS_PER_CRATE = 5;

export const DEFAULT_RARITY_WEIGHTS = {
  daily: {
    common: 60,
    uncommon: 28,
    rare: 9,
    epic: 2.5,
    legendary: 0.5,
  },
  weekly: {
    common: 45,
    uncommon: 35,
    rare: 15,
    epic: 4,
    legendary: 1,
  },
  monthly: {
    common: 20,
    uncommon: 40,
    rare: 25,
    epic: 10,
    legendary: 5,
  },
  season: {
    common: 10,
    uncommon: 30,
    rare: 35,
    epic: 18,
    legendary: 7,
  },
} as const;

export const SCRAP_VALUE_PER_RARITY: Record<Rarity, number> = {
  common: 3,
  uncommon: 15,
  rare: 75,
  epic: 300,
  legendary: 1500,
};

/** Upper bound on `sellItem` quantity per call; protects the mutation against pathological inputs while leaving plenty of headroom for bulk sells. */
export const SELL_QUANTITY_CAP = 100;

export const XP_CURVE_BASE = 180;
export const XP_CURVE_EXPONENT = 1.35;

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(XP_CURVE_BASE * Math.pow(level - 1, XP_CURVE_EXPONENT));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpRequiredForLevel(l);
  }
  return total;
}

export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (true) {
    const need = xpRequiredForLevel(level + 1);
    if (need === 0 || remaining < need) return level;
    remaining -= need;
    level++;
    if (level > 200) return level;
  }
}

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CrateSlug = "daily" | "weekly" | "monthly" | "season";
export type ItemType = "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";

export const KICK_API_BASE = "https://api.kick.com/public/v1";
export const KICK_OAUTH_AUTHORIZE = "https://id.kick.com/oauth/authorize";
export const KICK_OAUTH_TOKEN = "https://id.kick.com/oauth/token";

export const REQUESTED_SCOPES = ["user:read", "channel:read"] as const;

export const MIN_EXTENSION_VERSION_FLAG_KEY = "minExtensionVersion";
export const ENABLED_FEATURES_FLAG_KEY = "enabledFeatures";
export const ACTIVE_SEASON_ID_FLAG_KEY = "activeSeasonId";

export const MAX_LOADOUT_TITLE_LENGTH = 64;

/** Sole scrap sink; season crates are the only gated drop pool so scrap has purpose without a shop surface. */
export const SCRAP_COST_PER_SEASON_TOKEN = 300;

export const SESSION_TOKEN_RETENTION_DAYS = 30;
export const DAILY_USAGE_RETENTION_DAYS = 90;
export const TELEMETRY_RETENTION_DAYS = 30;
export const REAP_BATCH_SIZE = 500;
