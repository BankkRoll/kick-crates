import { ConvexHttpClient, ConvexClient } from "convex/browser";
import { CONVEX_URL } from "./env.js";
import { readSession } from "./storage.js";

let httpClientCache: ConvexHttpClient | null = null;
let reactiveClientCache: ConvexClient | null = null;
let currentToken: string | null = null;

/** `true` when {@link CONVEX_URL} is set. Callers use this to short-circuit when `.env.local` is missing. */
export function isConvexConfigured(): boolean {
  return CONVEX_URL.length > 0;
}

/**
 * Returns a memoized `ConvexHttpClient` for one-shot HTTP calls.
 *
 * No auth header is attached — use {@link authedHttpClient} if the
 * mutation / query requires a signed-in user. Returns `null` if Convex
 * isn't configured so call sites can silently no-op pre-setup.
 */
export function getHttpClient(): ConvexHttpClient | null {
  if (!isConvexConfigured()) return null;
  if (!httpClientCache) {
    httpClientCache = new ConvexHttpClient(CONVEX_URL);
  }
  return httpClientCache;
}

/**
 * Returns the shared HTTP client with the current session token applied.
 *
 * Calls `setAuth` / `clearAuth` on the cached client based on whether a
 * JWT is currently stored, so consecutive mutations see consistent auth
 * even across sign-in and sign-out transitions. Returns `null` when
 * Convex isn't configured.
 */
export async function authedHttpClient(): Promise<ConvexHttpClient | null> {
  const client = getHttpClient();
  if (!client) return null;
  const session = await readSession();
  if (session) {
    client.setAuth(session.token);
    currentToken = session.token;
  } else if (currentToken) {
    client.clearAuth();
    currentToken = null;
  }
  return client;
}

/**
 * Returns a memoized `ConvexClient` for reactive subscriptions.
 *
 * The auth callback is installed on first construction so every
 * subscription — including those created before the user signs in —
 * resolves the latest session token on demand. Returns `null` when
 * Convex isn't configured.
 */
export function getReactiveClient(): ConvexClient | null {
  if (!isConvexConfigured()) return null;
  if (!reactiveClientCache) {
    reactiveClientCache = new ConvexClient(CONVEX_URL);
    reactiveClientCache.setAuth(async () => {
      const s = await readSession();
      return s ? s.token : null;
    });
  }
  return reactiveClientCache;
}

/**
 * Forces the reactive client to re-evaluate its auth token.
 *
 * Called after the OAuth handoff writes a new session to storage (or
 * after logout clears it) so active subscriptions receive the new
 * identity on the next reactive tick.
 */
export async function applyAuthToReactive(): Promise<void> {
  if (!reactiveClientCache) {
    getReactiveClient();
    return;
  }
  reactiveClientCache.setAuth(async () => {
    const s = await readSession();
    return s ? s.token : null;
  });
}

/** Disposes cached clients; safe to call after a hard auth failure to flush any stale in-memory state. */
export function clearAllCaches(): void {
  if (reactiveClientCache) {
    reactiveClientCache.close();
    reactiveClientCache = null;
  }
  httpClientCache = null;
  currentToken = null;
}
