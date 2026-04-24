import {
  getEmoteSnapshot,
  subscribeEmotes,
  noteEmoteUse,
  type EmoteSnapshot,
  type PickerEmote,
} from "./emoteState.js";
import { insertEmoteToken } from "./insertToken.js";

const PICKER_ID = "chat-emotes-picker-panel";
const SECTION_ID = "emote-picker-section-name-KickCrates";
const SECTION_LABEL = "KickCrates";
const INJECTED_ATTR = "data-kc-injected";
const TAB_ID = "kc-emote-picker-tab";
const SECTION_ROOT_ID = "kc-emote-picker-section";

/**
 * Injects a "KickCrates" tab + full emote grid into Kick's chat emote picker.
 *
 * Kick's picker is a single scrolling list keyed by anchor IDs
 * (`emote-picker-section-name-<Category>`), with a tab strip whose buttons
 * scroll the list to each anchor. We append one more tab at the end, and one
 * more section after `Global`, matching Kick's exact button markup so the
 * visual treatment (size, rounding, green active underline) is free.
 *
 * Every active-season emote is rendered — owned ones insert `:kc:<slug>:`
 * into the Lexical chat input on click and close the picker, while unowned
 * ones render with Kick's disabled-padlock style and fire
 * `openItemFromPicker` so the caller can show the KickCrates dialog preview
 * in an aspirational "how do I get this" flow. Re-injection is handled by a
 * coarse body observer; idempotency is enforced via a marker attribute on
 * the panel so sustained chat churn doesn't double-inject.
 *
 * @param openItemFromPicker Invoked with the clicked item id for locked
 *                           emotes; callers wire this to the main
 *                           `ItemPreviewDialog`.
 * @returns Teardown that disconnects the observer and drops subscriptions.
 */
export function startEmotePickerInjector(
  openItemFromPicker: (itemId: string) => void,
): () => void {
  let activePanel: HTMLElement | null = null;
  let unsubEmotes: (() => void) | null = null;
  let intersection: IntersectionObserver | null = null;

  function teardownActive(): void {
    if (unsubEmotes) {
      unsubEmotes();
      unsubEmotes = null;
    }
    if (intersection) {
      intersection.disconnect();
      intersection = null;
    }
    activePanel = null;
  }

  function tryInject(): void {
    const panel = document.getElementById(PICKER_ID);
    if (!panel) {
      if (activePanel) teardownActive();
      return;
    }
    if (panel === activePanel && panel.getAttribute(INJECTED_ATTR) === "true") {
      return;
    }
    if (activePanel && activePanel !== panel) teardownActive();

    const labelAnchor = panel.querySelector<HTMLElement>(
      'span[id^="emote-picker-section-name-"]',
    );
    if (!labelAnchor) return;
    const sectionsContainer = labelAnchor.parentElement
      ?.parentElement as HTMLElement | null;
    const scrollContainer =
      labelAnchor.closest<HTMLElement>(".overflow-y-auto");
    const sampleTab = panel.querySelector<HTMLButtonElement>(
      "button[data-active]",
    );
    const tabStrip = sampleTab?.parentElement as HTMLElement | null;
    if (!sectionsContainer || !scrollContainer || !tabStrip) return;

    const tabBtn = buildTabButton();
    tabBtn.addEventListener("click", () => {
      const section = document.getElementById(SECTION_ID);
      if (section && scrollContainer) {
        const offset = section.offsetTop - scrollContainer.offsetTop;
        scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
      }
      setActiveTab(panel, TAB_ID);
    });
    tabStrip.appendChild(tabBtn);

    const sectionRoot = document.createElement("div");
    sectionRoot.id = SECTION_ROOT_ID;
    sectionRoot.className = "grid gap-2";
    sectionsContainer.appendChild(sectionRoot);

    renderSection(sectionRoot, getEmoteSnapshot(), openItemFromPicker, panel);
    unsubEmotes = subscribeEmotes((snap) => {
      renderSection(sectionRoot, snap, openItemFromPicker, panel);
    });

    intersection = installActiveTracker(panel, scrollContainer);

    panel.setAttribute(INJECTED_ATTR, "true");
    activePanel = panel;
  }

  let pending: number | null = null;
  const observer = new MutationObserver(() => {
    if (pending !== null) return;
    pending = window.setTimeout(() => {
      pending = null;
      tryInject();
    }, 120);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  tryInject();

  return () => {
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    observer.disconnect();
    teardownActive();
    const panel = document.getElementById(PICKER_ID);
    if (panel) {
      panel.removeAttribute(INJECTED_ATTR);
      panel.querySelector("#" + TAB_ID)?.remove();
      panel.querySelector("#" + SECTION_ROOT_ID)?.remove();
    }
  };
}

function buildTabButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = TAB_ID;
  btn.type = "button";
  btn.setAttribute("data-active", "false");
  btn.setAttribute("data-kc-tab", "kickcrates");
  btn.title = "KickCrates";
  btn.className =
    "group flex size-11 shrink-0 grow-0 flex-col items-center gap-2 lg:size-10 [&_svg]:size-7 [&_svg]:rounded-full [&_svg]:lg:size-6";
  btn.innerHTML = crateGlyph() + underlineBar();
  return btn;
}

function crateGlyph(): string {
  return (
    '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#53fc18" aria-hidden="true">' +
    '<path d="M16 4 5 9v7c0 6.1 4.5 12 11 15 6.5-3 11-8.9 11-15V9L16 4Zm0 2.3 9 4v5.7c0 5.2-3.8 10.6-9 13-5.2-2.4-9-7.8-9-13v-5.7l9-4Z"/>' +
    '<path d="m10 14 6-3 6 3v6l-6 3-6-3v-6Zm2 1.4v3.4l4 2 4-2v-3.4l-4-2-4 2Z"/>' +
    "</svg>"
  );
}

function underlineBar(): string {
  return '<div class="betterhover:group-hover:bg-[#475054] z-common h-0.5 w-full transition-colors duration-300 group-data-[active=true]:!bg-green-500"></div>';
}

function setActiveTab(panel: HTMLElement, activeId: string): void {
  const tabs = panel.querySelectorAll<HTMLButtonElement>("button[data-active]");
  for (const t of tabs) {
    t.setAttribute("data-active", t.id === activeId ? "true" : "false");
  }
}

function installActiveTracker(
  panel: HTMLElement,
  scrollContainer: HTMLElement,
): IntersectionObserver {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = (e.target as HTMLElement).id;
        if (!id.startsWith("emote-picker-section-name-")) continue;
        const name = id.slice("emote-picker-section-name-".length);
        const tabs = panel.querySelectorAll<HTMLButtonElement>(
          "button[data-active]",
        );
        for (const t of tabs) {
          if (t.id === TAB_ID) {
            t.setAttribute(
              "data-active",
              name === SECTION_LABEL ? "true" : "false",
            );
          }
        }
      }
    },
    { root: scrollContainer, threshold: 0, rootMargin: "0px 0px -80% 0px" },
  );
  const labels = panel.querySelectorAll<HTMLElement>(
    'span[id^="emote-picker-section-name-"]',
  );
  for (const l of labels) io.observe(l);
  return io;
}

function renderSection(
  root: HTMLElement,
  snap: EmoteSnapshot,
  openItemFromPicker: (itemId: string) => void,
  panel: HTMLElement,
): void {
  root.innerHTML = "";
  const label = document.createElement("span");
  label.id = SECTION_ID;
  label.className = "text-xs font-medium text-neutral-400";
  label.textContent = SECTION_LABEL;
  root.appendChild(label);

  if (snap.all.length === 0) {
    const empty = document.createElement("div");
    empty.className = "text-xs text-neutral-500 py-2";
    empty.textContent =
      "No emotes in this season yet. Check back after seeding.";
    root.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-8 justify-between gap-2";
  for (const emote of snap.all) {
    grid.appendChild(buildEmoteButton(emote, openItemFromPicker, panel));
  }
  root.appendChild(grid);
}

function buildEmoteButton(
  emote: PickerEmote,
  openItemFromPicker: (itemId: string) => void,
  panel: HTMLElement,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("data-state", "closed");
  btn.setAttribute("data-kc-emote-slug", emote.slug);
  btn.className =
    "betterhover:hover:bg-white/10 disabled:betterhover:hover:bg-white/10 relative aspect-square size-10 rounded-sm p-1 disabled:opacity-40 lg:size-9";
  btn.title = emote.name + (emote.owned ? "" : " (locked)");

  const art = document.createElement("span");
  art.className = "kc-epkr-art aspect-square size-8 lg:size-7";
  art.innerHTML = emote.assetSvg;
  btn.appendChild(art);

  if (!emote.owned) {
    btn.disabled = true;
    btn.appendChild(padlockGlyph());
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openItemFromPicker(emote.itemId as unknown as string);
    });
  } else {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      insertEmoteToken(emote.slug);
      noteEmoteUse(emote.slug);
      closePicker(panel);
    });
  }
  return btn;
}

function padlockGlyph(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "white");
  svg.setAttribute("class", "absolute right-0 bottom-0 h-2 w-2");
  const path = document.createElementNS(ns, "path");
  path.setAttribute(
    "d",
    "M11.8 6.3V1h-7v5.3H3V15h10.5V6.2h-1.8ZM6.5 2.8H10v3.5H6.5V2.8Zm4 7.8H9v1.8H7.4v-1.8H6V9h4.3v1.7Z",
  );
  svg.appendChild(path);
  return svg;
}

function closePicker(panel: HTMLElement): void {
  const closeBtn = panel.querySelector<HTMLButtonElement>(
    'button[class*="size-8"]:has(svg path[d*="M28 6.99204"])',
  );
  if (closeBtn) {
    closeBtn.click();
    return;
  }
  const fallback = panel
    .querySelector<HTMLElement>("#search-emotes-input")
    ?.parentElement?.parentElement?.querySelector<HTMLButtonElement>(
      "button.size-8",
    );
  fallback?.click();
}
