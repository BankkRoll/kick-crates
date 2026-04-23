import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { api } from "../../../../convex/_generated/api.js";
import { getReactiveClient, applyAuthToReactive } from "../convex.js";
import { subscribeDialog, toggleDialog } from "./dialogState.js";
import { CrateIconFilled, CrateIconOutline } from "./icons.js";
import { isExtensionContextAlive } from "../chromeSafe.js";

const HOST_ID = "kc-sidebar-item";
const MOBILE_HOST_ID = "kc-mobile-menu-item";

type SidebarState = {
  me: { level: number; totalXp: number } | null;
  anyCrateReady: boolean;
};

function useSidebarState(): SidebarState {
  const [me, setMe] = useState<{ level: number; totalXp: number } | null>(null);
  const [anyCrateReady, setAnyCrateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    type CrateDef = {
      _id: string;
      slug: string;
      watchMinutesRequired?: number;
      cooldownHours?: number;
      tokenGated: boolean;
      active: boolean;
    };
    type CrateStateRow = {
      crateDefId: string;
      secondsEarned: number;
      lastOpenedAt?: number;
      tokensHeld: number;
    };
    let latestDefs: CrateDef[] = [];
    let latestStates: CrateStateRow[] = [];

    function recompute(): void {
      let ready = false;
      for (const def of latestDefs) {
        if (!def.active) continue;
        const st = latestStates.find((r) => r.crateDefId === def._id);
        if (def.tokenGated) {
          if (st && st.tokensHeld > 0) {
            ready = true;
            break;
          }
        } else {
          const need = (def.watchMinutesRequired ?? 0) * 60;
          if (!st || st.secondsEarned < need) continue;
          if (def.cooldownHours && st.lastOpenedAt) {
            const nextAllowed =
              st.lastOpenedAt + def.cooldownHours * 3600 * 1000;
            if (Date.now() < nextAllowed) continue;
          }
          ready = true;
          break;
        }
      }
      if (!cancelled) setAnyCrateReady(ready);
    }

    (async () => {
      await applyAuthToReactive();
      if (cancelled) return;
      const client = getReactiveClient();
      if (!client) return;
      unsubs.push(
        client.onUpdate(api.users.me, {}, (v) => {
          if (cancelled) return;
          setMe((v as { level: number; totalXp: number } | null) ?? null);
        }),
      );
      unsubs.push(
        client.onUpdate(api.crates.listCrates, {}, (defs) => {
          latestDefs = (defs as CrateDef[] | null) ?? [];
          recompute();
        }),
      );
      unsubs.push(
        client.onUpdate(api.crates.myCrateStates, {}, (states) => {
          latestStates = (states as CrateStateRow[] | null) ?? [];
          recompute();
        }),
      );
    })();

    function onStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) {
      if (area !== "local") return;
      if (!("kc_session_v1" in changes)) return;
      applyAuthToReactive().catch(() => {});
    }
    if (isExtensionContextAlive()) {
      chrome.storage.onChanged.addListener(onStorageChange);
    }
    return () => {
      cancelled = true;
      for (const u of unsubs) u();
      if (isExtensionContextAlive()) {
        chrome.storage.onChanged.removeListener(onStorageChange);
      }
    };
  }, []);

  return { me, anyCrateReady };
}

function SidebarItem() {
  const [open, setOpen] = useState(false);
  const { me, anyCrateReady } = useSidebarState();

  useEffect(() => subscribeDialog(setOpen), []);

  const showNewBadge = !me || me.totalXp === 0;

  function onClick(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    toggleDialog();
  }

  return (
    <button
      class="kc-sidebar-btn"
      data-open={open ? "true" : "false"}
      onClick={onClick}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Open KickCrates"
    >
      {open ? <CrateIconFilled /> : <CrateIconOutline />}
      <span class="kc-sidebar-label">Crates</span>
      {me ? (
        <span class="kc-sidebar-level" title="Level">
          Lv {me.level}
        </span>
      ) : null}
      {anyCrateReady ? (
        <span class="kc-sidebar-ready-dot" aria-label="Crate ready" />
      ) : null}
      {showNewBadge ? <span class="kc-sidebar-new-badge">New</span> : null}
    </button>
  );
}

function findSidebarList(): HTMLUListElement | null {
  const wrapper = document.getElementById("sidebar-wrapper");
  if (!wrapper) return null;
  return wrapper.querySelector<HTMLUListElement>("ul");
}

function unmountHost(host: HTMLElement | null): void {
  if (!host) return;
  try {
    render(null, host);
  } catch {}
  host.remove();
}

function ensureInjected(): void {
  const existing = document.getElementById(HOST_ID);
  const list = findSidebarList();
  if (!list) {
    unmountHost(existing);
    return;
  }
  if (existing && existing.parentElement === list) return;
  unmountHost(existing);

  const li = document.createElement("li");
  li.id = HOST_ID;
  li.className = "kc-sidebar-item";
  list.appendChild(li);
  render(<SidebarItem />, li);
}

function MobileMenuItem() {
  const { me, anyCrateReady } = useSidebarState();
  const showNewBadge = !me || me.totalXp === 0;

  return (
    <button
      type="button"
      class="kc-mobile-menu-btn"
      aria-haspopup="dialog"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDialog();
      }}
    >
      <span class="kc-mobile-menu-btn__icon" aria-hidden="true">
        <CrateIconOutline />
      </span>
      <span class="kc-mobile-menu-btn__label">KickCrates</span>
      {me ? (
        <span class="kc-mobile-menu-btn__level" title="Level">
          Lv {me.level}
        </span>
      ) : null}
      {anyCrateReady ? (
        <span class="kc-mobile-menu-btn__ready" aria-label="Crate ready" />
      ) : null}
      {showNewBadge ? <span class="kc-mobile-menu-btn__new">New</span> : null}
    </button>
  );
}

function findMobileMenuAnchor(): {
  parent: HTMLElement;
  after: HTMLElement;
} | null {
  const modal = document.querySelector<HTMLElement>(
    'div[class*="z-modal"] a[href="/drops"]',
  );
  if (!modal) return null;
  const parent = modal.parentElement;
  if (!parent) return null;
  return { parent, after: modal };
}

function ensureMobileInjected(): void {
  const existing = document.getElementById(MOBILE_HOST_ID);
  const anchor = findMobileMenuAnchor();
  if (!anchor) {
    unmountHost(existing);
    return;
  }
  if (existing && existing.parentElement === anchor.parent) return;
  unmountHost(existing);

  const host = document.createElement("div");
  host.id = MOBILE_HOST_ID;
  anchor.after.insertAdjacentElement("afterend", host);
  render(<MobileMenuItem />, host);
}

/**
 * Injects the KickCrates entry buttons into Kick's desktop sidebar and
 * mobile drawer, and keeps them mounted across SPA navigation.
 *
 * Both entries share a single {@link useSidebarState} subscription tree
 * (user level, ready-crate flag) so only one set of Convex reactive
 * queries is active regardless of viewport.
 *
 * A single `document.body` subtree `MutationObserver` drives re-injection
 * with a 250 ms debounce — Kick's chat produces hundreds of mutations per
 * second under the body subtree, and the debounce collapses a sustained
 * burst into at most one check per window. `ensureInjected` /
 * `ensureMobileInjected` short-circuit when hosts are already attached to
 * the correct parent. The observer is intentionally NOT scoped to
 * `#sidebar-wrapper` because Kick's SPA sometimes swaps that element
 * wholesale, which would leave a scoped observer attached to a detached
 * node.
 *
 * @returns Teardown: cancels the pending debounce, disconnects the
 *          observer, and unmounts both host elements (running Preact
 *          effect cleanups so the Convex subscriptions are released).
 */
export function mountSidebar(): () => void {
  ensureInjected();
  ensureMobileInjected();

  let pending: number | null = null;
  const check = () => {
    pending = null;
    ensureInjected();
    ensureMobileInjected();
  };
  const schedule = () => {
    if (pending !== null) return;
    pending = window.setTimeout(check, 250);
  };

  const obs = new MutationObserver(schedule);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    obs.disconnect();
    unmountHost(document.getElementById(HOST_ID));
    unmountHost(document.getElementById(MOBILE_HOST_ID));
  };
}
