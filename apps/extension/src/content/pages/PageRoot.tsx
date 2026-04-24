import { useEffect, useState } from "preact/hooks";
import { DialogContents } from "../Root.jsx";
import {
  navigateToPage,
  parsePageTabFromLocation,
  startPageRouter,
  type PageTabKey,
} from "../pageRouter.js";

/**
 * Full-page surface for KickCrates, mounted when the URL is
 * `/kickcrates?kc_tab=<tab>`. Rides on top of whatever Kick renders
 * at `/kickcrates` — a 404 today, eventually a bot-profile page —
 * and covers the main content area with the dashboard. The 404
 * markup is also hidden via `html.kc-page-active` CSS rules (see
 * styles.ts) so screen readers don't announce "Oops…" underneath.
 *
 * The query-param scheme (vs. a deeper path like `/kickcrates/app/*`)
 * is load-bearing: Kick only renders its navbar + sidebar shell at
 * top-level route segments; deeper paths 404 into a bare body with
 * no chrome, which kills the "feels like a Kick page" effect.
 *
 * Sits in the fixed overlay root next to the dialog; becoming
 * visible just means rendering non-null, so there's no DOM churn
 * when the user toggles between channel pages and app pages.
 */
export function PageRoot() {
  const [tab, setTab] = useState<PageTabKey | null>(() =>
    parsePageTabFromLocation(location),
  );

  useEffect(() => startPageRouter(setTab), []);

  useEffect(() => {
    const root = document.documentElement;
    if (tab) root.classList.add("kc-page-active");
    else root.classList.remove("kc-page-active");
    return () => root.classList.remove("kc-page-active");
  }, [tab !== null]);

  if (!tab) return null;

  return (
    <div class="kc-page-surface" role="region" aria-label="KickCrates">
      <DialogContents
        pageMode
        tab={tab}
        onTabChange={navigateToPage}
        onClose={() => {
          history.pushState(null, "", "/");
        }}
      />
    </div>
  );
}
