// Kick OAuth PKCE dance plus session mint. httpOauthStart persists a pending
// row keyed by extState; httpOauthCallback consumes it exactly once, exchanges
// the code, encrypts Kick's access/refresh tokens with AES-GCM before they
// ever touch the DB, then issues our own extension JWT (jti stored in
// sessionTokens for revocation). The callback response is an HTML page that
// forwards the JWT to the extension via chrome.runtime.sendMessage — the
// token is never handed back through a URL fragment.
import {
  KICK_OAUTH_AUTHORIZE,
  PKCE_TTL_SECONDS,
  SESSION_TOKEN_TTL_SECONDS,
  levelFromTotalXp,
} from "./lib/constants.js";
import {
  aesGcmEncrypt,
  generatePkce,
  randomToken,
  signExtensionJwt,
} from "./lib/crypto.js";
import {
  defaultScopeString,
  exchangeCodeForTokens,
  fetchKickUser,
} from "./lib/kickApi.js";
import {
  httpAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import type { MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";

import { err } from "./lib/errors.js";
import { internal } from "./_generated/api.js";
import {
  WELCOME_EMOTE_SLUG,
  WELCOME_BADGE_SLUG,
  WELCOME_XP,
  WELCOME_SCRAP,
} from "./lib/welcome.js";
import { grantXp } from "./lib/seasonXp.js";
import { readActiveSeason } from "./seasons.js";
import { v } from "convex/values";

function requireSiteUrl(): string {
  const url = process.env.CONVEX_SITE_URL;
  if (!url) err("SERVER_MISCONFIGURED", "CONVEX_SITE_URL not set");
  return url.replace(/\/+$/, "");
}

function requireClientId(): string {
  const id = process.env.KICK_CLIENT_ID;
  if (!id) err("SERVER_MISCONFIGURED", "KICK_CLIENT_ID not set");
  return id;
}

function allowedExtensionIds(): Set<string> {
  const raw = process.env.ALLOWED_EXTENSION_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function requireTokenEncryptionKey(): string {
  const k = process.env.TOKEN_ENCRYPTION_KEY;
  if (!k) err("SERVER_MISCONFIGURED", "TOKEN_ENCRYPTION_KEY not set");
  return k;
}

/** Persists a PKCE verifier + state row for an in-flight OAuth handshake. */
export const storePendingOauth = internalMutation({
  args: {
    extState: v.string(),
    codeVerifier: v.string(),
    codeChallenge: v.string(),
    redirectUri: v.string(),
    returnExtensionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("pendingOauth", {
      extState: args.extState,
      codeVerifier: args.codeVerifier,
      codeChallenge: args.codeChallenge,
      redirectUri: args.redirectUri,
      createdAt: now,
      expiresAt: now + PKCE_TTL_SECONDS * 1000,
      ...(args.returnExtensionId
        ? { returnExtensionId: args.returnExtensionId }
        : {}),
    });
  },
});

/** Single-use lookup of a pending OAuth row; enforces unused + unexpired state. */
export const consumePendingOauth = internalMutation({
  args: { extState: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("pendingOauth")
      .withIndex("by_ext_state", (q) => q.eq("extState", args.extState))
      .first();
    if (!row) err("OAUTH_STATE_MISSING");
    if (row.consumedAt) err("OAUTH_STATE_CONSUMED");
    if (row.expiresAt < Date.now()) err("OAUTH_STATE_EXPIRED");
    await ctx.db.patch(row._id, { consumedAt: Date.now() });
    return {
      codeVerifier: row.codeVerifier,
      redirectUri: row.redirectUri,
      returnExtensionId: row.returnExtensionId ?? null,
    };
  },
});

/** Upserts the user, stores encrypted Kick tokens, issues a session JWT, and on first sign-in grants the welcome kit. */
export const finalizeAuth = internalMutation({
  args: {
    kickUser: v.object({
      user_id: v.number(),
      name: v.string(),
      email: v.string(),
      profile_picture: v.string(),
    }),
    encryptedAccess: v.object({ ciphertext: v.string(), iv: v.string() }),
    encryptedRefresh: v.object({ ciphertext: v.string(), iv: v.string() }),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    userAgent: v.optional(v.string()),
    extensionVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_kick_user_id", (q) =>
        q.eq("kickUserId", args.kickUser.user_id),
      )
      .first();
    const now = Date.now();

    let userId;
    let isNewSignup = false;
    if (existing) {
      userId = existing._id;
      await ctx.db.patch(userId, {
        kickUsername: args.kickUser.name,
        kickProfilePicture: args.kickUser.profile_picture,
        email: args.kickUser.email,
        lastActiveAt: now,
      });
    } else {
      isNewSignup = true;
      userId = await ctx.db.insert("users", {
        kickUserId: args.kickUser.user_id,
        kickUsername: args.kickUser.name,
        kickProfilePicture: args.kickUser.profile_picture,
        email: args.kickUser.email,
        totalXp: 0,
        seasonXp: 0,
        level: levelFromTotalXp(0),
        scrap: 0,
        firstSeenAt: now,
        lastActiveAt: now,
        fraudFlagged: false,
      });
      await ctx.db.insert("loadouts", {
        userId,
        updatedAt: now,
      });
    }

    const existingTokens = await ctx.db
      .query("kickTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existingTokens) {
      await ctx.db.patch(existingTokens._id, {
        accessTokenCipher: args.encryptedAccess.ciphertext,
        accessTokenIv: args.encryptedAccess.iv,
        refreshTokenCipher: args.encryptedRefresh.ciphertext,
        refreshTokenIv: args.encryptedRefresh.iv,
        expiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        rotatedAt: now,
      });
    } else {
      await ctx.db.insert("kickTokens", {
        userId,
        accessTokenCipher: args.encryptedAccess.ciphertext,
        accessTokenIv: args.encryptedAccess.iv,
        refreshTokenCipher: args.encryptedRefresh.ciphertext,
        refreshTokenIv: args.encryptedRefresh.iv,
        expiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        rotatedAt: now,
      });
    }

    const jti = randomToken(16);
    const expiresAt = now + SESSION_TOKEN_TTL_SECONDS * 1000;
    await ctx.db.insert("sessionTokens", {
      userId,
      jti,
      issuedAt: now,
      expiresAt,
      ...(args.userAgent ? { userAgent: args.userAgent } : {}),
      ...(args.extensionVersion
        ? { extensionVersion: args.extensionVersion }
        : {}),
    });

    if (isNewSignup) {
      await grantWelcomeKit(ctx, userId, now);
    }

    return { userId, kickUserId: args.kickUser.user_id, jti, expiresAt };
  },
});

async function grantWelcomeKit(
  ctx: MutationCtx,
  userId: Id<"users">,
  now: number,
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const season = await readActiveSeason(ctx);

  if (season) {
    await ctx.db.patch(userId, { currentSeasonId: season._id });

    const [emote, badge] = await Promise.all([
      ctx.db
        .query("items")
        .withIndex("by_season_slug", (q) =>
          q.eq("seasonId", season._id).eq("slug", WELCOME_EMOTE_SLUG),
        )
        .first(),
      ctx.db
        .query("items")
        .withIndex("by_season_slug", (q) =>
          q.eq("seasonId", season._id).eq("slug", WELCOME_BADGE_SLUG),
        )
        .first(),
    ]);

    if (emote) {
      await ctx.db.insert("inventory", {
        userId,
        itemId: emote._id,
        acquiredAt: now,
        acquiredFrom: "promo",
        duplicates: 0,
      });
    }

    if (badge) {
      await ctx.db.insert("inventory", {
        userId,
        itemId: badge._id,
        acquiredAt: now,
        acquiredFrom: "promo",
        duplicates: 0,
      });
      const loadout = await ctx.db
        .query("loadouts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (loadout) {
        await ctx.db.patch(loadout._id, {
          badgeItemId: badge._id,
          updatedAt: now,
        });
      }
    }
  }

  const { newTotalXp, newSeasonXp, newLevel } = await grantXp(
    ctx,
    user,
    WELCOME_XP,
    levelFromTotalXp,
  );
  await ctx.db.patch(userId, {
    totalXp: newTotalXp,
    seasonXp: newSeasonXp,
    level: newLevel,
    scrap: user.scrap + WELCOME_SCRAP,
    welcomeGrantedAt: now,
  });
  await ctx.db.insert("xpEvents", {
    userId,
    source: "bonus",
    amount: WELCOME_XP,
    newLevel,
    meta: { kind: "welcome", scrapAwarded: WELCOME_SCRAP },
    at: now,
  });

  const crates = await ctx.db.query("crateDef").collect();
  for (const crate of crates) {
    if (!crate.active || crate.tokenGated) continue;
    await ctx.db.insert("crateState", {
      userId,
      crateDefId: crate._id,
      secondsEarned: 0,
      tokensHeld: 0,
      updatedAt: now,
    });
  }
}

/** Marks a session token revoked by jti (idempotent). */
export const revokeSessionToken = internalMutation({
  args: { jti: v.string() },
  handler: async (ctx, { jti }) => {
    const token = await ctx.db
      .query("sessionTokens")
      .withIndex("by_jti", (q) => q.eq("jti", jti))
      .first();
    if (token && !token.revokedAt) {
      await ctx.db.patch(token._id, { revokedAt: Date.now() });
    }
  },
});

/** Returns the session token row only if its jti belongs to the given user. */
export const lookupSessionTokenForUser = internalQuery({
  args: { jti: v.string(), userId: v.id("users") },
  handler: async (ctx, { jti, userId }) => {
    const token = await ctx.db
      .query("sessionTokens")
      .withIndex("by_jti", (q) => q.eq("jti", jti))
      .first();
    if (!token) return null;
    if (token.userId !== userId) return null;
    return token;
  },
});

/** Extension-initiated OAuth entry point; mints PKCE state and returns Kick's authorize URL. */
export const httpOauthStart = httpAction(async (ctx, req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, req);
  }

  let body: { extensionId?: unknown; extensionVersion?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "INVALID_JSON" }, 400, req);
  }
  const extensionId =
    typeof body.extensionId === "string" ? body.extensionId : "";
  if (!extensionId) {
    return jsonResponse({ error: "MISSING_EXTENSION_ID" }, 400, req);
  }
  const allowed = allowedExtensionIds();
  if (allowed.size > 0 && !allowed.has(extensionId)) {
    return jsonResponse({ error: "EXTENSION_NOT_ALLOWED" }, 403, req);
  }

  const siteUrl = requireSiteUrl();
  const clientId = requireClientId();
  const { verifier, challenge } = await generatePkce();
  const extState = randomToken(24);
  const redirectUri = siteUrl + "/auth/kick/callback";

  await ctx.runMutation(internal.oauth.storePendingOauth, {
    extState,
    codeVerifier: verifier,
    codeChallenge: challenge,
    redirectUri,
    returnExtensionId: extensionId,
  });

  const authUrl = new URL(KICK_OAUTH_AUTHORIZE);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", defaultScopeString());
  authUrl.searchParams.set("state", extState);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return jsonResponse({ authUrl: authUrl.toString(), extState }, 200, req);
});

/** Kick redirect endpoint; exchanges the auth code, finalizes the session, and renders an HTML page that hands the JWT to the extension via chrome.runtime.sendMessage. */
export const httpOauthCallback = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const kickError = url.searchParams.get("error");

  if (kickError) {
    return htmlResponse(
      renderErrorPage("Kick returned an error: " + kickError),
      400,
    );
  }
  if (!code || !state) {
    return htmlResponse(
      renderErrorPage("Missing code or state in callback."),
      400,
    );
  }

  let pending: {
    codeVerifier: string;
    redirectUri: string;
    returnExtensionId: string | null;
  };
  try {
    pending = await ctx.runMutation(internal.oauth.consumePendingOauth, {
      extState: state,
    });
  } catch {
    return htmlResponse(
      renderErrorPage("Login session expired or invalid."),
      400,
    );
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: pending.redirectUri,
    });
  } catch {
    return htmlResponse(
      renderErrorPage("Token exchange with Kick failed."),
      502,
    );
  }

  let kickUser;
  try {
    kickUser = await fetchKickUser(tokens.access_token);
  } catch {
    return htmlResponse(
      renderErrorPage("Could not read Kick user profile."),
      502,
    );
  }

  const key = requireTokenEncryptionKey();
  const encryptedAccess = await aesGcmEncrypt(key, tokens.access_token);
  const encryptedRefresh = await aesGcmEncrypt(key, tokens.refresh_token);
  const scopes = tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [];

  const userAgent = req.headers.get("user-agent") ?? undefined;

  const { userId, kickUserId, jti, expiresAt } = await ctx.runMutation(
    internal.oauth.finalizeAuth,
    {
      kickUser,
      encryptedAccess,
      encryptedRefresh,
      tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      scopes,
      ...(userAgent ? { userAgent } : {}),
    },
  );

  const { token: jwt } = await signExtensionJwt({
    userId,
    jti,
    kickUserId,
    ttlSeconds: SESSION_TOKEN_TTL_SECONDS,
  });

  return htmlResponse(
    renderHandoffPage({
      extensionId: pending.returnExtensionId ?? "",
      jwt,
      jwtExpiresAt: expiresAt,
      kickUsername: kickUser.name,
      kickProfilePicture: kickUser.profile_picture,
    }),
    200,
  );
});

function corsPreflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function jsonResponse(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function jsSafeLiteral(s: string): string {
  return JSON.stringify(s)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHandoffPage(p: {
  extensionId: string;
  jwt: string;
  jwtExpiresAt: number;
  kickUsername: string;
  kickProfilePicture: string;
}): string {
  const payloadJson = JSON.stringify({
    type: "kickcrates/auth-success",
    token: p.jwt,
    expiresAt: p.jwtExpiresAt,
    user: { name: p.kickUsername, profilePicture: p.kickProfilePicture },
  });
  const payloadLiteral = jsSafeLiteral(payloadJson);
  const extensionIdLiteral = jsSafeLiteral(p.extensionId);
  return (
    "<!doctype html>\n" +
    '<html lang="en">\n' +
    "<head>\n" +
    '<meta charset="utf-8" />\n' +
    "<title>KickCrates</title>\n" +
    '<meta name="viewport" content="width=device-width,initial-scale=1" />\n' +
    "<style>\n" +
    "  html, body { margin: 0; padding: 0; background: #050807; color: #c4f5cb; height: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }\n" +
    "  body { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 18px; text-align: center; }\n" +
    "  .spinner { width: 36px; height: 36px; border: 3px solid rgba(120,228,140,0.15); border-top-color: #78e48c; border-radius: 50%; animation: spin 700ms linear infinite; }\n" +
    "  @keyframes spin { to { transform: rotate(360deg); } }\n" +
    "  #label { font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #78e48c; }\n" +
    "  #err { display: none; max-width: 480px; padding: 24px; border: 1px solid rgba(255,118,118,0.35); border-radius: 12px; background: #0d1410; color: #ff9b9b; font-size: 13px; line-height: 1.55; text-align: left; }\n" +
    "  #err.show { display: block; }\n" +
    "  #err h1 { margin: 0 0 10px; color: #ff7676; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; }\n" +
    "  #err pre { background: rgba(0,0,0,0.35); padding: 10px; border-radius: 6px; color: #ffb8b8; font-size: 11px; word-break: break-all; white-space: pre-wrap; margin: 10px 0 0; }\n" +
    "  #err ol { padding-left: 18px; margin: 10px 0 0; color: #9fc7a6; }\n" +
    "  #err ol li { margin-bottom: 4px; font-size: 12px; }\n" +
    "  button { all: unset; display: inline-flex; align-items: center; gap: 6px; background: #16a34a; color: #06140a; padding: 8px 14px; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; }\n" +
    "  button:hover { filter: brightness(1.1); }\n" +
    "</style>\n" +
    "</head>\n" +
    "<body>\n" +
    '<div class="spinner" id="spinner" aria-hidden="true"></div>\n' +
    '<div id="label">Signing you in…</div>\n' +
    '<div id="err">\n' +
    "  <h1>Login handoff failed</h1>\n" +
    '  <p id="errMsg"></p>\n' +
    "  <p><strong>Most common causes:</strong></p>\n" +
    "  <ol>\n" +
    "    <li>Extension was reloaded after this tab opened — reload the extension in chrome://extensions AND refresh kick.com, then try again.</li>\n" +
    "    <li>Extension ID changed — re-run <code>npx convex env set ALLOWED_EXTENSION_IDS</code> with the new ID.</li>\n" +
    "    <li>Convex site URL not in the extension's externally_connectable — check wxt.config.ts manifest and rebuild.</li>\n" +
    "  </ol>\n" +
    '  <button id="retry">Try again</button>\n' +
    "</div>\n" +
    "<script>\n" +
    "(function () {\n" +
    "  var extensionId = " +
    extensionIdLiteral +
    ";\n" +
    "  var payload = JSON.parse(" +
    payloadLiteral +
    ");\n" +
    "  var spinner = document.getElementById('spinner');\n" +
    "  var label = document.getElementById('label');\n" +
    "  var errBox = document.getElementById('err');\n" +
    "  var errMsg = document.getElementById('errMsg');\n" +
    "  var retryBtn = document.getElementById('retry');\n" +
    "  if (retryBtn) retryBtn.addEventListener('click', function(){ location.reload(); });\n" +
    "  function fail(reason, detail) {\n" +
    "    if (spinner) spinner.style.display = 'none';\n" +
    "    if (label) label.style.display = 'none';\n" +
    "    if (errMsg) { errMsg.textContent = reason; if (detail) { var pre = document.createElement('pre'); pre.textContent = detail; errMsg.appendChild(pre); } }\n" +
    "    if (errBox) errBox.classList.add('show');\n" +
    "    console.error('[KickCrates] handoff failed:', reason, detail || '');\n" +
    "  }\n" +
    "  console.info('[KickCrates] sending auth payload to extension', extensionId, 'payload bytes:', JSON.stringify(payload).length);\n" +
    "  if (!extensionId) { fail('No extension ID recorded in the pending OAuth row.'); return; }\n" +
    "  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {\n" +
    "    fail('chrome.runtime.sendMessage is not available on this page.',\n" +
    "      'This usually means the extension is not installed, or its externally_connectable.matches does not include ' + location.origin + '.');\n" +
    "    return;\n" +
    "  }\n" +
    "  var responded = false;\n" +
    "  window.setTimeout(function () {\n" +
    "    if (!responded) fail('Extension did not respond within 6 seconds.',\n" +
    "      'Likely: the extension was reloaded after this tab opened, or the background service worker failed to wake up. Try reloading the extension at chrome://extensions and hard-refresh kick.com, then retry.');\n" +
    "  }, 6000);\n" +
    "  try {\n" +
    "    chrome.runtime.sendMessage(extensionId, payload, function (response) {\n" +
    "      responded = true;\n" +
    "      var le = chrome.runtime.lastError;\n" +
    "      if (le) { fail('Extension rejected the message.', le.message || String(le)); return; }\n" +
    "      if (!response || response.ok !== true) {\n" +
    "        fail('Extension did not accept the session.', 'Response: ' + JSON.stringify(response));\n" +
    "        return;\n" +
    "      }\n" +
    "      if (label) label.textContent = 'Signed in. Closing…';\n" +
    "      try { window.close(); } catch (e) {}\n" +
    "    });\n" +
    "  } catch (e) {\n" +
    "    responded = true;\n" +
    "    fail('Exception while sending message.', String(e && e.message ? e.message : e));\n" +
    "  }\n" +
    "})();\n" +
    "</script>\n" +
    "</body>\n" +
    "</html>"
  );
}

function renderErrorPage(msg: string): string {
  const safe = htmlEscape(msg);
  return (
    "<!doctype html>\n" +
    '<html><head><meta charset="utf-8"><title>KickCrates - Login error</title>\n' +
    "<style>body{background:#0b0f0c;color:#ff9b9b;font-family:ui-monospace,monospace;padding:40px;text-align:center}</style>\n" +
    "</head><body><h1>Login failed</h1><p>" +
    safe +
    "</p><p>Close this tab and try again from the extension popup.</p></body></html>"
  );
}
