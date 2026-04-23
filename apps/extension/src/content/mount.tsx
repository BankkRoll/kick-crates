import { render } from "preact";
import { Root } from "./dialog/Root.js";
import { mountSidebar } from "./sidebar.js";
import { KC_CSS } from "./styles.js";
import { WelcomeDialog } from "./WelcomeDialog.jsx";

const STYLE_ID = "kc-style";
const ROOT_ID = "kc-dialog-root";
const WELCOME_ID = "kc-welcome-root";

/**
 * Attaches KickCrates to the current kick.com page.
 *
 * Performs, in order:
 *   1. Injects the extension's stylesheet into `<head>`.
 *   2. Mounts the sidebar + mobile-drawer entry buttons.
 *   3. Creates two fixed-position root hosts (`kc-dialog-root`,
 *      `kc-welcome-root`) and renders the main dialog + the pre-auth
 *      welcome dialog into them.
 *   4. Starts a `document.body` MutationObserver that re-mounts the
 *      hosts if Kick's SPA wipes them during route changes. The
 *      observer is `childList`-only (no subtree) and debounced to 200 ms
 *      so chat churn never triggers a reflow.
 *
 * @returns Teardown function: disconnects the observer, unmounts the
 *          Preact trees (so their `useEffect` cleanups cancel any
 *          reactive Convex subscriptions), removes the root hosts, and
 *          strips the stylesheet.
 */
export function mountKickCrates(): () => void {
  injectStyles();
  const unsubSidebar = mountSidebar();

  let rendered = false;
  function renderIfNeeded(host: HTMLElement) {
    if (rendered) return;
    try {
      render(<Root />, host);
      rendered = true;
    } catch (e) {
      console.error("[KickCrates] dialog render failed:", e);
    }
  }

  let welcomeRendered = false;
  function renderWelcomeIfNeeded(host: HTMLElement) {
    if (welcomeRendered) return;
    try {
      render(<WelcomeDialog />, host);
      welcomeRendered = true;
    } catch (e) {
      console.error("[KickCrates] welcome render failed:", e);
    }
  }

  const initialHost = ensureRoot(ROOT_ID);
  if (initialHost) renderIfNeeded(initialHost);

  const initialWelcome = ensureRoot(WELCOME_ID);
  if (initialWelcome) renderWelcomeIfNeeded(initialWelcome);

  let pending: number | null = null;
  function check() {
    pending = null;
    if (!document.getElementById(ROOT_ID)) {
      const host = ensureRoot(ROOT_ID);
      if (host) {
        rendered = false;
        renderIfNeeded(host);
      }
    }
    if (!document.getElementById(WELCOME_ID)) {
      const host = ensureRoot(WELCOME_ID);
      if (host) {
        welcomeRendered = false;
        renderWelcomeIfNeeded(host);
      }
    }
  }
  const bodyObs = new MutationObserver(() => {
    if (pending !== null) return;
    pending = window.setTimeout(check, 200);
  });
  if (document.body) {
    bodyObs.observe(document.body, { childList: true });
  }

  return () => {
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    unsubSidebar();
    bodyObs.disconnect();
    for (const id of [ROOT_ID, WELCOME_ID]) {
      const host = document.getElementById(id);
      if (!host) continue;
      try {
        render(null, host);
      } catch {}
      host.remove();
    }
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  };
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = KC_CSS;
  (document.head ?? document.documentElement).appendChild(style);
}

function ensureRoot(id: string): HTMLElement | null {
  const existing = document.getElementById(id);
  if (existing && existing.isConnected) return existing;
  if (existing) existing.remove();
  const parent = document.body ?? document.documentElement;
  if (!parent) return null;
  const el = document.createElement("div");
  el.id = id;
  el.setAttribute("data-kc-root", "true");
  el.style.cssText =
    "position: fixed !important;" +
    "top: 0 !important;" +
    "left: 0 !important;" +
    "width: 0 !important;" +
    "height: 0 !important;" +
    "z-index: 2147483647 !important;" +
    "pointer-events: none !important;" +
    "display: block !important;" +
    "visibility: visible !important;" +
    "opacity: 1 !important;";
  try {
    parent.appendChild(el);
    return el;
  } catch (e) {
    console.error("[KickCrates] appendChild failed:", e);
    return null;
  }
}
