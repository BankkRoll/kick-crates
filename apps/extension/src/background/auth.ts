import { AUTH_START_URL, EXTENSION_VERSION } from "../env.js";
import { readSession, writeSession, clearSession } from "../storage.js";
import { applyAuthToReactive, clearAllCaches } from "../convex.js";
import type { AuthStatus, ExternalAuthMessage } from "../messaging.js";

/** Reads the stored session (if any) and shapes it as an {@link AuthStatus} for the popup / content scripts. */
export async function currentAuthStatus(): Promise<AuthStatus> {
  const session = await readSession();
  if (!session) return { signedIn: false };
  return {
    signedIn: true,
    user: session.user,
    expiresAt: session.expiresAt,
  };
}

/**
 * Kicks off the Kick OAuth flow by calling the Convex `/auth/start`
 * endpoint and opening the returned provider URL in a new tab.
 *
 * The endpoint seeds a PKCE/state pair keyed to this extension's id so
 * the eventual callback can only be consumed by us. Returns a structured
 * error (rather than throwing) whenever the extension is misconfigured
 * or the network call fails, so the popup can render a friendly message.
 *
 * @returns `{ ok: true }` once the auth tab is open; `{ ok: false, error }` otherwise.
 */
export async function startLoginFlow(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!/^https:\/\/.+\.convex\.site\//.test(AUTH_START_URL)) {
    return {
      ok: false,
      error:
        "Extension is not configured. Set VITE_CONVEX_URL and VITE_CONVEX_SITE_URL in apps/extension/.env.local (NOT .env.example), then rebuild.",
    };
  }
  try {
    const res = await fetch(AUTH_START_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        extensionId: chrome.runtime.id,
        extensionVersion: EXTENSION_VERSION,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: "start failed: " + res.status + " " + text };
    }
    const json = (await res.json()) as { authUrl?: string; error?: string };
    if (!json.authUrl) {
      return { ok: false, error: json.error ?? "missing authUrl" };
    }
    await chrome.tabs.create({ url: json.authUrl, active: true });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Registers a `chrome.runtime.onMessageExternal` listener that completes
 * the OAuth handoff from the Convex `/auth/callback` page.
 *
 * The callback page lives on `*.convex.site` / `*.convex.cloud` and
 * posts the issued JWT to this extension. Both the message shape
 * (`isAuthMessage`) and the sender origin (`isAllowedSenderOrigin`,
 * restricted to the Convex-hosted domains over HTTPS) are validated
 * before the token is trusted — any other site messaging this
 * extension's id is rejected.
 *
 * On success: the session is written to storage, the reactive Convex
 * client is re-authed, `onAuth` is invoked so callers can react, and
 * the handoff tab is closed. All error paths respond with
 * `{ ok: false, error }` so the auth page can surface them to the user.
 *
 * @param onAuth Fires after the session is persisted — typically used
 *               to ping open tabs that a new identity is active.
 */
export function registerExternalAuthListener(
  onAuth: (session: {
    token: string;
    expiresAt: number;
    user: { name: string; profilePicture: string | null };
  }) => void,
): void {
  chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    (async () => {
      console.info(
        "[KickCrates] onMessageExternal fired from",
        sender.url,
        "origin=",
        sender.origin,
      );
      if (!isAuthMessage(msg)) {
        console.warn("[KickCrates] rejected: unrecognized message shape", msg);
        sendResponse({ ok: false, error: "unrecognized message shape" });
        return;
      }
      if (!isAllowedSenderOrigin(sender.url ?? "")) {
        console.warn(
          "[KickCrates] rejected: origin not in allow-list:",
          sender.url,
        );
        sendResponse({
          ok: false,
          error: "origin " + (sender.url ?? "?") + " not allowed",
        });
        return;
      }
      try {
        const session = {
          token: msg.token,
          expiresAt: msg.expiresAt,
          user: {
            name: msg.user.name,
            profilePicture: msg.user.profilePicture || null,
          },
        };
        await writeSession(session);
        console.info(
          "[KickCrates] session written, expires",
          new Date(session.expiresAt).toISOString(),
        );
        await applyAuthToReactive();
        onAuth(session);
        sendResponse({ ok: true });
        const tabId = sender.tab?.id;
        if (typeof tabId === "number") {
          try {
            await chrome.tabs.remove(tabId);
          } catch (e) {
            console.warn("[KickCrates] tabs.remove failed (harmless):", e);
          }
        }
      } catch (e) {
        console.error("[KickCrates] auth handoff threw:", e);
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })().catch((e) => {
      console.error("[KickCrates] auth handoff async reject:", e);
      try {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      } catch {}
    });
    return true;
  });
}

/** Clears the stored session and drops cached Convex clients so subsequent requests are unauthenticated. */
export async function logout(): Promise<void> {
  await clearSession();
  clearAllCaches();
}

function isAuthMessage(m: unknown): m is ExternalAuthMessage {
  if (!m || typeof m !== "object") return false;
  const r = m as Record<string, unknown>;
  if (r.type !== "kickcrates/auth-success") return false;
  if (typeof r.token !== "string" || r.token.length < 20) return false;
  if (typeof r.expiresAt !== "number" || r.expiresAt < Date.now()) return false;
  if (!r.user || typeof r.user !== "object") return false;
  const u = r.user as Record<string, unknown>;
  if (typeof u.name !== "string") return false;
  return true;
}

function isAllowedSenderOrigin(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return (
      u.hostname.endsWith(".convex.site") ||
      u.hostname.endsWith(".convex.cloud")
    );
  } catch {
    return false;
  }
}
