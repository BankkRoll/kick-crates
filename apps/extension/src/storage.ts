import { isExtensionContextAlive } from "./chromeSafe.js";

type Session = {
  token: string;
  expiresAt: number;
  user: { name: string; profilePicture: string | null };
};

/** `chrome.storage.local` key under which the signed session JWT is kept. Bumped if the shape ever changes. */
export const SESSION_KEY = "kc_session_v1";

const EXPIRY_GRACE_MS = 60_000;

/**
 * Loads the stored session.
 *
 * Returns `null` — and clears storage — whenever the stored token is
 * within `EXPIRY_GRACE_MS` of its `expiresAt`, so the UI proactively
 * shows the sign-in state instead of waiting for the server to reject
 * the next heartbeat. Also returns `null` if the extension context has
 * been invalidated (e.g. the extension was reloaded out from under the
 * content script).
 *
 * @returns Parsed session, or `null` if missing / expired / unreadable.
 */
export async function readSession(): Promise<Session | null> {
  if (!isExtensionContextAlive()) return null;
  try {
    const s = await chrome.storage.local.get(SESSION_KEY);
    const raw = s[SESSION_KEY];
    if (!raw) return null;
    const parsed = raw as Session;
    if (!parsed.token || !parsed.expiresAt) return null;
    if (parsed.expiresAt - EXPIRY_GRACE_MS < Date.now()) {
      await clearSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persists the session JWT after a successful OAuth handoff. No-op if the extension context is invalidated. */
export async function writeSession(s: Session): Promise<void> {
  if (!isExtensionContextAlive()) return;
  try {
    await chrome.storage.local.set({ [SESSION_KEY]: s });
  } catch {}
}

/** Removes the session JWT (logout / expiry / server-side revocation). */
export async function clearSession(): Promise<void> {
  if (!isExtensionContextAlive()) return;
  try {
    await chrome.storage.local.remove(SESSION_KEY);
  } catch {}
}
