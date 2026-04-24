import { useEffect, useState } from "preact/hooks";
import { isPagePath, navigateToPage } from "../pageRouter.js";

import { isExtensionContextAlive } from "../../chromeSafe.js";

const STORAGE_KEY = "kc_welcomed_v1";

/**
 * First-visit welcome card that points new users at KickCrates.
 *
 * Appears once per browser profile: after a 1.2 s delay on first load of
 * a Kick page, unless the user is already on a KickCrates page.
 * Dismissal (close button, backdrop click, either CTA) persists
 * `kc_welcomed_v1` in `chrome.storage.local` so the card never re-shows.
 * "Open KickCrates" navigates the user to the Crates page instead of
 * opening any in-page dialog — the pages ARE the app.
 */
export function WelcomeDialog() {
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!isExtensionContextAlive()) return;
    let cancelled = false;

    chrome.storage.local
      .get(STORAGE_KEY)
      .then((v) => {
        if (cancelled) return;
        if (v && v[STORAGE_KEY]) return;
        if (isPagePath(location)) {
          markSeen();
          return;
        }
        const t = window.setTimeout(() => {
          if (cancelled) return;
          if (isPagePath(location)) {
            markSeen();
            return;
          }
          setShown(true);
        }, 1200);
        return () => window.clearTimeout(t);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function markSeen() {
    if (isExtensionContextAlive()) {
      chrome.storage.local.set({ [STORAGE_KEY]: Date.now() }).catch(() => {});
    }
  }

  function dismiss(openAfter: boolean) {
    setClosing(true);
    markSeen();
    window.setTimeout(() => {
      setShown(false);
      setClosing(false);
      if (openAfter) navigateToPage("crates");
    }, 180);
  }

  // Render-time guard. The effect already skips setting `shown` when
  // the user lands on a page URL, but if the state ever races we make
  // absolutely sure the welcome scrim never renders on /kickcrates —
  // users reported the sidebar darkening on fresh page mounts, which
  // this backdrop is the prime suspect for.
  if (!shown) return null;
  if (isPagePath(location)) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kc-welcome-title"
      data-state={closing ? "closed" : "open"}
      class="kc-welcome-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss(false);
      }}
    >
      <div class="kc-welcome-card">
        <button
          type="button"
          class="kc-welcome-card__close"
          aria-label="Close"
          onClick={() => dismiss(false)}
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M28 6.99L25.01 4L16 13L6.99 4L4 6.99L13 16L4 25.01L6.99 28L16 19L25.01 28L28 25.01L19 16L28 6.99Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <div class="kc-welcome-card__hero" aria-hidden="true">
          <WelcomeArt />
        </div>
        <div class="kc-welcome-card__body">
          <h2 id="kc-welcome-title" class="kc-welcome-card__title">
            Check out <span class="kc-welcome-card__brand">KickCrates</span>
          </h2>
          <p class="kc-welcome-card__subtitle">
            Earn XP while you watch, climb the Battle Pass, and open crates for
            exclusive emotes, badges, and chat effects — right inside Kick.
          </p>
          <div class="kc-welcome-card__actions">
            <button
              type="button"
              class="kc-welcome-card__cta"
              onClick={() => dismiss(true)}
            >
              Open KickCrates
            </button>
            <button
              type="button"
              class="kc-welcome-card__skip"
              onClick={() => dismiss(false)}
            >
              Not right now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeArt() {
  return (
    <svg
      viewBox="0 0 400 200"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="kc-welcome-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#53fc18" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#53fc18" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="kc-welcome-crate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#53fc18" />
          <stop offset="100%" stop-color="#2cb70b" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="url(#kc-welcome-bg)" />
      <g transform="translate(170, 36)">
        <polygon
          points="30,0 60,18 60,54 30,72 0,54 0,18"
          fill="url(#kc-welcome-crate)"
        />
        <polygon
          points="30,12 48,22 48,42 30,52 12,42 12,22"
          fill="#0b0b0c"
          opacity="0.35"
        />
        <circle cx="30" cy="32" r="6" fill="#0b0b0c" />
        <circle cx="30" cy="32" r="3" fill="#53fc18" />
      </g>
      <g fill="#53fc18" opacity="0.5">
        <circle cx="80" cy="60" r="2" />
        <circle cx="340" cy="80" r="2" />
        <circle cx="60" cy="140" r="3" />
        <circle cx="320" cy="150" r="2" />
        <circle cx="140" cy="170" r="2" />
        <circle cx="260" cy="40" r="2" />
      </g>
    </svg>
  );
}
