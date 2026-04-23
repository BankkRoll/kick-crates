import { parseChannelSlugFromLocation } from "./kick.js";

type RouteChangeCallback = (slug: string | null) => void;

const SLUG_SETTLE_MS = 250;

/**
 * Detects channel-slug changes inside Kick's SPA and forwards the
 * settled slug to `onChange`.
 *
 * The callback fires only after the URL stays the same for
 * `SLUG_SETTLE_MS` (250 ms), which prevents a burst of
 * `session/start` → `session/end` churn when Kick re-emits the same
 * route during hydration or the user rapid-clicks between channels.
 *
 * Hooks into SPA navigation three ways:
 *   - monkey-patches `history.pushState` / `history.replaceState`
 *   - listens for `popstate`
 *   - polls every 1.5 s as a safety net for any path we missed
 *
 * The teardown restores the original `history` methods and clears
 * every listener / timer.
 *
 * @param onChange Invoked with the new slug, or `null` when the user
 *                 leaves a channel page.
 * @returns        Teardown function.
 */
export function startRouter(onChange: RouteChangeCallback): () => void {
  let lastEmitted: string | null | undefined = undefined;
  let pendingTimer: number | null = null;
  let pendingSlug: string | null = null;

  function commitIfChanged(): void {
    pendingTimer = null;
    if (pendingSlug !== lastEmitted) {
      lastEmitted = pendingSlug;
      onChange(pendingSlug);
    }
  }

  function schedule(slug: string | null): void {
    pendingSlug = slug;
    if (pendingTimer !== null) window.clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(commitIfChanged, SLUG_SETTLE_MS);
  }

  function tick(): void {
    schedule(parseChannelSlugFromLocation(location));
  }

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  history.pushState = function (
    ...args: Parameters<typeof originalPush>
  ): void {
    originalPush.apply(this, args);
    queueMicrotask(tick);
  };
  history.replaceState = function (
    ...args: Parameters<typeof originalReplace>
  ): void {
    originalReplace.apply(this, args);
    queueMicrotask(tick);
  };

  const onPop = () => queueMicrotask(tick);
  window.addEventListener("popstate", onPop);

  const interval = window.setInterval(tick, 1500);
  tick();

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener("popstate", onPop);
    window.clearInterval(interval);
    if (pendingTimer !== null) window.clearTimeout(pendingTimer);
  };
}
