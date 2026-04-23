const SKIP_PATH_PREFIXES = [
  "/browse",
  "/categories",
  "/category",
  "/search",
  "/settings",
  "/subscriptions",
  "/following",
  "/clips",
  "/vods",
  "/dashboard",
  "/help",
  "/privacy",
  "/legal",
  "/login",
  "/signup",
];

/**
 * Extracts a lowercase channel slug from a kick.com URL.
 *
 * Returns `null` for any non-channel page (home, browse, settings,
 * auth, etc.) so the router doesn't try to start a watch session
 * on irrelevant routes. Matches the first path segment against
 * `[a-zA-Z0-9_-]{2,32}` — Kick's own slug rules — and rejects
 * hostnames outside `kick.com`.
 *
 * @param loc `window.location`-shaped object (pulled from the SPA-
 *            patched `history` events or the bare `location`).
 * @returns   Lowercased slug, or `null` if this URL isn't a channel.
 */
export function parseChannelSlugFromLocation(loc: Location): string | null {
  if (loc.hostname !== "kick.com" && !loc.hostname.endsWith(".kick.com"))
    return null;
  const path = loc.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return null;
  for (const skip of SKIP_PATH_PREFIXES) {
    if (path === skip || path.startsWith(skip + "/")) return null;
  }
  const first = path.split("/")[1];
  if (!first) return null;
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(first)) return null;
  return first.toLowerCase();
}

/** CSS selectors used to locate Kick DOM nodes. Centralized so fixes only happen in one place when Kick changes its markup. */
export const SELECTORS = {
  videoPlayer: "video",
  mountAnchor: [
    "[data-testid='channel-page']",
    "#navbar-v3",
    "header[role='banner']",
    "body",
  ] as const,
};

/** Returns the stream's `<video>` element, or `null` when the player isn't in the DOM yet. */
export function findVideoElement(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>(SELECTORS.videoPlayer);
}
