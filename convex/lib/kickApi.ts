import { err } from "./errors.js";
import {
  KICK_API_BASE,
  KICK_OAUTH_TOKEN,
  REQUESTED_SCOPES,
} from "./constants.js";

export type KickTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type KickUser = {
  user_id: number;
  name: string;
  email: string;
  profile_picture: string;
};

export type KickChannel = {
  broadcaster_user_id: number;
  slug: string;
  stream_title: string;
  channel_description: string;
  active_subscribers_count: number;
  canceled_subscribers_count: number;
  banner_picture: string;
  category: {
    id: number;
    name: string;
    thumbnail: string;
  };
  stream: {
    is_live: boolean;
    viewer_count: number;
    start_time: string;
    thumbnail: string;
    is_mature: boolean;
    language: string;
    custom_tags: string[];
    url: string;
    key: string;
  };
};

function requireClientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    err(
      "SERVER_MISCONFIGURED",
      "KICK_CLIENT_ID and KICK_CLIENT_SECRET must be set via `npx convex env set`",
    );
  }
  return { clientId, clientSecret };
}

/** Exchanges a PKCE authorization code for Kick access + refresh tokens. */
export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<KickTokenResponse> {
  const { clientId, clientSecret } = requireClientCreds();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: params.codeVerifier,
  });
  const res = await fetch(KICK_OAUTH_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    err("OAUTH_EXCHANGE_FAILED", `kick token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as KickTokenResponse;
}

/** Rotates a Kick refresh token; returns a new access + refresh pair. */
export async function refreshTokens(refreshToken: string): Promise<KickTokenResponse> {
  const { clientId, clientSecret } = requireClientCreds();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(KICK_OAUTH_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    err("OAUTH_EXCHANGE_FAILED", `kick refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as KickTokenResponse;
}

/** Resolves the authenticated Kick user profile for `accessToken`. */
export async function fetchKickUser(accessToken: string): Promise<KickUser> {
  const res = await fetch(`${KICK_API_BASE}/users`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    err("KICK_API_ERROR", `kick /users failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: KickUser[] };
  const first = json.data[0];
  if (!first) err("KICK_API_ERROR", "kick /users returned empty data");
  return first;
}

/** Looks up a channel by its Kick slug; returns null on 404. */
export async function fetchKickChannelBySlug(
  accessToken: string,
  slug: string,
): Promise<KickChannel | null> {
  const url = new URL(`${KICK_API_BASE}/channels`);
  url.searchParams.append("slug", slug);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text().catch(() => "");
    err("KICK_API_ERROR", `kick /channels failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: KickChannel[] };
  return json.data[0] ?? null;
}

/** Looks up a channel by broadcaster id; returns null on 404. */
export async function fetchKickChannelByBroadcasterId(
  accessToken: string,
  broadcasterUserId: number,
): Promise<KickChannel | null> {
  const url = new URL(`${KICK_API_BASE}/channels`);
  url.searchParams.append("broadcaster_user_id", String(broadcasterUserId));
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text().catch(() => "");
    err("KICK_API_ERROR", `kick /channels failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: KickChannel[] };
  return json.data[0] ?? null;
}

/** Space-delimited OAuth scopes requested during login. */
export function defaultScopeString(): string {
  return REQUESTED_SCOPES.join(" ");
}
