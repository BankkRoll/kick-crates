import { api } from "../../../../convex/_generated/api.js";
import type { Id } from "../../../../convex/_generated/dataModel.js";
import { authedHttpClient, clearAllCaches } from "../convex.js";
import { clearSession } from "../storage.js";
import { record as recordTelemetry } from "../telemetry.js";
import type { HeartbeatSignals } from "../messaging.js";

const ALARM_NAME = "kc_heartbeat";

type ActiveSession = {
  sessionId: Id<"watchSessions">;
  broadcasterUserId: number;
  channelSlug: string;
  tabId: number;
  nonce: string;
  startedAtMs: number;
  lastHeartbeatAt: number;
  nextHeartbeatDueBy: number;
  minIntervalMs: number;
  suggestedIntervalMs: number;
  activeSeconds: number;
  xpEarned: number;
  pendingSignals: HeartbeatSignals | null;
};

let active: ActiveSession | null = null;
let heartbeatInFlight = false;

/** Returns the in-memory active session, or `null` when no watch session is running. */
export function getActiveSession(): ActiveSession | null {
  return active;
}

/**
 * Starts a new watch session on the server and installs the alarm that
 * drives subsequent heartbeats.
 *
 * Any pre-existing session is first ended with the `"superseded"`
 * reason so each tab owns at most one active session in the service
 * worker. The server-issued `nonce` and pacing hints
 * (`minIntervalMs` / `suggestedIntervalMs`) are kept in memory and
 * used by {@link onAlarm} for the next heartbeat.
 *
 * @returns `{ ok: true, sessionId }` on success, or a structured error.
 */
export async function startSession(params: {
  broadcasterUserId: number;
  channelSlug: string;
  tabId: number;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  try {
    await endSession("superseded").catch(() => {});
    const client = await authedHttpClient();
    if (!client) return { ok: false, error: "not signed in" };
    const res = await client.mutation(api.sessions.start, {
      broadcasterUserId: params.broadcasterUserId,
      channelSlug: params.channelSlug,
    });
    active = {
      sessionId: res.sessionId,
      broadcasterUserId: params.broadcasterUserId,
      channelSlug: params.channelSlug,
      tabId: params.tabId,
      nonce: res.nonce,
      startedAtMs: Date.now(),
      lastHeartbeatAt: Date.now(),
      nextHeartbeatDueBy: res.nextHeartbeatDueBy,
      minIntervalMs: res.minIntervalMs,
      suggestedIntervalMs: res.suggestedIntervalMs,
      activeSeconds: 0,
      xpEarned: 0,
      pendingSignals: null,
    };
    await scheduleNextAlarm(res.suggestedIntervalMs);
    return { ok: true, sessionId: res.sessionId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Ends the active session locally and, for user-initiated ends,
 * notifies the server so watch time finalizes cleanly.
 *
 * The session is cleared from memory and the heartbeat alarm is
 * canceled before the network call, so a slow or failing server
 * response can't resurrect a zombie session. The server is only
 * contacted for the `"user_ended"` reason — for `"superseded"`,
 * `"server_rejected"`, and `"auth_invalid"` the server already knows
 * (or won't accept a call), so we just drop local state.
 *
 * @param reason Why the session is ending, used to branch server-call
 *               behavior and telemetry.
 */
export async function endSession(
  reason: "user_ended" | "superseded" | "server_rejected" | "auth_invalid",
): Promise<void> {
  if (!active) return;
  const snapshot = active;
  active = null;
  await chrome.alarms.clear(ALARM_NAME).catch(() => {});
  if (reason === "user_ended") {
    try {
      const client = await authedHttpClient();
      if (!client) return;
      await client.mutation(api.sessions.endByUser, {
        sessionId: snapshot.sessionId,
        nonce: snapshot.nonce,
      });
    } catch {}
  }
}

/** Stores the latest heartbeat signals from the content script; the next {@link onAlarm} tick will send them. */
export function recordSignals(signals: HeartbeatSignals): void {
  if (!active) return;
  active.pendingSignals = signals;
}

/** Schedules the next heartbeat alarm, clamped to a 30 s floor (MV3 alarms fire at a coarse minimum granularity). */
export async function scheduleNextAlarm(delayMs: number): Promise<void> {
  const when = Date.now() + Math.max(delayMs, 30_000);
  await chrome.alarms.create(ALARM_NAME, { when });
}

/**
 * `chrome.alarms` handler that executes a single heartbeat against the
 * Convex `sessions.heartbeat` mutation and reschedules.
 *
 * Ignores alarms for any other name, exits early when there's no
 * active session, and re-entrancy is prevented by the
 * `heartbeatInFlight` guard (two overlapping alarms would spend the
 * same nonce and trip the server's `NONCE_MISMATCH`).
 *
 * Errors are classified so the session can fail closed appropriately:
 *
 *  - Auth-class errors (`TOKEN_REVOKED`, `TOKEN_EXPIRED`,
 *    `UNAUTHENTICATED`, `USER_BANNED`) clear the stored JWT and drop
 *    cached clients — the UI will surface a signed-out state on the
 *    next interaction rather than loop on a dead token.
 *  - Session-rejection errors (`SESSION_ENDED`, `SESSION_NOT_FOUND`,
 *    `HEARTBEAT_TOO_LATE`, `NONCE_MISMATCH`) end the session as
 *    `"server_rejected"` — a new session can start on the next route.
 *  - Everything else is treated as transient: we reschedule with a
 *    capped delay and keep the session alive.
 */
export async function onAlarm(alarmName: string): Promise<void> {
  if (alarmName !== ALARM_NAME) return;
  if (!active) return;
  if (heartbeatInFlight) return;
  heartbeatInFlight = true;
  try {
    const signals = active.pendingSignals ?? safeDefaultSignals();
    const client = await authedHttpClient();
    if (!client) {
      await endSession("user_ended").catch(() => {});
      return;
    }
    const res = await client.mutation(api.sessions.heartbeat, {
      sessionId: active.sessionId,
      nonce: active.nonce,
      signals,
    });
    if (!active) return;
    active.nonce = res.nextNonce;
    active.nextHeartbeatDueBy = res.nextHeartbeatDueBy;
    active.minIntervalMs = res.minIntervalMs;
    active.suggestedIntervalMs = res.suggestedIntervalMs;
    active.lastHeartbeatAt = Date.now();
    active.activeSeconds += res.creditedSeconds ?? 0;
    active.xpEarned += res.xpDelta ?? 0;
    await scheduleNextAlarm(res.suggestedIntervalMs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const authInvalid =
      msg.includes("TOKEN_REVOKED") ||
      msg.includes("TOKEN_EXPIRED") ||
      msg.includes("UNAUTHENTICATED") ||
      msg.includes("USER_BANNED");
    const sessionRejected =
      msg.includes("SESSION_ENDED") ||
      msg.includes("SESSION_NOT_FOUND") ||
      msg.includes("HEARTBEAT_TOO_LATE") ||
      msg.includes("NONCE_MISMATCH");
    if (authInvalid) {
      recordTelemetry("heartbeat.auth_invalid", { message: msg });
      await endSession("auth_invalid").catch(() => {});
      await clearSession().catch(() => {});
      clearAllCaches();
    } else if (sessionRejected) {
      recordTelemetry("heartbeat.session_rejected", { message: msg });
      await endSession("server_rejected").catch(() => {});
    } else {
      recordTelemetry("heartbeat.transient_error", { message: msg });
      if (active) {
        await scheduleNextAlarm(Math.min(active.suggestedIntervalMs, 60_000));
      }
    }
  } finally {
    heartbeatInFlight = false;
  }
}

function safeDefaultSignals(): HeartbeatSignals {
  return {
    tabVisible: false,
    videoPlaying: false,
    videoPositionAdvanced: false,
    msSinceLastActivity: 24 * 60 * 60 * 1000,
    volumeNonZero: false,
    documentHasFocus: false,
  };
}
