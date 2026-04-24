import {
  getEmoteSnapshot,
  subscribeEmotes,
  noteEmoteUse,
  type EmoteSnapshot,
} from "./emoteState.js";
import { insertEmoteToken } from "./insertToken.js";

const HOLDER_ID = "quick-emotes-holder";
const ROW_ID = "kc-quick-row";

/**
 * Injects the user's recently-used KickCrates emotes into Kick's
 * `#quick-emotes-holder` above the chat input.
 *
 * Kick's own quick row is driven by their click-tracking of Kick emotes —
 * they never observe ours, so we keep a parallel recency map in
 * `chrome.storage.local` (see {@link noteEmoteUse}). Our buttons are
 * prepended as their own flex children matching Kick's wrapper markup, so
 * the layout, spacing, and hover affordances come for free. The row
 * re-renders whenever the emote snapshot changes (new ownership, recency
 * update, cross-tab storage event). Idempotent re-injection rides a coarse
 * `document.body` observer; the presence of a child with `ROW_ID` is the
 * marker.
 *
 * @returns Teardown that disconnects the observer and drops subscriptions.
 */
export function startQuickEmotesInjector(): () => void {
  let row: HTMLElement | null = null;
  let unsub: (() => void) | null = null;

  function ensureInjected(): void {
    const holder = document.getElementById(HOLDER_ID);
    if (!holder) {
      teardownRow();
      return;
    }
    const inner = holder.querySelector<HTMLElement>(
      "div.flex.flex-wrap, div.flex.h-full, div.flex.items-center",
    );
    const target = inner ?? (holder.firstElementChild as HTMLElement | null);
    if (!target) return;
    const existing = target.querySelector<HTMLElement>("#" + ROW_ID);
    if (existing) {
      row = existing;
    } else {
      row = document.createElement("div");
      row.id = ROW_ID;
      row.className = "flex h-full items-center gap-0.5 pr-1";
      target.prepend(row);
    }
    if (!unsub) {
      unsub = subscribeEmotes(render);
    }
  }

  function render(snap: EmoteSnapshot): void {
    if (!row) return;
    row.innerHTML = "";
    if (snap.recentOwnedSlugs.length === 0) return;
    for (const slug of snap.recentOwnedSlugs) {
      const emote = snap.ownedBySlug.get(slug);
      if (!emote) continue;
      row.appendChild(buildQuickButton(emote.slug, emote.name, emote.assetSvg));
    }
  }

  function teardownRow(): void {
    if (unsub) {
      unsub();
      unsub = null;
    }
    row?.remove();
    row = null;
  }

  let pending: number | null = null;
  const observer = new MutationObserver(() => {
    if (pending !== null) return;
    pending = window.setTimeout(() => {
      pending = null;
      ensureInjected();
    }, 200);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  ensureInjected();
  const snapshotAtStart = getEmoteSnapshot();
  if (row) render(snapshotAtStart);

  return () => {
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    observer.disconnect();
    teardownRow();
  };
}

function buildQuickButton(
  slug: string,
  name: string,
  assetSvg: string,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "h-full w-fit";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = name;
  btn.setAttribute("data-state", "closed");
  btn.setAttribute("data-kc-emote-slug", slug);
  btn.className =
    "relative aspect-square h-full shrink-0 rounded-sm p-0.5 betterhover:hover:bg-white/10";
  const art = document.createElement("span");
  art.className = "kc-qe-art aspect-square w-full";
  art.innerHTML = assetSvg;
  btn.appendChild(art);
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    insertEmoteToken(slug);
    noteEmoteUse(slug);
  });
  wrap.appendChild(btn);
  return wrap;
}
