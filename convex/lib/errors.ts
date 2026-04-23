// Closed set of error codes the extension client switches on. Every thrown
// failure from a Convex function goes through err() so the payload shape
// ({ code, message, ...meta }) is uniform; the extension's error boundary
// depends on that contract. Add a new code here before throwing it.

import { ConvexError } from "convex/values";

export type KickCratesErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "OAUTH_STATE_MISSING"
  | "OAUTH_STATE_EXPIRED"
  | "OAUTH_STATE_CONSUMED"
  | "OAUTH_EXCHANGE_FAILED"
  | "SESSION_NOT_FOUND"
  | "SESSION_ENDED"
  | "NONCE_MISMATCH"
  | "HEARTBEAT_TOO_EARLY"
  | "HEARTBEAT_TOO_LATE"
  | "DAILY_CAP_REACHED"
  | "CHANNEL_CAP_REACHED"
  | "CHANNEL_NOT_LIVE"
  | "CRATE_NOT_READY"
  | "CRATE_INSUFFICIENT_TOKENS"
  | "QUEST_NOT_COMPLETE"
  | "QUEST_ALREADY_CLAIMED"
  | "USER_BANNED"
  | "USER_FLAGGED"
  | "TIER_NOT_REACHED"
  | "TIER_ALREADY_CLAIMED"
  | "TIER_OUT_OF_RANGE"
  | "INSUFFICIENT_SCRAP"
  | "CRATE_NOT_FOUND"
  | "ADMIN_ONLY"
  | "SERVER_MISCONFIGURED"
  | "KICK_API_ERROR";

/** Throws a structured ConvexError the extension client can discriminate on `code`. */
export function err(code: KickCratesErrorCode, message?: string, meta?: Record<string, unknown>): never {
  throw new ConvexError({ code, message: message ?? code, ...(meta ?? {}) });
}
