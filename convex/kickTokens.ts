// Rotates the Kick access/refresh tokens stored in kickTokens. Ciphertext
// and IV live in the DB; plaintext exists only inside refreshOne for the
// duration of the Kick refresh call, keyed by TOKEN_ENCRYPTION_KEY from env.
// rotateExpiring is the cron entrypoint and walks rows within 24h of expiry;
// per-user rate limiting on refreshToken prevents a bad refresh from
// hammering Kick in a tight loop.
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { aesGcmDecrypt, aesGcmEncrypt } from "./lib/crypto.js";
import { refreshTokens } from "./lib/kickApi.js";
import { err } from "./lib/errors.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";

function requireEncryptionKey(): string {
  const k = process.env.TOKEN_ENCRYPTION_KEY;
  if (!k) err("SERVER_MISCONFIGURED", "TOKEN_ENCRYPTION_KEY not set");
  return k;
}

/** Lists token rows within 24h of expiry for rotation. */
export const listTokensNeedingRefresh = internalQuery({
  args: {},
  handler: async (ctx) => {
    const horizon = Date.now() + 24 * 60 * 60 * 1000;
    const rows = await ctx.db.query("kickTokens").collect();
    return rows
      .filter((r) => r.expiresAt < horizon)
      .map((r) => ({
        tokenRowId: r._id,
        userId: r.userId,
        expiresAt: r.expiresAt,
      }));
  },
});

/** Fetches a single token row's encrypted refresh ciphertext and scopes. */
export const getEncryptedToken = internalQuery({
  args: { tokenRowId: v.id("kickTokens") },
  handler: async (ctx, { tokenRowId }) => {
    const row = await ctx.db.get(tokenRowId);
    if (!row) return null;
    return {
      userId: row.userId,
      refreshTokenCipher: row.refreshTokenCipher,
      refreshTokenIv: row.refreshTokenIv,
      scopes: row.scopes,
    };
  },
});

/** Patches a kickTokens row with freshly encrypted access and refresh tokens. */
export const storeRefreshedToken = internalMutation({
  args: {
    tokenRowId: v.id("kickTokens"),
    encryptedAccess: v.object({ ciphertext: v.string(), iv: v.string() }),
    encryptedRefresh: v.object({ ciphertext: v.string(), iv: v.string() }),
    expiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const row = await ctx.db.get(args.tokenRowId);
    if (!row) return { patched: false };
    await ctx.db.patch(args.tokenRowId, {
      accessTokenCipher: args.encryptedAccess.ciphertext,
      accessTokenIv: args.encryptedAccess.iv,
      refreshTokenCipher: args.encryptedRefresh.ciphertext,
      refreshTokenIv: args.encryptedRefresh.iv,
      expiresAt: args.expiresAt,
      scopes: args.scopes,
      rotatedAt: Date.now(),
    });
    return { patched: true };
  },
});

/** Refreshes one user's Kick tokens; rate-limited per-user to avoid refresh storms. */
export const refreshOne = internalAction({
  args: { tokenRowId: v.id("kickTokens") },
  handler: async (
    ctx,
    { tokenRowId },
  ): Promise<{ ok: boolean; reason?: string }> => {
    const row = await ctx.runQuery(internal.kickTokens.getEncryptedToken, {
      tokenRowId,
    });
    if (!row) return { ok: false, reason: "token row missing" };

    await rateLimiter.limit(ctx, "refreshToken", {
      key: row.userId as Id<"users">,
      throws: true,
    });

    const key = requireEncryptionKey();
    let refreshTokenPlain: string;
    try {
      refreshTokenPlain = await aesGcmDecrypt(
        key,
        row.refreshTokenCipher,
        row.refreshTokenIv,
      );
    } catch (e) {
      return {
        ok: false,
        reason:
          "decrypt failed: " + (e instanceof Error ? e.message : String(e)),
      };
    }

    let tokens;
    try {
      tokens = await refreshTokens(refreshTokenPlain);
    } catch (e) {
      return {
        ok: false,
        reason:
          "kick refresh failed: " +
          (e instanceof Error ? e.message : String(e)),
      };
    }

    const encryptedAccess = await aesGcmEncrypt(key, tokens.access_token);
    const encryptedRefresh = await aesGcmEncrypt(key, tokens.refresh_token);
    const scopes = tokens.scope
      ? tokens.scope.split(/\s+/).filter(Boolean)
      : row.scopes;

    await ctx.runMutation(internal.kickTokens.storeRefreshedToken, {
      tokenRowId,
      encryptedAccess,
      encryptedRefresh,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      scopes,
    });
    return { ok: true };
  },
});

/** Cron entrypoint that finds expiring tokens and rotates each one. */
export const rotateExpiring = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ scanned: number; refreshed: number; failed: number }> => {
    const rows: Array<{
      tokenRowId: Id<"kickTokens">;
      userId: Id<"users">;
      expiresAt: number;
    }> = await ctx.runQuery(internal.kickTokens.listTokensNeedingRefresh, {});

    let refreshed = 0;
    let failed = 0;
    for (const r of rows) {
      try {
        const res = await ctx.runAction(internal.kickTokens.refreshOne, {
          tokenRowId: r.tokenRowId,
        });
        if (res.ok) refreshed++;
        else failed++;
      } catch {
        failed++;
      }
    }
    return { scanned: rows.length, refreshed, failed };
  },
});
