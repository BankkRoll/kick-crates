import { useCallback, useEffect, useState } from "preact/hooks";
import type { AuthStatus } from "../../src/messaging.js";

/**
 * Browser-action popup shown when the toolbar icon is clicked.
 *
 * Queries the background for {@link AuthStatus} on mount and renders
 * one of three states: a loading placeholder, a sign-in CTA that kicks
 * off the OAuth flow via `auth/start`, or a signed-in card with
 * "Open on Kick" (focus an existing tab or create a new one) and
 * "Sign out". The popup is deliberately minimal — the full experience
 * lives in the in-page dialog on kick.com.
 */
export function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "auth/status" })
      .then((s: AuthStatus) => setAuth(s));
  }, []);

  const login = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await chrome.runtime.sendMessage({ type: "auth/start" });
      if (r && r.ok === false) setError(r.error ?? "login failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const openKick = useCallback(async () => {
    const tabs = await chrome.tabs.query({});
    const existing = tabs.find(
      (t) => t.url && /^https?:\/\/(www\.)?kick\.com\//.test(t.url),
    );
    if (existing && existing.id) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: "https://kick.com/" });
    }
    window.close();
  }, []);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await chrome.runtime.sendMessage({ type: "auth/logout" });
      setAuth({ signedIn: false });
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div class="p-hero">
      <div class="p-logo">K</div>
      <h1 class="p-title">KickCrates</h1>
      {auth === null ? (
        <p class="p-sub">Loading…</p>
      ) : !auth.signedIn ? (
        <>
          <p class="p-sub">
            Battle pass, crates, and XP for watching Kick. Sign in to start
            earning.
          </p>
          <div class="p-actions">
            <button
              class="p-btn p-btn--primary"
              onClick={login}
              disabled={busy}
            >
              {busy ? "Opening…" : "Sign in with Kick"}
            </button>
          </div>
          {error ? <div class="p-error">{error}</div> : null}
        </>
      ) : (
        <>
          <div class="p-user">
            <div
              class="p-avatar"
              style={{
                backgroundImage: auth.user.profilePicture
                  ? "url(" + auth.user.profilePicture + ")"
                  : "none",
              }}
            />
            <div class="p-user__meta">
              <div class="p-user__name">{auth.user.name}</div>
              <div class="p-user__sub">Signed in</div>
            </div>
          </div>
          <p class="p-sub">
            The full UI lives on kick.com. Open Kick to earn XP, open crates,
            and claim quests.
          </p>
          <div class="p-actions">
            <button class="p-btn p-btn--primary" onClick={openKick}>
              Open on Kick
            </button>
            <button class="p-btn p-btn--ghost" onClick={logout} disabled={busy}>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
