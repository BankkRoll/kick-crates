// Caller-identity helpers every authenticated query/mutation routes through.
// requireUser re-checks the jti in sessionTokens on every call so revocation
// is immediate rather than waiting for JWT expiry, and bans take effect on
// the next request. JWT verification itself happens upstream in Convex's
// customJwt provider (see auth.config.ts); this file trusts identity.subject
// but treats the jti as authoritative for liveness.
import type { QueryCtx, MutationCtx } from "./_generated/server.js";
import type { Id, Doc } from "./_generated/dataModel.js";
import { err } from "./lib/errors.js";

/** Resolves the caller's user doc or throws; enforces ban and session-token revocation/expiry. */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) err("UNAUTHENTICATED");

  const userId = identity.subject as Id<"users">;
  const user = await ctx.db.get(userId);
  if (!user) err("UNAUTHORIZED", "user not found for token subject");
  if (user.bannedAt) err("USER_BANNED", "this account has been banned");

  const jti = (identity as unknown as { tokenIdentifier?: string; jti?: string }).jti;
  if (jti) {
    const token = await ctx.db
      .query("sessionTokens")
      .withIndex("by_jti", (q) => q.eq("jti", jti))
      .first();
    if (!token) err("TOKEN_REVOKED", "session token not recognized");
    if (token.revokedAt) err("TOKEN_REVOKED", "session token has been revoked");
    if (token.expiresAt < Date.now()) err("TOKEN_EXPIRED");
  }

  return user;
}

/** Returns the caller's user doc, or null if unauthenticated or banned. */
export async function optionalUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.get(identity.subject as Id<"users">);
  if (!user || user.bannedAt) return null;
  return user;
}
