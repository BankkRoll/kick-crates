export type PageTabKey =
  | "crates"
  | "battlepass"
  | "collection"
  | "loadout"
  | "profile";

const VALID_TABS: ReadonlyArray<PageTabKey> = [
  "crates",
  "battlepass",
  "collection",
  "loadout",
  "profile",
];

/** Base path Kick renders the bot-profile/404 shell at. We own the
 * `kickcrates` username on Kick and ride on top of whatever Kick
 * serves there: a 404 today, eventually a bot profile page. */
export const PAGE_BASE = "/kickcrates";

/** Query parameter that toggles our in-page surface on. Picking the
 * tab via `?kc_tab=<tab>` (rather than a deeper path like
 * `/kickcrates/app/<tab>`) matters because Kick only renders its
 * navbar + sidebar shell at top-level route segments — deeper paths
 * 404 into a bare body with no chrome, which breaks the "feels like
 * a Kick page" goal. Query params sit inside the same top-level
 * route, so the shell stays rendered. */
export const PAGE_QUERY_KEY = "kc_tab";

function matchesBase(loc: Location): boolean {
  if (loc.hostname !== "kick.com" && !loc.hostname.endsWith(".kick.com"))
    return false;
  const path = loc.pathname.replace(/\/+$/, "").toLowerCase();
  return path === PAGE_BASE;
}

/**
 * Pulls our page tab out of a kick.com URL. Returns `null` for any URL
 * that isn't `/kickcrates?kc_tab=<tab>` with a recognized tab value so
 * callers can cheaply unmount and let Kick's own route rendering show
 * through.
 *
 * Unknown tab slugs (e.g. `?kc_tab=foo`) are treated as "not ours"
 * rather than rendering a blank shell — future-proofs against typos
 * or mis-linked deep URLs.
 */
export function parsePageTabFromLocation(loc: Location): PageTabKey | null {
  if (!matchesBase(loc)) return null;
  const params = new URLSearchParams(loc.search);
  const tab = params.get(PAGE_QUERY_KEY);
  if (!tab) return null;
  return (VALID_TABS as readonly string[]).includes(tab)
    ? (tab as PageTabKey)
    : null;
}

/** True when the current URL is our app page (base path + recognized
 * query value). Used by the sidebar to light up the accordion row
 * and keep it expanded across sub-tab navigation. */
export function isPagePath(loc: Location): boolean {
  if (!matchesBase(loc)) return false;
  const params = new URLSearchParams(loc.search);
  const tab = params.get(PAGE_QUERY_KEY);
  return tab !== null && (VALID_TABS as readonly string[]).includes(tab);
}

/** Builds the canonical URL for an app tab. Centralized so sidebar
 * links, back buttons, and any future deep links agree on the exact
 * query-key casing + base path. */
export function pagePathFor(tab: PageTabKey): string {
  return PAGE_BASE + "?" + PAGE_QUERY_KEY + "=" + tab;
}

type PageChangeCallback = (tab: PageTabKey | null) => void;

const SETTLE_MS = 120;

/**
 * Detects changes to the app-pages tab and forwards the current tab to
 * `onChange`. Emits `null` when the URL leaves our namespace.
 *
 * Hooks SPA navigation the same way the channel router does:
 *   - monkey-patches `history.pushState` / `history.replaceState`
 *   - listens for `popstate`
 *   - polls every 1.5 s as a safety net
 *
 * Uses a shorter settle window than the channel router (120 ms vs
 * 250 ms) because sidebar clicks push the URL synchronously and we
 * want the page body to appear before any visible reflow.
 *
 * @returns Teardown: restores history methods and clears timers.
 */
export function startPageRouter(onChange: PageChangeCallback): () => void {
  let lastEmitted: PageTabKey | null | undefined = undefined;
  let timer: number | null = null;
  let pending: PageTabKey | null = null;

  function commit(): void {
    timer = null;
    if (pending !== lastEmitted) {
      lastEmitted = pending;
      onChange(pending);
    }
  }

  function schedule(): void {
    pending = parsePageTabFromLocation(location);
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(commit, SETTLE_MS);
  }

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  history.pushState = function (
    ...args: Parameters<typeof originalPush>
  ): void {
    originalPush.apply(this, args);
    queueMicrotask(schedule);
  };
  history.replaceState = function (
    ...args: Parameters<typeof originalReplace>
  ): void {
    originalReplace.apply(this, args);
    queueMicrotask(schedule);
  };

  const onPop = () => queueMicrotask(schedule);
  window.addEventListener("popstate", onPop);

  const interval = window.setInterval(schedule, 1500);
  schedule();

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener("popstate", onPop);
    window.clearInterval(interval);
    if (timer !== null) window.clearTimeout(timer);
  };
}

/**
 * Navigate to one of our tabs. Two behaviors depending on where the
 * user currently is:
 *
 *  - **Already on `/kickcrates`** (just switching tabs): uses
 *    `history.pushState` for a soft nav. Kick doesn't re-render,
 *    only the query param changes, our page surface swaps tab.
 *
 *  - **Anywhere else** (home page, a stream, etc.): does a real
 *    navigation via `location.assign`. This is load-bearing —
 *    `pushState` alone only updates the URL without telling Kick's
 *    Next.js router to route. Result would be: URL says
 *    `/kickcrates?kc_tab=crates` but Kick's DOM still shows the
 *    homepage / stream player, and our surface overlays on top of
 *    the wrong content. A real navigation forces Kick to load its
 *    `/kickcrates` shell (404 or bot profile), THEN our content
 *    script mounts our surface over it.
 */
export function navigateToPage(tab: PageTabKey): void {
  const target = pagePathFor(tab);
  const currentPath = location.pathname.replace(/\/+$/, "").toLowerCase();
  const currentFull = currentPath + (location.search || "");
  if (currentFull === target) return;
  if (currentPath === PAGE_BASE) {
    history.pushState(null, "", target);
    return;
  }
  location.assign(target);
}
