const url = (import.meta.env.VITE_CONVEX_URL ?? "") as string;
const siteUrl = (import.meta.env.VITE_CONVEX_SITE_URL ?? "") as string;

/** Convex reactive WebSocket endpoint (`*.convex.cloud`). */
export const CONVEX_URL = url.trim().replace(/\/+$/, "");

/** Convex HTTP endpoint (`*.convex.site`) — hosts OAuth routes + JWKS. */
export const CONVEX_SITE_URL = siteUrl.trim().replace(/\/+$/, "");

if (!CONVEX_URL || !CONVEX_SITE_URL) {
  console.warn(
    "[KickCrates] VITE_CONVEX_URL / VITE_CONVEX_SITE_URL are not set. Create apps/extension/.env.local with values from `npx convex dev` output.",
  );
}

/** POST endpoint the background worker hits to start the Kick OAuth flow. */
export const AUTH_START_URL = CONVEX_SITE_URL + "/auth/kick/start";

/** JWKS document URL, consumed by Convex's `customJwt` auth provider to verify our session JWTs. */
export const JWKS_URL = CONVEX_SITE_URL + "/.well-known/jwks.json";

/** Extension version reported to the server; drives the `minExtensionVersion` kill-switch. */
export const EXTENSION_VERSION =
  ((import.meta.env.VITE_EXT_VERSION ?? "0.1.0") as string) || "0.1.0";
