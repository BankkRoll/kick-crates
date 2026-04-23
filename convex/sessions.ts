// Watch-session lifecycle and the XP-earning heartbeat loop. start requires
// a fresh channel verification from kickChannel.lookupBySlug (cache row must
// be present and non-stale) so clients cannot fabricate a broadcaster. Each
// heartbeat validates a rotating nonce, enforces min/max interval plus
// grace, applies daily and per-channel second caps, and only then grants XP
// and crate seconds. Superseded/missed/flagged sessions are closed server-
// side; reapStale is the cron backstop for abandoned tabs.
import { mutation, internalMutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import { requireUser } from "./auth.js";
import { err } from "./lib/errors.js";
import { randomToken } from "./lib/crypto.js";
import { dayKeyUTC, now as nowMs } from "./lib/time.js";
import {
  DAILY_XP_CAP_SECONDS,
  PER_CHANNEL_DAILY_CAP_SECONDS,
  HEARTBEAT_MIN_INTERVAL_SECONDS,
  HEARTBEAT_MAX_INTERVAL_SECONDS,
  HEARTBEAT_GRACE_SECONDS,
  HEARTBEAT_JITTER_SECONDS,
  XP_PER_ACTIVE_SECOND,
  KICK_CHANNEL_CACHE_PREFIX,
  KICK_CHANNEL_VERIFY_STALENESS_SECONDS,
  levelFromTotalXp,
} from "./lib/constants.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import { addSecondsToCratesInline } from "./crates.js";
import { bumpQuestProgressInline } from "./quests.js";
import { grantXp } from "./lib/seasonXp.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";

const signalsValidator = v.object({
  tabVisible: v.boolean(),
  videoPlaying: v.boolean(),
  videoPositionAdvanced: v.boolean(),
  msSinceLastActivity: v.number(),
  volumeNonZero: v.boolean(),
  documentHasFocus: v.boolean(),
});

type Signals = {
  tabVisible: boolean;
  videoPlaying: boolean;
  videoPositionAdvanced: boolean;
  msSinceLastActivity: number;
  volumeNonZero: boolean;
  documentHasFocus: boolean;
};

function pickIntervalSeconds(): number {
  const jitter =
    Math.floor(Math.random() * (HEARTBEAT_JITTER_SECONDS * 2 + 1)) -
    HEARTBEAT_JITTER_SECONDS;
  const raw =
    HEARTBEAT_MAX_INTERVAL_SECONDS - HEARTBEAT_JITTER_SECONDS + jitter;
  return Math.max(
    HEARTBEAT_MIN_INTERVAL_SECONDS,
    Math.min(HEARTBEAT_MAX_INTERVAL_SECONDS, raw),
  );
}

function signalsPass(s: Signals): boolean {
  if (!s.tabVisible) return false;
  if (!s.videoPlaying) return false;
  if (!s.videoPositionAdvanced) return false;
  if (s.msSinceLastActivity > 10 * 60 * 1000) return false;
  return true;
}

async function getOrCreateDailyUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  at: number,
): Promise<Doc<"dailyUsage">> {
  const dateKey = dayKeyUTC(at);
  const existing = await ctx.db
    .query("dailyUsage")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).eq("dateKey", dateKey),
    )
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("dailyUsage", {
    userId,
    dateKey,
    totalSeconds: 0,
    totalXp: 0,
    perChannelSeconds: {},
    distinctChannels: [],
    updatedAt: at,
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("dailyUsage insert did not roundtrip");
  return row;
}

async function endSessionInternal(
  ctx: MutationCtx,
  sessionId: Id<"watchSessions">,
  reason: "heartbeat_missed" | "user_ended" | "superseded" | "flagged",
  at: number,
): Promise<void> {
  const session = await ctx.db.get(sessionId);
  if (!session || session.endedAt) return;
  await ctx.db.patch(sessionId, { endedAt: at, endReason: reason });
}

async function recordFraudFlag(
  ctx: MutationCtx,
  userId: Id<"users">,
  kind: string,
  severity: number,
  detail: Record<string, unknown>,
): Promise<void> {
  await ctx.db.insert("fraudFlags", {
    userId,
    kind,
    severity,
    detail,
    at: nowMs(),
  });
}

/** Opens a watch session after verifying the channel slug resolves to a live Kick broadcaster via a fresh lookup cache hit. */
export const start = mutation({
  args: {
    broadcasterUserId: v.number(),
    channelSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "startSession", {
      key: user._id,
      throws: true,
    });

    const now = nowMs();

    const slug = args.channelSlug.trim().toLowerCase();
    if (!slug) err("INVALID_INPUT", "channelSlug is required");
    const cacheRow = await ctx.db
      .query("configFlags")
      .withIndex("by_key", (q) => q.eq("key", KICK_CHANNEL_CACHE_PREFIX + slug))
      .first();
    if (!cacheRow) {
      err(
        "INVALID_INPUT",
        "channel not verified — call kickChannel.lookupBySlug first",
      );
    }
    const cached = cacheRow.value as {
      broadcasterUserId?: number;
      slug?: string;
      isLive?: boolean;
      cachedAt?: number;
    } | null;
    if (
      !cached ||
      typeof cached.broadcasterUserId !== "number" ||
      typeof cached.cachedAt !== "number"
    ) {
      err("INVALID_INPUT", "channel cache malformed");
    }
    if (cached.cachedAt + KICK_CHANNEL_VERIFY_STALENESS_SECONDS * 1000 < now) {
      err(
        "INVALID_INPUT",
        "channel verification stale — call kickChannel.lookupBySlug again",
      );
    }
    if (cached.broadcasterUserId !== args.broadcasterUserId) {
      err("INVALID_INPUT", "broadcasterUserId does not match channelSlug");
    }
    if (cached.isLive !== true) err("CHANNEL_NOT_LIVE");

    const openSessions = await ctx.db
      .query("watchSessions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("endedAt", undefined),
      )
      .collect();
    for (const s of openSessions) {
      await endSessionInternal(ctx, s._id, "superseded", now);
    }

    const nonce = randomToken(24);
    const intervalSec = pickIntervalSeconds();
    const nextDue = now + (intervalSec + HEARTBEAT_GRACE_SECONDS) * 1000;

    const sessionId = await ctx.db.insert("watchSessions", {
      userId: user._id,
      broadcasterUserId: args.broadcasterUserId,
      channelSlug: args.channelSlug,
      startedAt: now,
      lastHeartbeatAt: now,
      currentNonce: nonce,
      nonceIssuedAt: now,
      nextHeartbeatDueBy: nextDue,
      activeSeconds: 0,
      xpEarned: 0,
      heartbeatCount: 0,
      flagged: false,
    });

    await ctx.db.patch(user._id, { lastActiveAt: now });

    return {
      sessionId,
      nonce,
      nextHeartbeatDueBy: nextDue,
      minIntervalMs: HEARTBEAT_MIN_INTERVAL_SECONDS * 1000,
      suggestedIntervalMs: intervalSec * 1000,
    };
  },
});

/** Validates a heartbeat nonce+signals, credits capped watch seconds and XP, and rotates the nonce; also enforces single-session-per-user as a second layer. */
export const heartbeat = mutation({
  args: {
    sessionId: v.id("watchSessions"),
    nonce: v.string(),
    signals: signalsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "heartbeat", { key: user._id, throws: true });

    const session = await ctx.db.get(args.sessionId);
    if (!session) err("SESSION_NOT_FOUND");
    if (session.userId !== user._id)
      err("UNAUTHORIZED", "session does not belong to user");
    if (session.endedAt)
      err("SESSION_ENDED", undefined, { reason: session.endReason });
    if (session.currentNonce !== args.nonce) {
      await recordFraudFlag(ctx, user._id, "nonce_mismatch", 3, {
        sessionId: session._id,
        presentedNonce: args.nonce,
      });
      err("NONCE_MISMATCH");
    }

    const latestOpen = await ctx.db
      .query("watchSessions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("endedAt", undefined),
      )
      .order("desc")
      .first();
    if (latestOpen && latestOpen._id !== session._id) {
      await endSessionInternal(ctx, session._id, "superseded", nowMs());
      await recordFraudFlag(ctx, user._id, "superseded_replay", 2, {
        sessionId: session._id,
        latestOpenId: latestOpen._id,
      });
      err("SESSION_ENDED", "superseded by newer session", {
        reason: "superseded",
      });
    }

    const now = nowMs();
    if (now < session.nonceIssuedAt + HEARTBEAT_MIN_INTERVAL_SECONDS * 1000) {
      err("HEARTBEAT_TOO_EARLY");
    }
    if (now > session.nextHeartbeatDueBy + HEARTBEAT_GRACE_SECONDS * 1000) {
      await endSessionInternal(ctx, session._id, "heartbeat_missed", now);
      await recordFraudFlag(ctx, user._id, "heartbeat_too_late", 1, {
        sessionId: session._id,
        dueBy: session.nextHeartbeatDueBy,
        now,
      });
      err("HEARTBEAT_TOO_LATE");
    }

    const daily = await getOrCreateDailyUsage(ctx, user._id, now);
    const elapsedMs = Math.min(
      now - session.lastHeartbeatAt,
      (HEARTBEAT_MAX_INTERVAL_SECONDS + HEARTBEAT_GRACE_SECONDS) * 1000,
    );
    const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));

    const pass = signalsPass(args.signals);

    let creditedSec = 0;
    let xpDelta = 0;

    if (pass && elapsedSec > 0) {
      const remainingDaily = Math.max(
        0,
        DAILY_XP_CAP_SECONDS - daily.totalSeconds,
      );
      const channelKey = String(session.broadcasterUserId);
      const perChannelSoFar = daily.perChannelSeconds[channelKey] ?? 0;
      const remainingChannel = Math.max(
        0,
        PER_CHANNEL_DAILY_CAP_SECONDS - perChannelSoFar,
      );
      creditedSec = Math.min(elapsedSec, remainingDaily, remainingChannel);
      xpDelta = Math.floor(creditedSec * XP_PER_ACTIVE_SECOND * 60);
    }

    const nextNonce = randomToken(24);
    const intervalSec = pickIntervalSeconds();
    const nextDue = now + (intervalSec + HEARTBEAT_GRACE_SECONDS) * 1000;

    await ctx.db.patch(session._id, {
      lastHeartbeatAt: now,
      currentNonce: nextNonce,
      nonceIssuedAt: now,
      nextHeartbeatDueBy: nextDue,
      activeSeconds: session.activeSeconds + creditedSec,
      xpEarned: session.xpEarned + xpDelta,
      heartbeatCount: session.heartbeatCount + 1,
    });

    if (creditedSec > 0) {
      const newPerChannel = { ...daily.perChannelSeconds };
      const channelKey = String(session.broadcasterUserId);
      newPerChannel[channelKey] =
        (newPerChannel[channelKey] ?? 0) + creditedSec;
      const newDistinct = daily.distinctChannels.includes(channelKey)
        ? daily.distinctChannels
        : [...daily.distinctChannels, channelKey];
      await ctx.db.patch(daily._id, {
        totalSeconds: daily.totalSeconds + creditedSec,
        totalXp: daily.totalXp + xpDelta,
        perChannelSeconds: newPerChannel,
        distinctChannels: newDistinct,
        updatedAt: now,
      });
    }

    let newTotalXp = user.totalXp;
    let newLevel = user.level;
    if (xpDelta > 0) {
      const granted = await grantXp(ctx, user, xpDelta, levelFromTotalXp);
      newTotalXp = granted.newTotalXp;
      newLevel = granted.newLevel;
      await ctx.db.patch(user._id, {
        totalXp: granted.newTotalXp,
        seasonXp: granted.newSeasonXp,
        level: granted.newLevel,
        lastActiveAt: now,
      });
      await ctx.db.insert("xpEvents", {
        userId: user._id,
        source: "watch",
        amount: xpDelta,
        newLevel: granted.newLevel,
        watchSessionId: session._id,
        at: now,
      });
    } else {
      await ctx.db.patch(user._id, { lastActiveAt: now });
    }

    if (creditedSec > 0) {
      await addSecondsToCratesInline(ctx, user._id, creditedSec);
      const minutes =
        Math.floor((session.activeSeconds + creditedSec) / 60) -
        Math.floor(session.activeSeconds / 60);
      if (minutes > 0) {
        await bumpQuestProgressInline(
          ctx,
          user._id,
          "watch_minutes",
          minutes,
          now,
        );
      }
      const channelKey = String(session.broadcasterUserId);
      const wasNewChannel = !daily.distinctChannels.includes(channelKey);
      if (wasNewChannel) {
        await bumpQuestProgressInline(
          ctx,
          user._id,
          "watch_distinct_channels",
          1,
          now,
        );
      }
    }

    return {
      nextNonce,
      nextHeartbeatDueBy: nextDue,
      minIntervalMs: HEARTBEAT_MIN_INTERVAL_SECONDS * 1000,
      suggestedIntervalMs: intervalSec * 1000,
      xpDelta,
      creditedSeconds: creditedSec,
      newTotalXp,
      newLevel,
      signalsAccepted: pass,
    };
  },
});

/** Client-initiated session close; requires the current nonce to prevent third parties ending another tab's session. */
export const endByUser = mutation({
  args: {
    sessionId: v.id("watchSessions"),
    nonce: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) err("SESSION_NOT_FOUND");
    if (session.userId !== user._id) err("UNAUTHORIZED");
    if (session.endedAt)
      return { alreadyEnded: true, reason: session.endReason ?? null };
    if (session.currentNonce !== args.nonce) err("NONCE_MISMATCH");

    await endSessionInternal(ctx, session._id, "user_ended", nowMs());
    return { alreadyEnded: false, reason: "user_ended" as const };
  },
});

/** Returns the caller's currently-open watch session, or null. */
export const currentSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject as Id<"users">;
    const session = await ctx.db
      .query("watchSessions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("endedAt", undefined),
      )
      .first();
    if (!session) return null;
    return {
      _id: session._id,
      broadcasterUserId: session.broadcasterUserId,
      channelSlug: session.channelSlug,
      startedAt: session.startedAt,
      lastHeartbeatAt: session.lastHeartbeatAt,
      activeSeconds: session.activeSeconds,
      xpEarned: session.xpEarned,
      heartbeatCount: session.heartbeatCount,
      nextHeartbeatDueBy: session.nextHeartbeatDueBy,
    };
  },
});

/** Cron-driven sweep that closes sessions past their heartbeat deadline. */
export const reapStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = nowMs();
    const stale = await ctx.db
      .query("watchSessions")
      .withIndex("by_due", (q) =>
        q.eq("endedAt", undefined).lt("nextHeartbeatDueBy", now),
      )
      .take(200);
    for (const s of stale) {
      await endSessionInternal(ctx, s._id, "heartbeat_missed", now);
    }
    return { reaped: stale.length };
  },
});
