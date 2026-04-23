// Kick channel resolution with two stacked caches, both stored as rows in
// configFlags (keyed by APP_TOKEN_KEY and KICK_CHANNEL_CACHE_PREFIX+slug) so
// they survive redeploys without a dedicated table. The app token is
// client_credentials, refreshed ~10 minutes before Kick's stated expiry;
// channel entries expire after KICK_CHANNEL_CACHE_TTL_SECONDS. lookupBySlug
// is the only public entry point — internalQuery/Mutation helpers exist
// solely because actions cannot touch the db directly.

import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import {
  KICK_OAUTH_TOKEN,
  KICK_API_BASE,
  KICK_CHANNEL_CACHE_PREFIX,
  KICK_CHANNEL_CACHE_TTL_SECONDS,
} from "./lib/constants.js";
import { err } from "./lib/errors.js";

const APP_TOKEN_KEY = "kickAppToken";

type AppTokenEntry = { accessToken: string; expiresAt: number };
type ChannelEntry = {
  broadcasterUserId: number;
  slug: string;
  isLive: boolean;
  cachedAt: number;
};

async function fetchAppToken(): Promise<string> {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    err("SERVER_MISCONFIGURED", "KICK_CLIENT_ID/SECRET not set");
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(KICK_OAUTH_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    err("KICK_API_ERROR", "client_credentials failed: " + res.status);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  return json.access_token;
}

/** Returns a stored Kick app token only if it has more than 60s of life remaining. */
export const getCachedAppToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", APP_TOKEN_KEY))
      .first();
    if (!row) return null;
    const val = row.value as AppTokenEntry | null;
    if (!val || val.expiresAt < Date.now() + 60_000) return null;
    return val;
  },
});

/** Upserts the Kick client-credentials app token into configFlags. */
export const storeAppToken = internalMutation({
  args: { accessToken: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", APP_TOKEN_KEY))
      .first();
    const value: AppTokenEntry = {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
    };
    if (row) {
      await ctx.db.patch(row._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("configFlags", {
        key: APP_TOKEN_KEY,
        value,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Returns a cached channel lookup by slug if still within the configured TTL. */
export const getCachedChannel = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const key = KICK_CHANNEL_CACHE_PREFIX + args.slug.toLowerCase();
    const row = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!row) return null;
    const val = row.value as ChannelEntry | null;
    if (!val) return null;
    if (val.cachedAt + KICK_CHANNEL_CACHE_TTL_SECONDS * 1000 < Date.now())
      return null;
    return val;
  },
});

/** Upserts a channel lookup result keyed by lowercased slug. */
export const storeChannelCache = internalMutation({
  args: {
    slug: v.string(),
    broadcasterUserId: v.number(),
    isLive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const key = KICK_CHANNEL_CACHE_PREFIX + args.slug.toLowerCase();
    const value: ChannelEntry = {
      broadcasterUserId: args.broadcasterUserId,
      slug: args.slug,
      isLive: args.isLive,
      cachedAt: Date.now(),
    };
    const row = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (row) {
      await ctx.db.patch(row._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("configFlags", { key, value, updatedAt: Date.now() });
    }
  },
});

/** Resolves a Kick slug to broadcaster id and live status, using token and channel caches. */
export const lookupBySlug = action({
  args: { slug: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    broadcasterUserId: number;
    slug: string;
    isLive: boolean;
  } | null> => {
    const slug = args.slug.trim().toLowerCase();
    if (!slug) return null;

    const cached: ChannelEntry | null = await ctx.runQuery(
      internal.kickChannel.getCachedChannel,
      { slug },
    );
    if (cached) {
      return {
        broadcasterUserId: cached.broadcasterUserId,
        slug: cached.slug,
        isLive: cached.isLive,
      };
    }

    let token: AppTokenEntry | null = await ctx.runQuery(
      internal.kickChannel.getCachedAppToken,
      {},
    );
    if (!token) {
      const accessToken = await fetchAppToken();
      const expiresAt = Date.now() + 50 * 60 * 1000;
      await ctx.runMutation(internal.kickChannel.storeAppToken, {
        accessToken,
        expiresAt,
      });
      token = { accessToken, expiresAt };
    }

    const url = new URL(KICK_API_BASE + "/channels");
    url.searchParams.append("slug", slug);
    const res = await fetch(url, {
      headers: { authorization: "Bearer " + token.accessToken },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      err("KICK_API_ERROR", "channel lookup failed: " + res.status);
    }
    const json = (await res.json()) as {
      data: Array<{
        broadcaster_user_id: number;
        slug: string;
        stream?: { is_live?: boolean };
      }>;
    };
    const channel = json.data[0];
    if (!channel) return null;
    const isLive = channel.stream?.is_live === true;
    await ctx.runMutation(internal.kickChannel.storeChannelCache, {
      slug,
      broadcasterUserId: channel.broadcaster_user_id,
      isLive,
    });
    return {
      broadcasterUserId: channel.broadcaster_user_id,
      slug,
      isLive,
    };
  },
});
