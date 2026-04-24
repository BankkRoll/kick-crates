export const KC_CSS = `
/* ═════════════════════════════════════════════════════════════════════
   KICKCRATES design tokens + base
   ═════════════════════════════════════════════════════════════════════ */
:root {
  /* Mirrors Kick's dark theme — greyscale bg + lime-green primary. */
  --kc-bg: #0b0b0c;
  --kc-surface: #17191a;
  --kc-surface-1: #1e2022;
  --kc-surface-2: #2a2c2f;
  --kc-border: rgba(255,255,255,0.06);
  --kc-border-strong: rgba(255,255,255,0.12);
  --kc-primary: #53fc18;
  --kc-primary-soft: #6bff3a;
  --kc-primary-dim: #3fc513;
  --kc-highlight: #53fc18;
  --kc-text: #ffffff;
  --kc-text-dim: #e3e3e3;
  --kc-muted: #a1a1a3;
  --kc-muted-dim: #6b6d70;
  --kc-warn: #ffb020;
  --kc-danger: #ff6363;
  --kc-rarity-common: #b0b3b5;
  --kc-rarity-uncommon: #53fc18;
  --kc-rarity-rare: #66d4ff;
  --kc-rarity-epic: #c78bff;
  --kc-rarity-legendary: #ffc53d;
}
html.kc-no-scroll { overflow: hidden !important; }

/* ═════════════════════════════════════════════════════════════════════
   Inline SVG art containers
   Every item "art" container (emote tile, badge, loadout preview, tier
   strip cell, hero art, crate card, unlock reveal, claim grid) receives
   the raw SVG as a child via dangerouslySetInnerHTML. These rules size
   that child SVG to fill the container regardless of the SVG's intrinsic
   viewBox. Preserving aspect ratio inside object-fit: contain semantics.
   ═════════════════════════════════════════════════════════════════════ */
.kc-item__art > svg,
.kc-slot__preview > svg,
.kc-recent-row__art > svg,
.kc-bp__hero-art > svg,
.kc-tier__art > svg,
.kc-card__art > svg,
.kc-unlock__art > svg,
.kc-claim__art > svg,
.kc-claim__grid-art > svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ═════════════════════════════════════════════════════════════════════
   Sidebar injected item
   ═════════════════════════════════════════════════════════════════════ */
/* Mirror Kick's native sidebar buttons in both collapsed and expanded
   states. Our single button switches layout based on the wrapper's width
   class: collapsed = icon centered (label visually hidden), expanded =
   icon + label on a single row matching the native Home/Browse/Following
   rhythm (gap-x-4, px-4, justify-start, h-12). */
.kc-sidebar-item { list-style: none; position: relative; }
.kc-sidebar-btn {
  all: unset;
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;    /* collapsed default */
  gap: 8px;                   /* collapsed default */
  width: 100%;
  height: 48px;
  padding: 4px;
  border-radius: 4px;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.kc-sidebar-btn:hover { background: rgba(255,255,255,0.08); }
.kc-sidebar-btn:active { background: rgba(255,255,255,0.12); }
.kc-sidebar-btn[data-open="true"] {
  background: rgba(255,255,255,0.10);
  color: var(--kc-primary);
}
/* Icon sized at 1em (16px at text-base) to mirror Kick's [&_svg]:size-[1em]
   rule on their native nav buttons. */
.kc-sidebar-icon {
  flex: 0 0 auto;
  width: 1em; height: 1em;
  fill: currentColor;
}

/* Collapsed-state indicators — overlay the icon like a notification dot. */
.kc-sidebar-label {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.kc-sidebar-level {
  position: absolute;
  top: 6px; right: 6px;
  min-width: 18px; height: 14px;
  padding: 0 4px;
  border-radius: 7px;
  background: var(--kc-primary);
  color: #06140a;
  font-size: 9px; font-weight: 800; letter-spacing: 0.02em;
  display: inline-flex; align-items: center; justify-content: center;
  line-height: 1;
  pointer-events: none;
}
.kc-sidebar-ready-dot {
  position: absolute;
  top: 8px; right: 8px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--kc-primary);
  box-shadow: 0 0 0 2px #0e0e10;
  pointer-events: none;
}
.kc-sidebar-new-badge {
  position: absolute;
  top: 6px; right: 6px;
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--kc-primary);
  color: #06140a;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
  pointer-events: none;
}
.kc-sidebar-level ~ .kc-sidebar-new-badge { right: 30px; }
.kc-sidebar-level ~ .kc-sidebar-ready-dot { right: 30px; }

/* ═══ Expanded sidebar — inherit Kick's row layout when the wrapper uses
   the expanded-width class. This selector matches any CSS class containing
   the literal sidebar-expanded-width, which Kick applies on #sidebar-wrapper
   when the nav drawer is open. Falls back to collapsed styling otherwise. */
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-btn {
  justify-content: flex-start;
  gap: 16px;
  padding: 4px 16px;
}
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-label {
  position: static;
  width: auto; height: auto; padding: 0; margin: 0;
  overflow: visible; clip: auto;
  white-space: nowrap;
  border: 0;
  flex: 1 1 auto;
  font-weight: 600;
}
/* In expanded state the level pill/new badge sit at the row's trailing
   edge like a list-item accessory, not floating over the icon. */
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-level {
  position: static;
  margin-left: auto;
}
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-ready-dot {
  position: static;
  margin-left: auto;
  box-shadow: none;
}
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-new-badge {
  position: static;
  margin-left: auto;
}
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-level ~ .kc-sidebar-new-badge,
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-level ~ .kc-sidebar-ready-dot {
  margin-left: 6px;
}

/* ═════════════════════════════════════════════════════════════════════
   Sidebar accordion — parent button above, 5 sub-items below. The
   parent keeps its existing kc-sidebar-btn styling for visual parity
   with Kick's native rows; the submenu slides open underneath with
   indented sub-rows that mirror Kick's tighter nested-link rhythm.
   ═════════════════════════════════════════════════════════════════════ */
.kc-sidebar-group {
  display: contents;
}
.kc-sidebar-chevron {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 12px; height: 12px;
  display: none;
  align-items: center; justify-content: center;
  color: var(--kc-muted);
  transition: transform 180ms ease, color 180ms ease;
  pointer-events: none;
}
.kc-sidebar-chevron svg { width: 100%; height: 100%; }
.kc-sidebar-chevron--open { transform: translateY(-50%) rotate(180deg); color: var(--kc-text); }

/* Chevron only renders in the expanded sidebar; in the icon-only
   collapsed sidebar there's no submenu to signal. */
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-chevron {
  display: inline-flex;
}

/* Also in expanded mode: push the level pill/new badge away from the
   chevron so they don't stack. */
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-btn .kc-sidebar-level,
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-btn .kc-sidebar-new-badge,
#sidebar-wrapper[class*="sidebar-expanded-width"] .kc-sidebar-btn .kc-sidebar-ready-dot {
  margin-right: 16px;
}

.kc-sidebar-submenu {
  list-style: none;
  padding: 0; margin: 0;
  display: none;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 4px 8px;
  overflow: hidden;
}
/* Only show submenu when expanded AND the sidebar wrapper itself is in
   its expanded-width layout. Collapsed sidebar never shows sub-rows. */
#sidebar-wrapper[class*="sidebar-expanded-width"]
  .kc-sidebar-submenu[data-expanded="true"] {
  display: flex;
  animation: kc-sidebar-sub-open 180ms ease forwards;
}
@keyframes kc-sidebar-sub-open {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.kc-sidebar-subitem { list-style: none; }
.kc-sidebar-sublink {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 36px;
  padding: 0 12px 0 28px;
  border-left: 2px solid transparent;
  color: var(--kc-muted);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}
.kc-sidebar-sublink:hover {
  background: rgba(255,255,255,0.05);
  color: var(--kc-text);
}
.kc-sidebar-sublink[data-active="true"] {
  color: var(--kc-primary);
  border-left-color: var(--kc-primary);
  background: rgba(83,252,24,0.08);
  font-weight: 600;
}
.kc-sidebar-subicon {
  flex: 0 0 auto;
  width: 14px; height: 14px;
  display: inline-flex; align-items: center; justify-content: center;
}
.kc-sidebar-subicon svg { width: 100%; height: 100%; fill: currentColor; }
.kc-sidebar-sublabel { flex: 1 1 auto; min-width: 0; }

/* Mobile nav drawer button — matches the row styling Kick uses for
   Subscriptions / Drops / Settings so it looks native inside their menu. */
.kc-mobile-menu-btn {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-height: 48px;
  padding: 4px 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  transition: background 140ms ease;
}
.kc-mobile-menu-btn:hover { background: rgba(255,255,255,0.06); }
.kc-mobile-menu-btn:active { background: rgba(255,255,255,0.10); }
.kc-mobile-menu-btn__icon {
  flex: 0 0 auto;
  width: 16px; height: 16px;
  display: inline-flex; align-items: center; justify-content: center;
}
.kc-mobile-menu-btn__icon svg {
  width: 100%; height: 100%; fill: currentColor;
}
.kc-mobile-menu-btn__label { flex: 1 1 auto; text-align: left; }
.kc-mobile-menu-btn__level {
  flex: 0 0 auto;
  min-width: 22px; height: 16px;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--kc-primary);
  color: #06140a;
  font-size: 10px; font-weight: 800; letter-spacing: 0.02em;
  display: inline-flex; align-items: center; justify-content: center;
  line-height: 1;
}
.kc-mobile-menu-btn__ready {
  flex: 0 0 auto;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--kc-primary);
}
.kc-mobile-menu-btn__new {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: 4px;
  background: var(--kc-primary);
  color: #06140a;
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
}

/* ═════════════════════════════════════════════════════════════════════
   Dialog overlay + shell
   ═════════════════════════════════════════════════════════════════════ */
/* ═════════════════════════════════════════════════════════════════════
   ItemPreviewDialog — shared item detail modal used by Battle Pass tier
   clicks + Collection tile clicks. Renders the item art inside a rarity-
   glowing frame, hero description, stats list, and an optional action
   button (e.g. "Claim tier 5"). Shares the base .kc-overlay scrim.
   ═════════════════════════════════════════════════════════════════════ */
.kc-preview-overlay {
  z-index: 2147483645 !important;
}
.kc-preview {
  width: min(560px, 100%);
  max-height: calc(100vh - clamp(16px, 4vw, 48px));
  display: flex; flex-direction: column;
  background: #0f0f11;
  border: 1px solid var(--kc-border);
  border-radius: clamp(12px, 1.4vw, 16px);
  overflow: hidden;
  position: relative;
  box-shadow:
    0 40px 120px rgba(0,0,0,0.6),
    0 0 0 1px var(--kc-preview-color, transparent);
  animation: kc-preview-rise 280ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes kc-preview-rise {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.kc-preview__close {
  all: unset;
  position: absolute; top: 12px; right: 12px;
  width: 32px; height: 32px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--kc-muted);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
  z-index: 2;
}
.kc-preview__close:hover { background: var(--kc-surface-1); color: var(--kc-text); }
.kc-preview__close svg { width: 14px; height: 14px; }

.kc-preview__body {
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
  gap: clamp(16px, 2.4vw, 24px);
  padding: clamp(20px, 2.6vw, 28px);
  overflow-y: auto;
}
@container (max-width: 460px) {
  .kc-preview__body { grid-template-columns: 1fr; }
  .kc-preview__art-frame { justify-self: center; max-width: 220px; }
}

.kc-preview__art-frame {
  position: relative;
  aspect-ratio: 1;
  border-radius: clamp(12px, 1.6vw, 14px);
  padding: 2px;
  background: linear-gradient(135deg, var(--kc-preview-color, var(--kc-border)), transparent 60%);
}
.kc-preview__art {
  width: 100%; height: 100%;
  border-radius: inherit;
  overflow: hidden;
  background: #0a0a0b;
}
.kc-preview__art > svg {
  display: block; width: 100%; height: 100%; object-fit: contain;
}
.kc-preview--legendary .kc-preview__art-frame,
.kc-preview--epic .kc-preview__art-frame,
.kc-preview--rare .kc-preview__art-frame {
  background: linear-gradient(135deg, var(--kc-preview-color), transparent 75%);
}

.kc-preview__meta {
  display: flex; flex-direction: column; gap: 10px;
  min-width: 0;
}
.kc-preview__eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--kc-muted-dim);
  font-variant-numeric: tabular-nums;
}
.kc-preview__rarity {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase;
}
.kc-preview__rarity-dot {
  display: inline-block;
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
}
.kc-preview__name {
  margin: 0;
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--kc-text);
  line-height: 1.1;
}
.kc-preview__desc {
  margin: 0;
  font-size: clamp(12px, 1.4vw, 13px);
  color: var(--kc-muted);
  line-height: 1.55;
  max-width: 52ch;
}
.kc-preview__stats {
  margin: clamp(6px, 0.8vw, 10px) 0 0;
  padding: 0;
  display: grid;
  gap: 0;
  border-top: 1px solid var(--kc-surface-2);
}
.kc-preview__stat {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid var(--kc-surface-2);
  font-variant-numeric: tabular-nums;
}
.kc-preview__stat dt {
  margin: 0;
  font-size: 10px; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--kc-muted-dim);
}
.kc-preview__stat dd {
  margin: 0;
  font-size: 13px; font-weight: 700;
  color: var(--kc-text);
}
.kc-preview__stat--primary dd { color: var(--kc-primary); }
.kc-preview__stat--warn dd { color: var(--kc-warn); }
.kc-preview__stat--muted dd { color: var(--kc-muted); font-weight: 600; }

.kc-preview__actions {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-top: clamp(8px, 1.2vw, 14px);
}
.kc-preview__actions .kc-btn { flex: 1 1 auto; min-width: 120px; }

.kc-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(4,7,6,0.82) !important;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  z-index: 2147483647 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: clamp(0px, 2.5vw, 32px);
  opacity: 1;
  animation: kc-fade-in 200ms ease;
  pointer-events: auto !important;
  overflow: hidden;
}
@keyframes kc-fade-in { to { opacity: 1; } }
@keyframes kc-fade-out { to { opacity: 0; } }

.kc-dialog {
  width: min(1040px, 100%);
  height: min(88vh, 900px);
  max-height: 100%;
  background: #101012;
  border: 1px solid var(--kc-border);
  border-radius: clamp(0px, 2vw, 16px);
  box-shadow:
    0 40px 120px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.03);
  color: var(--kc-text-dim);
  font: clamp(12px, 1.1vw, 14px)/1.5 "Geist", "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "ss01", "cv11";
  display: flex; flex-direction: column;
  overflow: hidden;
  transform: translateY(12px);
  opacity: 0;
  animation: kc-rise 280ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  container-type: inline-size;
}
@keyframes kc-rise { to { transform: translateY(0); opacity: 1; } }

/* ── Header ─────────────────────────────────────────────────────────── */
.kc-head {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) minmax(0, auto);
  gap: clamp(8px, 1.5vw, 20px);
  align-items: center;
  padding: clamp(10px, 1.8vw, 16px) clamp(12px, 2.2vw, 20px);
  border-bottom: 1px solid var(--kc-surface-2);
  overflow-x: hidden;
}

/* Minimal header — signed-out state: just brand centered + close right */
.kc-head--minimal {
  grid-template-columns: 1fr auto 1fr;
}
.kc-head--minimal .kc-brand {
  grid-column: 2;
}
.kc-head--minimal > .kc-close {
  grid-column: 3;
  justify-self: end;
}
.kc-head__left, .kc-head__right {
  display: flex; align-items: center; gap: clamp(6px, 1vw, 12px);
  min-width: 0;
}
.kc-head__right { justify-content: flex-end; }
.kc-stat {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: clamp(42px, 5vw, 56px);
  height: clamp(42px, 5vw, 52px);
  padding: 0 clamp(6px, 1vw, 10px);
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-surface-2);
  border-radius: 10px;
  flex: 0 0 auto;
}
.kc-stat__value {
  font-size: clamp(12px, 1.4vw, 16px); font-weight: 800; color: var(--kc-text);
  font-variant-numeric: tabular-nums; line-height: 1;
}
.kc-stat__label {
  font-size: clamp(7px, 0.85vw, 8px); font-weight: 700; letter-spacing: 0.14em;
  color: var(--kc-muted-dim); text-transform: uppercase; margin-top: 4px;
  white-space: nowrap;
}
.kc-stat--bonus {
  border-color: rgba(255,176,32,0.3);
  background: linear-gradient(180deg, rgba(255,176,32,0.08), var(--kc-surface-1));
}
.kc-stat--bonus .kc-stat__value { color: var(--kc-warn); }
.kc-stat--bonus .kc-stat__label { color: rgba(255,176,32,0.65); }

.kc-brand {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  justify-self: center;
  min-width: 0; max-width: 100%;
}
.kc-brand__wordmark {
  display: inline-flex; align-items: center; gap: clamp(4px, 0.8vw, 8px);
  font-size: clamp(12px, 1.7vw, 18px); font-weight: 900; letter-spacing: 0.1em;
  color: var(--kc-text);
  white-space: nowrap;
}
.kc-brand__wordmark::before {
  content: ""; display: inline-block;
  width: clamp(16px, 2vw, 22px); height: clamp(16px, 2vw, 22px); border-radius: 4px;
  background: var(--kc-primary);
  flex: 0 0 auto;
}
.kc-brand__kick { color: var(--kc-highlight); }
.kc-brand__sub {
  font-size: clamp(8px, 0.9vw, 10px); font-weight: 700; letter-spacing: 0.16em;
  color: var(--kc-muted-dim); text-transform: uppercase;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}

.kc-xpbar {
  display: flex; align-items: center; gap: clamp(6px, 1vw, 10px);
  min-width: clamp(80px, 12vw, 140px);
}
.kc-xpbar__track {
  flex: 1 1 auto; height: 6px;
  background: var(--kc-surface-2); border-radius: 3px; overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
}
.kc-xpbar__fill {
  height: 100%;
  background: var(--kc-primary);
  transition: width 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.kc-xpbar__lbl {
  font-size: 10px; font-weight: 700; color: var(--kc-muted);
  letter-spacing: 0.08em; font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.kc-xpbar__lbl--accent { color: var(--kc-highlight); }

.kc-avatar-chip {
  display: flex; align-items: center; gap: clamp(6px, 1vw, 8px);
  padding: 4px 10px 4px 4px;
  background: var(--kc-surface-1); border: 1px solid var(--kc-surface-2);
  border-radius: 999px;
  min-width: 0;
}
.kc-avatar-chip--btn {
  all: unset;
  display: flex; align-items: center; gap: clamp(6px, 1vw, 8px);
  padding: 4px 12px 4px 4px;
  background: var(--kc-surface-1); border: 1px solid var(--kc-surface-2);
  border-radius: 999px;
  min-width: 0;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, transform 120ms ease;
}
.kc-avatar-chip--btn:hover {
  border-color: var(--kc-border-strong);
  background: var(--kc-surface-2);
}
.kc-avatar-chip--btn:active { background: var(--kc-surface-2); }
.kc-avatar {
  width: clamp(24px, 3vw, 30px); height: clamp(24px, 3vw, 30px); border-radius: 50%;
  background: var(--kc-surface-2); background-size: cover; background-position: center;
  flex: 0 0 auto;
}
.kc-avatar--sm { width: 20px; height: 20px; }
.kc-avatar--lg { width: clamp(40px, 5vw, 48px); height: clamp(40px, 5vw, 48px); border-radius: 10px; }
.kc-avatar-chip__name {
  font-size: clamp(11px, 1.1vw, 12px); font-weight: 700; color: var(--kc-text);
  max-width: clamp(60px, 12vw, 140px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kc-avatar-chip__sub {
  font-size: clamp(8px, 0.9vw, 9px); color: var(--kc-muted);
  letter-spacing: 0.08em; text-transform: uppercase;
}

.kc-close {
  all: unset;
  width: clamp(30px, 3.5vw, 34px); height: clamp(30px, 3.5vw, 34px); border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--kc-muted);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.kc-close:hover { background: var(--kc-surface-1); color: var(--kc-text); }
.kc-close svg { width: 14px; height: 14px; }

/* ── Tabs ───────────────────────────────────────────────────────────── */
/* Fixed-height horizontally-scrollable tab bar. justify-content: safe
   center keeps tabs centered when they fit, but falls back to start-
   aligned when they overflow so nothing ever gets cut off the leading
   edge. Scroll-snap keeps the active tab nicely framed after a swipe.
   Gradient fade masks on both edges hint at scrollable content without
   competing with a visible scrollbar. */
.kc-tabs {
  flex: 0 0 auto;
  height: 48px;
  display: flex;
  align-items: stretch;
  gap: clamp(2px, 0.6vw, 6px);
  justify-content: safe center;
  padding: 0 clamp(12px, 2vw, 20px);
  border-bottom: 1px solid var(--kc-surface-2);
  background: var(--kc-bg);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  scroll-padding-inline: clamp(12px, 2vw, 20px);
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0,
    #000 clamp(12px, 2vw, 20px),
    #000 calc(100% - clamp(12px, 2vw, 20px)),
    transparent 100%
  );
          mask-image: linear-gradient(
    90deg,
    transparent 0,
    #000 clamp(12px, 2vw, 20px),
    #000 calc(100% - clamp(12px, 2vw, 20px)),
    transparent 100%
  );
}
.kc-tabs::-webkit-scrollbar { display: none; }
.kc-tab {
  all: unset;
  flex: 0 0 auto;
  display: inline-flex; align-items: center; gap: clamp(6px, 0.8vw, 8px);
  padding: 0 clamp(12px, 1.8vw, 18px);
  height: 100%;
  font-size: clamp(11px, 1.1vw, 12px); font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--kc-muted-dim);
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: color 120ms ease;
  scroll-snap-align: center;
}
.kc-tab:hover { color: var(--kc-text-dim); }
.kc-tab[aria-selected="true"] {
  color: var(--kc-text);
}
.kc-tab[aria-selected="true"]::after {
  content: "";
  position: absolute; left: clamp(12px, 1.8vw, 18px); right: clamp(12px, 1.8vw, 18px); bottom: -1px;
  height: 2px;
  background: var(--kc-primary);
  border-radius: 2px 2px 0 0;
}
.kc-tab__icon {
  width: 14px; height: 14px; fill: currentColor;
  flex: 0 0 auto;
}

/* ── Panel scroll region ────────────────────────────────────────────── */
.kc-panel {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: clamp(14px, 2.5vw, 24px) clamp(14px, 2.8vw, 28px) clamp(18px, 2.8vw, 28px);
}
.kc-panel::-webkit-scrollbar { width: 10px; }
.kc-panel::-webkit-scrollbar-track { background: transparent; }
.kc-panel::-webkit-scrollbar-thumb {
  background: var(--kc-surface-2); border-radius: 5px; border: 2px solid var(--kc-bg);
}
.kc-section {
  margin-bottom: clamp(22px, 3vw, 32px);
  padding-top: clamp(18px, 2.4vw, 24px);
  border-top: 1px solid var(--kc-surface-2);
}
.kc-section:first-child,
.kc-section.kc-section--flush {
  padding-top: 0;
  border-top: 0;
}
.kc-section:last-child { margin-bottom: 0; }
.kc-section__head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 12px; margin-bottom: clamp(12px, 1.6vw, 16px);
  flex-wrap: wrap;
}
.kc-section__eyebrow {
  font-size: clamp(9px, 1vw, 10px); font-weight: 700; letter-spacing: 0.22em;
  color: var(--kc-muted-dim); text-transform: uppercase;
  margin: 0 0 6px;
  font-variant-numeric: tabular-nums;
}
.kc-section__title {
  font-size: clamp(16px, 2.4vw, 20px); font-weight: 800; letter-spacing: -0.02em;
  color: var(--kc-text); margin: 0 0 clamp(12px, 1.6vw, 16px);
  line-height: 1.15;
}
.kc-section__meta {
  font-size: clamp(10px, 1.1vw, 11px); font-weight: 600;
  color: var(--kc-muted); letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}

/* Flag / alert banner (fraud-flagged account, etc.) */
.kc-flag-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px clamp(16px, 2vw, 24px);
  background: rgba(255,176,32,0.06);
  border-bottom: 1px solid rgba(255,176,32,0.22);
  color: var(--kc-warn);
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
}
.kc-flag-banner__icon {
  width: 14px; height: 14px; flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
}
.kc-flag-banner__icon svg { width: 100%; height: 100%; color: var(--kc-warn); }

/* ── Buttons ────────────────────────────────────────────────────────── */
.kc-btn {
  all: unset;
  display: inline-flex; align-items: center; justify-content: center; gap: clamp(6px, 1vw, 8px);
  padding: clamp(9px, 1.3vw, 11px) clamp(14px, 2vw, 18px);
  border-radius: 8px;
  font-size: clamp(11px, 1.2vw, 12px); font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
  text-align: center;
  white-space: nowrap;
  border: 1px solid transparent;
}
.kc-btn:active:not(:disabled) { transform: translateY(1px); }
.kc-btn--primary {
  background: var(--kc-primary);
  color: #0a0a0b;
}
.kc-btn--primary:hover:not(:disabled) { background: var(--kc-primary-soft); }
.kc-btn--primary:disabled {
  background: var(--kc-surface-2); color: var(--kc-muted-dim);
  cursor: not-allowed;
}
.kc-btn--ghost {
  background: transparent; color: var(--kc-muted);
  border-color: var(--kc-border);
}
.kc-btn--ghost:hover:not(:disabled) { border-color: var(--kc-border-strong); color: var(--kc-text-dim); }
.kc-btn--secondary {
  background: transparent; color: var(--kc-text-dim);
  border-color: var(--kc-surface-2);
}
.kc-btn--secondary:hover:not(:disabled) { border-color: var(--kc-border-strong); }
.kc-btn--secondary:disabled { color: var(--kc-muted-dim); cursor: not-allowed; }
.kc-btn--xs { padding: 6px 10px; font-size: 10px; border-radius: 6px; }
.kc-btn--lg { padding: 13px 22px; font-size: 13px; }
.kc-btn--block { display: flex; width: 100%; }

/* ═════════════════════════════════════════════════════════════════════
   CRATES panel
   ═════════════════════════════════════════════════════════════════════ */
.kc-welcome {
  background: linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0));
  border: 1px solid var(--kc-border);
  border-radius: 12px;
  padding: clamp(12px, 1.8vw, 18px);
  display: flex; align-items: center; gap: clamp(12px, 1.8vw, 18px);
  margin-bottom: clamp(16px, 2.2vw, 24px);
  flex-wrap: wrap;
}
.kc-welcome__step {
  width: clamp(46px, 6vw, 56px); height: clamp(46px, 6vw, 56px); flex: 0 0 auto;
  border-radius: 10px;
  background: rgba(22,163,74,0.12);
  border: 1px solid var(--kc-primary);
  display: flex; align-items: center; justify-content: center;
  color: var(--kc-highlight);
  font-size: clamp(9px, 1vw, 10px); font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase;
  flex-direction: column; gap: 2px;
}
.kc-welcome__body { flex: 1 1 240px; min-width: 0; }
.kc-welcome__title {
  font-size: clamp(12px, 1.5vw, 14px); font-weight: 800; color: var(--kc-text);
}
.kc-welcome__desc {
  font-size: clamp(10px, 1.1vw, 11px); color: var(--kc-muted); margin-top: 2px;
}
.kc-welcome__progress {
  display: flex; align-items: center; gap: 10px; margin-top: 10px;
}
.kc-welcome__track {
  flex: 1 1 auto; height: 4px; background: var(--kc-surface-2);
  border-radius: 2px; overflow: hidden;
}
.kc-welcome__fill {
  height: 100%; background: var(--kc-highlight);
  transition: width 400ms ease;
}
.kc-welcome__label {
  font-size: 10px; color: var(--kc-muted); letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.kc-welcome__reward {
  font-size: clamp(12px, 1.4vw, 13px); font-weight: 800; color: var(--kc-highlight);
  white-space: nowrap;
}

.kc-crates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(160px, 22vw, 200px), 1fr));
  gap: clamp(10px, 1.6vw, 14px);
}
.kc-crate {
  position: relative;
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--kc-surface-1), var(--kc-surface));
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: border-color 160ms ease, background 160ms ease;
}
.kc-crate:hover { border-color: var(--kc-border-strong); }
.kc-crate[data-ready="true"] {
  border-color: var(--kc-primary);
}
.kc-crate__art {
  position: relative;
  aspect-ratio: 1.2 / 1;
  background:
    radial-gradient(ellipse at center bottom, rgba(22,163,74,0.15), transparent 70%),
    linear-gradient(180deg, rgba(22,163,74,0.06), transparent);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.kc-crate[data-ready="true"] .kc-crate__art {
  background:
    radial-gradient(ellipse at center, rgba(22,163,74,0.28), transparent 65%),
    linear-gradient(180deg, rgba(22,163,74,0.12), transparent);
}
.kc-crate[data-ready="false"] .kc-crate__art { filter: grayscale(0.55) brightness(0.6); }
.kc-crate__art::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.4), transparent 40%);
  pointer-events: none;
}
.kc-crate-tag {
  position: absolute; top: 12px; left: 12px;
  padding: 4px 9px; border-radius: 5px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  background: rgba(4,7,6,0.8); border: 1px solid var(--kc-surface-2);
  color: var(--kc-muted-dim);
  z-index: 2;
}
.kc-crate-tag--ready {
  background: var(--kc-primary);
  color: #06140a;
  border-color: transparent;
}
.kc-crate-cards-badge {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(4,7,6,0.7);
  border: 1px solid var(--kc-surface-2);
  color: var(--kc-muted);
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase;
  backdrop-filter: blur(4px);
}
.kc-crate[data-ready="true"] .kc-crate-cards-badge { color: var(--kc-highlight); border-color: rgba(120,228,140,0.35); }
.kc-crate__body { padding: clamp(12px, 1.8vw, 16px); display: flex; flex-direction: column; gap: clamp(8px, 1.2vw, 10px); flex: 1 1 auto; }
.kc-crate__name { font-size: clamp(13px, 1.6vw, 15px); font-weight: 800; color: var(--kc-text); letter-spacing: -0.01em; }
.kc-crate__desc {
  font-size: clamp(10px, 1.1vw, 11px); color: var(--kc-muted); line-height: 1.5;
  flex: 1 1 auto;
}
.kc-crate__progress {
  height: 4px; background: var(--kc-surface-2); border-radius: 2px; overflow: hidden;
  position: relative;
}
.kc-crate__progress-fill {
  height: 100%;
  background: var(--kc-primary);
  transition: width 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.kc-crate__progress--ready .kc-crate__progress-fill { background: var(--kc-primary); }
.kc-crate__progress-label {
  display: flex; justify-content: space-between;
  font-size: 10px; color: var(--kc-muted);
  font-variant-numeric: tabular-nums;
}
.kc-crate__progress-label .kc-ready-text { color: var(--kc-highlight); font-weight: 700; letter-spacing: 0.08em; }

/* ── Crate artwork (CSS-only glyphs tinted by crate type) ───────────── */
.kc-crate-glyph {
  position: relative;
  width: clamp(64px, 10vw, 88px); height: clamp(64px, 10vw, 88px);
  display: flex; align-items: center; justify-content: center;
}
.kc-crate-glyph svg { width: 100%; height: 100%; }
.kc-crate[data-ready="true"] .kc-crate-glyph { animation: kc-float 3.2s ease-in-out infinite; }
@keyframes kc-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

/* ═════════════════════════════════════════════════════════════════════
   BATTLE PASS panel
   ═════════════════════════════════════════════════════════════════════ */
.kc-bp {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: clamp(14px, 1.8vw, 20px);
  align-items: start;
}
@container (min-width: 860px) {
  .kc-bp { grid-template-columns: minmax(0, 1fr) clamp(280px, 30%, 340px); }
}
.kc-bp__main {
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-surface-2);
  border-radius: 14px;
  padding: clamp(14px, 2vw, 20px);
  min-width: 0;
}
.kc-bp__chips { display: flex; gap: clamp(6px, 1vw, 10px); margin-bottom: clamp(12px, 1.8vw, 16px); align-items: center; flex-wrap: wrap; }
.kc-bp-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px clamp(8px, 1.2vw, 10px); border-radius: 999px;
  background: var(--kc-surface-2);
  font-size: clamp(9px, 1.1vw, 10px); font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--kc-muted);
  white-space: nowrap;
}
.kc-bp-chip--accent { background: rgba(22,163,74,0.15); color: var(--kc-highlight); }
.kc-bp-chip--live { background: rgba(255,118,118,0.12); color: var(--kc-danger); }
.kc-bp-chip__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.kc-bp__season {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 20px;
}
.kc-bp__season-num {
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--kc-muted-dim); font-weight: 700;
}
.kc-bp__season-name {
  font-size: 14px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--kc-highlight); text-transform: uppercase;
}
.kc-bp__claim-all {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  animation: kc-bp-claim-pulse 2.4s ease-in-out infinite;
}
.kc-bp__claim-all-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0,0,0,0.35);
  color: var(--kc-text);
  font-size: 10px; font-weight: 900; letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}
@keyframes kc-bp-claim-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(83,252,24,0); }
  50%      { box-shadow: 0 0 0 6px rgba(83,252,24,0.18); }
}

.kc-bp__hero {
  display: grid;
  grid-template-columns: clamp(140px, 28%, 260px) minmax(0, 1fr);
  gap: clamp(14px, 2.6vw, 28px);
  align-items: center;
  margin-bottom: clamp(16px, 2.4vw, 24px);
  padding: clamp(12px, 1.8vw, 16px);
  background: linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.02));
  border-radius: 12px;
  position: relative; overflow: hidden;
}
@container (max-width: 600px) {
  .kc-bp__hero { grid-template-columns: 1fr; text-align: center; }
  .kc-bp__hero-art { max-width: 180px; justify-self: center; }
  .kc-bp__hero-meta { align-items: center; }
}
.kc-bp__hero::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse at 20% 50%, rgba(120,228,140,0.25), transparent 70%);
  pointer-events: none;
}
.kc-bp__hero-art {
  position: relative;
  aspect-ratio: 1;
  border-radius: 14px;
  background: var(--kc-surface-1);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border: 2px solid var(--kc-border);
}
.kc-bp__hero-art--common { border-color: var(--kc-rarity-common); }
.kc-bp__hero-art--uncommon { border-color: var(--kc-rarity-uncommon); }
.kc-bp__hero-art--rare { border-color: var(--kc-rarity-rare); }
.kc-bp__hero-art--epic { border-color: var(--kc-rarity-epic); }
.kc-bp__hero-art--legendary { border-color: var(--kc-rarity-legendary); }
.kc-bp__hero-meta { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.kc-bp__hero-tierline {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 2px;
}
.kc-bp__hero-tier-chip {
  padding: 4px 10px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--kc-border);
  border-radius: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--kc-text);
  font-variant-numeric: tabular-nums;
}
.kc-bp__hero-status {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--kc-muted-dim);
  border: 1px solid var(--kc-border);
}
.kc-bp__hero-status--ready {
  color: var(--kc-primary);
  border-color: rgba(83,252,24,0.35);
  background: rgba(83,252,24,0.06);
}
.kc-bp__hero-status--claimed {
  color: var(--kc-muted);
  background: rgba(255,255,255,0.03);
}
.kc-bp__hero-rarity {
  font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 6px;
}
.kc-bp__hero-rarity::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor;
}
.kc-bp__hero-name {
  font-size: clamp(20px, 3.4vw, 34px); font-weight: 800; letter-spacing: -0.025em;
  color: var(--kc-text);
  line-height: 1.05; margin: 0;
  text-wrap: balance;
}
.kc-bp__hero-desc {
  font-size: clamp(12px, 1.4vw, 13px); color: var(--kc-muted);
  line-height: 1.55; margin: 4px 0 0; max-width: 52ch;
}
.kc-bp__hero-stats {
  display: flex; flex-wrap: wrap; gap: clamp(10px, 1.4vw, 16px);
  margin: 10px 0 4px;
  padding-top: 10px;
  border-top: 1px solid var(--kc-surface-2);
}
.kc-bp__hero-stat {
  display: flex; flex-direction: column; gap: 3px;
  min-width: 0;
}
.kc-bp__hero-stat-l {
  font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--kc-muted-dim);
}
.kc-bp__hero-stat-v {
  font-size: clamp(13px, 1.6vw, 15px); font-weight: 800; color: var(--kc-text);
  font-variant-numeric: tabular-nums;
}
.kc-bp__hero-actions {
  display: flex; gap: 8px; align-items: center; margin-top: 6px; flex-wrap: wrap;
}

.kc-bp__tier-progress {
  display: flex; align-items: center; gap: 16px; margin-bottom: 14px;
}
.kc-bp__tier-badge {
  width: clamp(38px, 5vw, 46px); height: clamp(38px, 5vw, 46px); flex: 0 0 auto;
  border-radius: 50%;
  border: 2px solid var(--kc-primary);
  display: flex; align-items: center; justify-content: center;
  font-size: clamp(14px, 1.8vw, 18px); font-weight: 900; color: var(--kc-primary);
  background: rgba(83,252,24,0.08);
}
.kc-bp__tier-track {
  flex: 1 1 auto; height: 6px;
  background: var(--kc-surface-2); border-radius: 3px; overflow: hidden;
}
.kc-bp__tier-fill {
  height: 100%;
  background: var(--kc-primary);
  transition: width 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.kc-bp__tier-label {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  font-size: 11px; font-weight: 700; color: var(--kc-muted);
  font-variant-numeric: tabular-nums;
}
.kc-bp__tier-label strong { color: var(--kc-text); font-weight: 800; }
.kc-bp__tier-sub {
  font-size: 10px; font-weight: 600; color: var(--kc-muted-dim);
  letter-spacing: 0.04em;
}

.kc-tier-strip {
  display: flex; gap: 8px; overflow-x: auto;
  padding: 8px 4px;
  scrollbar-width: thin;
}
.kc-tier-strip::-webkit-scrollbar { height: 8px; }
.kc-tier-strip::-webkit-scrollbar-track { background: transparent; }
.kc-tier-strip::-webkit-scrollbar-thumb { background: var(--kc-surface-2); border-radius: 4px; }
.kc-tier {
  position: relative;
  flex: 0 0 auto;
  width: clamp(58px, 7vw, 74px);
  border: 1px solid var(--kc-surface-2);
  background: var(--kc-surface-1);
  border-radius: 10px;
  padding: clamp(8px, 1.2vw, 12px) 8px 8px;
  display: flex; flex-direction: column; align-items: center; gap: clamp(4px, 0.8vw, 8px);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
  font: inherit;
  color: inherit;
}
.kc-tier:hover { border-color: var(--kc-border-strong); }
.kc-tier[data-unlocked="true"] { border-color: var(--kc-primary); }
.kc-tier[data-current="true"] {
  border-color: var(--kc-primary);
}
.kc-tier[data-selected="true"] {
  border-color: var(--kc-primary);
  background: rgba(83,252,24,0.06);
  box-shadow: 0 0 0 2px rgba(83,252,24,0.25);
}
.kc-tier__num {
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em;
  color: var(--kc-muted);
}
.kc-tier[data-unlocked="true"] .kc-tier__num { color: var(--kc-highlight); }
.kc-tier__art {
  width: clamp(38px, 5vw, 52px); height: clamp(38px, 5vw, 52px); border-radius: 8px;
  background-color: var(--kc-surface-2);
  background-size: contain; background-position: center; background-repeat: no-repeat;
  border: 1px solid var(--kc-border);
  position: relative;
}
.kc-tier__art--common { border-color: var(--kc-rarity-common); }
.kc-tier__art--uncommon { border-color: var(--kc-rarity-uncommon); }
.kc-tier__art--rare { border-color: var(--kc-rarity-rare); }
.kc-tier__art--epic { border-color: var(--kc-rarity-epic); }
.kc-tier__art--legendary { border-color: var(--kc-rarity-legendary); }
.kc-tier[data-unlocked="true"] .kc-tier__art {
  box-shadow: 0 0 0 1px rgba(83,252,24,0.35);
}
.kc-tier__check {
  position: absolute; top: -4px; right: -4px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--kc-primary); color: #06140a;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
}
.kc-tier__check svg { width: 10px; height: 10px; fill: currentColor; }
.kc-tier[data-claimed="true"] {
  background: linear-gradient(180deg, rgba(22,163,74,0.12), var(--kc-surface-1));
  border-color: var(--kc-primary);
}
.kc-tier[data-claimed="true"] .kc-tier__art {
  filter: saturate(1.1);
}

/* ── Challenges sidebar ─────────────────────────────────────────────── */
.kc-bp__side {
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-surface-2);
  border-radius: 14px;
  padding: 0;
  min-width: 0;
  display: flex; flex-direction: column;
  max-height: min(700px, calc(100vh - 300px));
  overflow: hidden;
}
.kc-bp__side-head {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: clamp(14px, 1.8vw, 18px) clamp(14px, 1.8vw, 18px) 12px;
  border-bottom: 1px solid var(--kc-surface-2);
  flex: 0 0 auto;
}
.kc-bp__side-title {
  font-size: clamp(14px, 1.8vw, 16px); font-weight: 800; color: var(--kc-text); letter-spacing: -0.015em;
}
.kc-bp__side-sub {
  font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--kc-muted-dim);
}
.kc-bp__side-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 14px clamp(14px, 1.8vw, 18px);
  scrollbar-width: thin;
  scrollbar-color: var(--kc-surface-2) transparent;
}
.kc-bp__side-scroll::-webkit-scrollbar { width: 8px; }
.kc-bp__side-scroll::-webkit-scrollbar-track { background: transparent; }
.kc-bp__side-scroll::-webkit-scrollbar-thumb { background: var(--kc-surface-2); border-radius: 4px; }
.kc-bp__side-scroll::-webkit-scrollbar-thumb:hover { background: var(--kc-border); }
.kc-bp__side-group { margin-bottom: 14px; }
.kc-bp__side-group:last-child { margin-bottom: 0; }
.kc-bp__side-group-head {
  display: flex; justify-content: space-between;
  font-size: 10px; font-weight: 800; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--kc-muted);
  margin-bottom: 8px;
}

.kc-quest {
  background: var(--kc-surface);
  border: 1px solid var(--kc-surface-2);
  border-radius: 10px;
  padding: clamp(10px, 1.4vw, 12px);
  margin-bottom: 8px;
  transition: border-color 160ms ease;
}
.kc-quest:last-child { margin-bottom: 0; }
.kc-quest[data-claimable="true"] {
  border-color: var(--kc-primary);
}
.kc-quest__top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.kc-quest__name { font-size: clamp(12px, 1.4vw, 13px); font-weight: 800; color: var(--kc-text); }
.kc-quest__xp { font-size: clamp(10px, 1.2vw, 11px); font-weight: 800; color: var(--kc-highlight); }
.kc-quest__xp--scrap { color: var(--kc-warn); }
.kc-quest__desc { font-size: 11px; color: var(--kc-muted); margin-top: 4px; line-height: 1.5; }
.kc-quest__progress { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.kc-quest__track { flex: 1 1 auto; height: 4px; background: var(--kc-surface-2); border-radius: 2px; overflow: hidden; }
.kc-quest__fill {
  height: 100%;
  background: var(--kc-warn);
  transition: width 400ms ease;
}
.kc-quest__fill--done { background: var(--kc-primary); }
.kc-quest__pct {
  font-size: 10px; color: var(--kc-muted);
  font-variant-numeric: tabular-nums; min-width: 52px; text-align: right;
}
.kc-quest__claim {
  margin-top: 10px; display: flex; gap: 8px;
}
.kc-quest__claimed {
  margin-top: 10px; font-size: 10px; color: var(--kc-muted-dim);
  letter-spacing: 0.1em; text-transform: uppercase;
}

.kc-meta-progress {
  margin-top: 14px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255,176,32,0.12), rgba(255,176,32,0.02));
  border: 1px solid rgba(255,176,32,0.3);
  border-radius: 10px;
}
.kc-meta-progress__title {
  font-size: 11px; font-weight: 800; color: var(--kc-warn);
  letter-spacing: 0.08em; text-transform: uppercase;
  display: flex; align-items: center; gap: 6px;
}
.kc-meta-progress__desc { font-size: 11px; color: var(--kc-muted); margin-top: 4px; }

/* ═════════════════════════════════════════════════════════════════════
   COLLECTION panel
   ═════════════════════════════════════════════════════════════════════ */
.kc-coll__cats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(120px, 18vw, 160px), 1fr));
  gap: clamp(8px, 1.2vw, 10px);
  padding: clamp(8px, 1vw, 10px) 0 clamp(18px, 2.4vw, 24px);
}
.kc-cat {
  padding: clamp(12px, 1.6vw, 16px) clamp(10px, 1.4vw, 14px);
  border-radius: 10px;
  border: 1px solid var(--kc-surface-2);
  background: var(--kc-surface-1);
  display: flex; flex-direction: column; align-items: flex-start;
  gap: clamp(8px, 1vw, 10px);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
  min-width: 0;
  color: var(--kc-muted);
}
.kc-cat:hover { border-color: var(--kc-border-strong); color: var(--kc-text); }
.kc-cat[data-selected="true"] {
  border-color: var(--kc-primary);
  background: var(--kc-surface-1);
  color: var(--kc-text);
}
.kc-cat[data-selected="true"] .kc-cat__icon svg { color: var(--kc-primary); }
.kc-cat__icon {
  width: clamp(20px, 2.4vw, 24px);
  height: clamp(20px, 2.4vw, 24px);
  color: currentColor;
  display: flex; align-items: center; justify-content: center;
}
.kc-cat__icon svg { width: 100%; height: 100%; display: block; color: inherit; }
.kc-cat__label {
  font-size: clamp(11px, 1.2vw, 12px);
  font-weight: 700;
  color: var(--kc-text);
  letter-spacing: -0.005em;
  line-height: 1.2;
}
.kc-cat__count {
  font-size: clamp(10px, 1vw, 11px);
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--kc-muted-dim);
  line-height: 1;
}
.kc-cat__count-num { color: var(--kc-muted); }
.kc-cat[data-selected="true"] .kc-cat__count-num { color: var(--kc-primary); }
.kc-cat__count-total { color: var(--kc-muted-dim); }

.kc-rarity-block {
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-surface-2);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
}
.kc-rarity-row {
  display: grid;
  grid-template-columns: 100px 40px 1fr;
  gap: 12px; align-items: center;
  padding: 6px 0;
}
.kc-rarity-row__name {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
}
.kc-rarity-row__name::before { content:""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.kc-rarity-row--common .kc-rarity-row__name { color: var(--kc-rarity-common); }
.kc-rarity-row--uncommon .kc-rarity-row__name { color: var(--kc-rarity-uncommon); }
.kc-rarity-row--rare .kc-rarity-row__name { color: var(--kc-rarity-rare); }
.kc-rarity-row--epic .kc-rarity-row__name { color: var(--kc-rarity-epic); }
.kc-rarity-row--legendary .kc-rarity-row__name { color: var(--kc-rarity-legendary); }
.kc-rarity-row__count {
  font-size: 11px; color: var(--kc-muted);
  font-variant-numeric: tabular-nums;
}
.kc-rarity-row__track {
  height: 4px; background: var(--kc-surface-2); border-radius: 2px; overflow: hidden;
}
.kc-rarity-row__fill { height: 100%; background: currentColor; transition: width 400ms ease; }

.kc-coll__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(56px, 9vw, 76px), 1fr));
  gap: clamp(6px, 1vw, 8px);
}
.kc-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px solid var(--kc-surface-2);
  background: var(--kc-surface-1);
  overflow: hidden;
  transition: transform 160ms ease, border-color 160ms ease;
  cursor: pointer;
}
.kc-item:hover { border-color: var(--kc-border-strong); z-index: 2; }
.kc-item[data-owned="false"] { filter: grayscale(1) brightness(0.35); border-color: var(--kc-surface-2); }
.kc-item--common { border-color: var(--kc-rarity-common); }
.kc-item--uncommon { border-color: var(--kc-rarity-uncommon); }
.kc-item--rare { border-color: var(--kc-rarity-rare); }
.kc-item--epic { border-color: var(--kc-rarity-epic); }
.kc-item--legendary { border-color: var(--kc-rarity-legendary); }
.kc-item__art {
  position: absolute; inset: 8px; border-radius: 6px;
  background-size: contain; background-position: center; background-repeat: no-repeat;
  background-color: var(--kc-surface-2);
}
.kc-item__rarity-dot {
  position: absolute; bottom: 5px; right: 5px;
  width: 6px; height: 6px; border-radius: 50%;
}
.kc-item--common .kc-item__rarity-dot { background: var(--kc-rarity-common); }
.kc-item--uncommon .kc-item__rarity-dot { background: var(--kc-rarity-uncommon); }
.kc-item--rare .kc-item__rarity-dot { background: var(--kc-rarity-rare); }
.kc-item--epic .kc-item__rarity-dot { background: var(--kc-rarity-epic); }
.kc-item--legendary .kc-item__rarity-dot { background: var(--kc-rarity-legendary); }
.kc-item__dup {
  position: absolute; top: 4px; left: 4px;
  font-size: 9px; font-weight: 800;
  background: rgba(0,0,0,0.65); color: var(--kc-muted);
  padding: 1px 5px; border-radius: 8px;
}

/* ═════════════════════════════════════════════════════════════════════
   PROFILE panel
   ═════════════════════════════════════════════════════════════════════ */
.kc-avatar--xl {
  width: clamp(64px, 9vw, 88px); height: clamp(64px, 9vw, 88px);
  border-radius: 14px;
  background-size: cover; background-position: center;
  background-color: var(--kc-surface-2);
  border: 1px solid var(--kc-border);
  flex: 0 0 auto;
}
.kc-profile-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: clamp(14px, 2vw, 20px);
  align-items: center;
  padding: clamp(8px, 1.2vw, 12px) 0 clamp(20px, 2.6vw, 28px);
}
.kc-profile-head__meta {
  min-width: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.kc-profile-head__handle {
  font-size: clamp(20px, 2.6vw, 26px); font-weight: 800; color: var(--kc-text);
  letter-spacing: -0.02em;
  line-height: 1.1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kc-profile-head__level-row {
  display: flex; align-items: baseline; gap: clamp(10px, 1.4vw, 14px);
  flex-wrap: wrap;
}
.kc-profile-head__level-num {
  font-size: clamp(11px, 1.2vw, 12px); font-weight: 700;
  color: var(--kc-primary); letter-spacing: 0.14em; text-transform: uppercase;
}
.kc-profile-head__xp {
  font-size: clamp(11px, 1.2vw, 12px);
  color: var(--kc-muted); font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.kc-profile-head__track {
  height: 4px; background: var(--kc-surface-2); border-radius: 2px; overflow: hidden;
  max-width: 420px;
}
.kc-profile-head__fill {
  height: 100%;
  background: var(--kc-primary);
  transition: width 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.kc-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(140px, 20vw, 180px), 1fr));
  gap: clamp(10px, 1.4vw, 14px);
}
.kc-stat-tile {
  background: transparent;
  border: 1px solid var(--kc-surface-2);
  border-radius: 10px;
  padding: clamp(14px, 1.8vw, 18px);
  display: flex; flex-direction: column;
  gap: 6px;
  min-height: clamp(82px, 10vw, 98px);
  transition: border-color 160ms ease;
}
.kc-stat-tile:hover { border-color: var(--kc-border-strong); }
.kc-stat-tile__label {
  font-size: clamp(9px, 1vw, 10px); font-weight: 700; letter-spacing: 0.18em;
  color: var(--kc-muted-dim); text-transform: uppercase;
  order: 1;
}
.kc-stat-tile__value {
  font-size: clamp(20px, 2.6vw, 26px); font-weight: 800; color: var(--kc-text);
  font-variant-numeric: tabular-nums; line-height: 1;
  letter-spacing: -0.02em;
  order: 2;
}
.kc-stat-tile--xp .kc-stat-tile__value { color: var(--kc-primary); }
.kc-stat-tile--scrap .kc-stat-tile__value { color: var(--kc-warn); }
.kc-stat-tile--common .kc-stat-tile__value { color: var(--kc-rarity-common); }
.kc-stat-tile--uncommon .kc-stat-tile__value { color: var(--kc-rarity-uncommon); }
.kc-stat-tile--rare .kc-stat-tile__value { color: var(--kc-rarity-rare); }
.kc-stat-tile--epic .kc-stat-tile__value { color: var(--kc-rarity-epic); }
.kc-stat-tile--legendary .kc-stat-tile__value { color: var(--kc-rarity-legendary); }
.kc-stat-tile__hint {
  font-size: clamp(10px, 1.1vw, 11px); color: var(--kc-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  order: 3;
}

.kc-recent-list {
  list-style: none;
  margin: 0; padding: 0;
  border-top: 1px solid var(--kc-surface-2);
}
.kc-recent-row {
  border-bottom: 1px solid var(--kc-surface-2);
}
.kc-recent-row__btn {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(10px, 1.4vw, 14px);
  padding: clamp(10px, 1.4vw, 14px);
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 160ms ease;
}
.kc-recent-row__btn:hover { background: rgba(255,255,255,0.025); }
.kc-recent-row__btn:focus-visible {
  outline: 2px solid var(--kc-rarity-uncommon);
  outline-offset: -2px;
}
.kc-recent-row__art {
  width: clamp(38px, 4.6vw, 44px); height: clamp(38px, 4.6vw, 44px);
  border-radius: 8px;
  background-color: var(--kc-surface-2);
  background-size: contain; background-position: center; background-repeat: no-repeat;
  border: 1px solid var(--kc-surface-2);
  flex: 0 0 auto;
}
.kc-recent-row__art--common { border-color: var(--kc-rarity-common); }
.kc-recent-row__art--uncommon { border-color: var(--kc-rarity-uncommon); }
.kc-recent-row__art--rare { border-color: var(--kc-rarity-rare); }
.kc-recent-row__art--epic { border-color: var(--kc-rarity-epic); }
.kc-recent-row__art--legendary { border-color: var(--kc-rarity-legendary); }
.kc-recent-row__main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.kc-recent-row__name {
  font-size: clamp(13px, 1.4vw, 14px); font-weight: 700; color: var(--kc-text);
  letter-spacing: -0.005em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kc-recent-row__sub {
  display: flex; align-items: center; gap: 8px;
}
.kc-recent-row__source {
  font-size: 10px; font-weight: 600; color: var(--kc-muted-dim);
  letter-spacing: 0.08em; text-transform: uppercase;
}
.kc-recent-row__when {
  font-size: 11px; font-weight: 600; color: var(--kc-muted-dim);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Shared rarity pill — used across panels */
.kc-rarity-pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 3px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1.4;
  background: transparent;
}
.kc-rarity-pill--common { color: var(--kc-rarity-common); }
.kc-rarity-pill--uncommon { color: var(--kc-rarity-uncommon); }
.kc-rarity-pill--rare { color: var(--kc-rarity-rare); }
.kc-rarity-pill--epic { color: var(--kc-rarity-epic); }
.kc-rarity-pill--legendary { color: var(--kc-rarity-legendary); }

/* Shared empty state — used across panels */
.kc-empty-state {
  padding: clamp(22px, 3.4vw, 36px) clamp(16px, 2vw, 20px);
  border: 1px dashed var(--kc-surface-2);
  border-radius: 10px;
  text-align: center;
}
.kc-empty-state__text {
  margin: 0;
  font-size: clamp(12px, 1.4vw, 13px);
  color: var(--kc-muted);
  line-height: 1.55;
}

.kc-about-text {
  max-width: 65ch;
  line-height: 1.7;
  font-size: clamp(12px, 1.4vw, 13px);
  margin: 0;
}

/* ═════════════════════════════════════════════════════════════════════
   LOADOUT panel
   ═════════════════════════════════════════════════════════════════════ */
.kc-loadout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(220px, 30vw, 300px), 1fr));
  gap: clamp(10px, 1.6vw, 14px);
}
.kc-slot {
  padding: clamp(12px, 1.8vw, 16px);
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-surface-2);
  border-radius: 12px;
  display: flex; gap: clamp(10px, 1.6vw, 14px); align-items: center;
  min-width: 0;
}
.kc-slot__preview {
  width: clamp(52px, 7vw, 72px); height: clamp(52px, 7vw, 72px); border-radius: 10px;
  background-color: var(--kc-surface-2);
  background-size: contain; background-position: center; background-repeat: no-repeat;
  flex: 0 0 auto;
  border: 1px solid var(--kc-border);
}
.kc-slot__meta { flex: 1 1 auto; min-width: 0; }
.kc-slot__label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--kc-muted-dim);
}
.kc-slot__name {
  font-size: 14px; font-weight: 800; color: var(--kc-text);
  margin: 4px 0 8px;
}
.kc-slot__name--empty { color: var(--kc-muted-dim); font-weight: 600; }

/* ═════════════════════════════════════════════════════════════════════
   SIGN-IN hero
   ═════════════════════════════════════════════════════════════════════ */
.kc-hero {
  flex: 1 1 auto;
  min-height: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: clamp(20px, 4vw, 48px) clamp(16px, 3vw, 24px);
  overflow-y: auto;
}
.kc-hero__logo {
  width: clamp(60px, 8vw, 80px); height: clamp(60px, 8vw, 80px);
  border-radius: clamp(14px, 2vw, 20px);
  background: var(--kc-primary);
  display: inline-flex; align-items: center; justify-content: center;
  color: #06140a; font-weight: 900; font-size: clamp(28px, 4vw, 38px);
  margin-bottom: clamp(16px, 2.5vw, 24px);
}
.kc-hero__title {
  font-size: clamp(22px, 3.2vw, 28px); font-weight: 900; letter-spacing: -0.01em;
  color: var(--kc-text); margin: 0 0 10px;
}
.kc-hero__subtitle {
  color: var(--kc-muted); font-size: clamp(12px, 1.3vw, 13px);
  max-width: min(440px, 100%); margin: 0 0 clamp(20px, 3vw, 28px);
  line-height: 1.6;
}

/* ═════════════════════════════════════════════════════════════════════
   Misc
   ═════════════════════════════════════════════════════════════════════ */
.kc-muted { color: var(--kc-muted-dim); font-size: 11px; }
.kc-empty {
  text-align: center; padding: 80px 24px;
  color: var(--kc-muted-dim); font-size: 12px;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.kc-error {
  background: rgba(255,118,118,0.08);
  border: 1px solid rgba(255,118,118,0.3);
  color: #ff9b9b;
  font-size: 11px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-top: 8px;
}

/* ═════════════════════════════════════════════════════════════════════
   CRATE OPENING — buildup → opening → spinning → flashing → docking → finale → closing
   All animations are transform/opacity only for 60fps on mid-tier devices.
   ═════════════════════════════════════════════════════════════════════ */
.kc-co {
  position: fixed; inset: 0;
  z-index: 2147483600;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(83,252,24,0.05), transparent 60%),
    radial-gradient(ellipse at center, #050505 0%, #000 80%);
  color: var(--kc-text-dim);
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  opacity: 0;
  animation: kc-fade-in 300ms ease forwards;
}
.kc-co[data-phase="closing"] { animation: kc-fade-out 220ms ease forwards; }

/* Ambient halo behind the crate — peak rarity color */
.kc-co__bg {
  position: absolute; inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.kc-co__halo {
  position: absolute; left: 50%; top: 50%;
  width: 80vmin; height: 80vmin;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, currentColor 0%, transparent 60%);
  opacity: 0;
  transition: opacity 600ms ease, transform 600ms ease;
}
.kc-co[data-peak="common"]    .kc-co__halo { color: var(--kc-rarity-common); }
.kc-co[data-peak="uncommon"]  .kc-co__halo { color: var(--kc-rarity-uncommon); }
.kc-co[data-peak="rare"]      .kc-co__halo { color: var(--kc-rarity-rare); }
.kc-co[data-peak="epic"]      .kc-co__halo { color: var(--kc-rarity-epic); }
.kc-co[data-peak="legendary"] .kc-co__halo { color: var(--kc-rarity-legendary); }
.kc-co[data-phase="buildup"] .kc-co__halo { opacity: 0.18; transform: translate(-50%, -50%) scale(0.92); }
.kc-co[data-phase="opening"] .kc-co__halo { opacity: 0.45; transform: translate(-50%, -50%) scale(1.15); }
.kc-co[data-phase="spinning"] .kc-co__halo,
.kc-co[data-phase="flashing"] .kc-co__halo { opacity: 0.10; transform: translate(-50%, -50%) scale(1.4); }
.kc-co[data-phase="docking"] .kc-co__halo,
.kc-co[data-phase="finale"] .kc-co__halo { opacity: 0.14; transform: translate(-50%, -50%) scale(1.5); }

/* Stage 1+2 — the crate itself, occupies the main grid cell */
.kc-co__stage {
  grid-column: 1; grid-row: 1;
  width: clamp(220px, 38vmin, 380px);
  aspect-ratio: 1;
  display: grid; place-items: center;
  position: relative;
  pointer-events: none;
  transition: opacity 320ms ease, transform 320ms cubic-bezier(0.32, 0, 0.5, 1);
}
.kc-co[data-phase="spinning"] .kc-co__stage,
.kc-co[data-phase="flashing"] .kc-co__stage,
.kc-co[data-phase="docking"] .kc-co__stage,
.kc-co[data-phase="finale"] .kc-co__stage,
.kc-co[data-phase="closing"] .kc-co__stage {
  opacity: 0;
  transform: scale(1.4);
}

.kc-co__crate {
  position: relative;
  width: 100%; height: 100%;
}
.kc-co__crate-svg {
  width: 100%; height: 100%;
  display: block;
  transform-origin: 50% 60%;
  animation: kc-co-crate-float 3.6s ease-in-out infinite;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6));
}
@keyframes kc-co-crate-float {
  0%, 100% { transform: translateY(-4px); }
  50%      { transform: translateY(4px); }
}

.kc-co__crate-halo {
  transform-origin: center;
  animation: kc-co-pulse 2.4s ease-in-out infinite;
}
@keyframes kc-co-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.92); }
  50%      { opacity: 1; transform: scale(1.05); }
}

/* Lid — lifts and rotates away during opening */
.kc-co__crate-lid {
  transform-origin: 120px 90px;
  transition:
    transform 750ms cubic-bezier(0.5, 0, 0.4, 1),
    opacity 700ms ease 100ms;
}
.kc-co[data-phase="opening"] .kc-co__crate-lid {
  transform: translateY(-80px) rotate(-22deg);
  opacity: 0;
}

/* Light beam — only visible during opening */
.kc-co__crate-beam {
  opacity: 0;
  transform-origin: center 180px;
  transform: scaleY(0);
}
.kc-co[data-phase="opening"] .kc-co__crate-beam {
  animation: kc-co-beam 700ms cubic-bezier(0.2, 0, 0.4, 1) forwards;
}
@keyframes kc-co-beam {
  0%   { opacity: 0; transform: scaleY(0); }
  30%  { opacity: 1; transform: scaleY(1.8); }
  100% { opacity: 0; transform: scaleY(2.2); }
}

/* White flash — pops once on opening */
.kc-co__crate-flash {
  opacity: 0;
  transform-origin: center;
  transform: scale(0.4);
}
.kc-co[data-phase="opening"] .kc-co__crate-flash {
  animation: kc-co-flash 600ms ease-out forwards;
}
@keyframes kc-co-flash {
  0%   { opacity: 0; transform: scale(0.4); }
  40%  { opacity: 0.95; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(2); }
}

/* Orbiting sparkles around the crate during buildup */
.kc-co__sparks {
  position: absolute; inset: 0;
  pointer-events: none;
}
.kc-co__spark {
  position: absolute; top: 50%; left: 50%;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  color: var(--kc-rarity-uncommon);
  margin: -3px 0 0 -3px;
  box-shadow: 0 0 12px currentColor;
  opacity: 0;
}
.kc-co[data-peak="common"]    .kc-co__spark { color: var(--kc-rarity-common); }
.kc-co[data-peak="uncommon"]  .kc-co__spark { color: var(--kc-rarity-uncommon); }
.kc-co[data-peak="rare"]      .kc-co__spark { color: var(--kc-rarity-rare); }
.kc-co[data-peak="epic"]      .kc-co__spark { color: var(--kc-rarity-epic); }
.kc-co[data-peak="legendary"] .kc-co__spark { color: var(--kc-rarity-legendary); }
.kc-co[data-phase="buildup"] .kc-co__spark,
.kc-co[data-phase="opening"] .kc-co__spark {
  animation: kc-co-orbit 2.6s linear infinite;
}
.kc-co__spark--1 { animation-delay: 0s; }
.kc-co__spark--2 { animation-delay: -0.65s; }
.kc-co__spark--3 { animation-delay: -1.3s; }
.kc-co__spark--4 { animation-delay: -1.95s; }
@keyframes kc-co-orbit {
  0%   { transform: rotate(0deg) translateX(38vmin) rotate(0deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: rotate(360deg) translateX(38vmin) rotate(-360deg); opacity: 0; }
}

/* Stage 3 — wheel/strip; takes the same grid cell as the crate, fades in */
.kc-co__wheel {
  grid-column: 1; grid-row: 1;
  width: 100%;
  max-width: 1200px;
  display: flex; flex-direction: column; align-items: center; gap: clamp(10px, 1.4vw, 16px);
  padding: clamp(16px, 3vw, 32px);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 320ms ease, transform 320ms ease;
  pointer-events: none;
}
.kc-co[data-phase="spinning"] .kc-co__wheel,
.kc-co[data-phase="flashing"] .kc-co__wheel,
.kc-co[data-phase="docking"] .kc-co__wheel {
  opacity: 1;
  transform: translateY(0);
}
.kc-co__wheel-title {
  font-size: clamp(11px, 1.6vw, 14px); font-weight: 800;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--kc-muted);
}
.kc-co__wheel-stage {
  position: relative;
  width: 100%;
  height: clamp(200px, 45vw, 340px);
  overflow: hidden;
  perspective: 1200px;
  perspective-origin: center 40%;
}
.kc-co__wheel-stage::before,
.kc-co__wheel-stage::after {
  content: ""; position: absolute; top: 0; bottom: 0;
  width: clamp(80px, 15vw, 180px);
  pointer-events: none; z-index: 3;
}
.kc-co__wheel-stage::before { left: 0; background: linear-gradient(90deg, #000 10%, transparent); }
.kc-co__wheel-stage::after  { right: 0; background: linear-gradient(-90deg, #000 10%, transparent); }
.kc-co__pointer {
  position: absolute; left: 50%;
  width: 0; height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  transform: translateX(-50%);
  z-index: 4;
}
.kc-co__pointer--top    { top: -4px;    border-top: 18px solid var(--kc-primary); }
.kc-co__pointer--bottom { bottom: -4px; border-bottom: 18px solid var(--kc-primary); }
.kc-co__strip {
  position: absolute; top: 50%; left: 0;
  display: flex; gap: clamp(8px, 1.5vw, 16px);
  padding: 0 calc(50% - clamp(50px, 9vw, 90px));
  will-change: transform;
  transform: translateY(-50%) translateX(0);
}
.kc-co__strip--animated {
  transition: transform 1100ms cubic-bezier(0.12, 0.85, 0.18, 1);
}
.kc-co__wheel-foot {
  display: flex; gap: 18px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--kc-muted-dim);
  font-variant-numeric: tabular-nums;
}

/* Stage 4 — unlock overlay container */
.kc-co__unlock {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 32px;
  z-index: 2147483700;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(22,163,74,0.12), transparent 60%),
    rgba(5,8,7,0.85);
  backdrop-filter: blur(6px);
  animation: kc-fade-in 240ms ease forwards;
}

/* Card styles — shared between the rolling strip (CrateOpening screen)
   and anywhere else a rarity-tinted item card is rendered. */
.kc-card {
  flex: 0 0 clamp(100px, 18vw, 180px);
  width: clamp(100px, 18vw, 180px);
  height: clamp(150px, 26vw, 260px);
  border-radius: clamp(10px, 1.4vw, 14px);
  background: linear-gradient(180deg, #0f1a12, var(--kc-surface-1));
  border: 2px solid var(--kc-surface-2);
  padding: clamp(8px, 1.4vw, 16px);
  display: flex; flex-direction: column; justify-content: space-between; align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.kc-card::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0;
  height: 4px;
  background: currentColor;
  box-shadow: 0 0 16px currentColor;
}
.kc-card__art {
  width: clamp(70px, 12vw, 120px); height: clamp(70px, 12vw, 120px); border-radius: 10px;
  background-size: contain; background-position: center; background-repeat: no-repeat;
  background-color: var(--kc-surface-2);
  margin-top: 6px;
}
.kc-card__meta { text-align: center; width: 100%; color: var(--kc-text); }
.kc-card__name {
  font-size: clamp(11px, 1.4vw, 14px); font-weight: 800; color: var(--kc-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 100%;
}
.kc-card__rarity {
  font-size: clamp(9px, 1vw, 10px); font-weight: 800; letter-spacing: 0.2em;
  text-transform: uppercase; margin-top: 4px;
  color: currentColor;
}
.kc-card--common { color: var(--kc-rarity-common); }
.kc-card--common { border-color: rgba(159,199,166,0.5); }
.kc-card--uncommon { color: var(--kc-rarity-uncommon); border-color: rgba(120,228,140,0.65); }
.kc-card--uncommon { background: radial-gradient(ellipse at center bottom, rgba(120,228,140,0.25), transparent 60%), linear-gradient(180deg, #0f1a12, var(--kc-surface-1)); }
.kc-card--rare { color: var(--kc-rarity-rare); border-color: rgba(102,212,255,0.7); background: radial-gradient(ellipse at center bottom, rgba(102,212,255,0.25), transparent 55%), linear-gradient(180deg, #0f1520, var(--kc-surface-1)); }
.kc-card--epic { color: var(--kc-rarity-epic); border-color: rgba(199,139,255,0.75); background: radial-gradient(ellipse at center bottom, rgba(199,139,255,0.2), transparent 55%), linear-gradient(180deg, #170f20, var(--kc-surface-1)); }
.kc-card--legendary {
  color: var(--kc-rarity-legendary);
  border-color: rgba(255,216,102,0.85);
  background: radial-gradient(ellipse at center bottom, rgba(255,216,102,0.25), transparent 55%), linear-gradient(180deg, #1a1408, var(--kc-surface-1));
}
.kc-card--featured {
  transform: scale(1.05);
}

.kc-unlock {
  width: min(460px, 100%);
  background: linear-gradient(180deg, #0c1410, var(--kc-surface));
  border: 2px solid currentColor;
  border-radius: clamp(12px, 2vw, 18px);
  padding: clamp(20px, 3.5vw, 32px);
  text-align: center;
  animation: kc-unlock-rise 400ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  position: relative; overflow: hidden;
}
@keyframes kc-unlock-rise {
  from { transform: translateY(20px) scale(0.96); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
.kc-unlock::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse at top, currentColor, transparent 60%);
  opacity: 0.15; pointer-events: none;
}
.kc-unlock__banner {
  font-size: 16px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase;
  margin-bottom: 20px;
  position: relative;
}
.kc-unlock__art-wrap {
  position: relative;
  width: clamp(120px, 20vw, 160px); height: clamp(120px, 20vw, 160px);
  margin: 0 auto 20px;
  display: flex; align-items: center; justify-content: center;
}
.kc-unlock__art-wrap::before { display: none; }
.kc-unlock__art {
  width: clamp(100px, 18vw, 140px); height: clamp(100px, 18vw, 140px);
  border-radius: clamp(12px, 2vw, 18px);
  background-size: contain; background-position: center; background-repeat: no-repeat;
  background-color: var(--kc-surface-2);
  border: 2px solid currentColor;
  position: relative;
}
.kc-unlock__name {
  font-size: clamp(18px, 3vw, 26px); font-weight: 900; color: var(--kc-text);
  margin: 0 0 4px; letter-spacing: -0.01em;
}
.kc-unlock__type {
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--kc-muted); margin-bottom: 10px;
}
.kc-unlock__rarity {
  font-size: 11px; font-weight: 800; letter-spacing: 0.2em;
  text-transform: uppercase;
  color: currentColor;
  margin-bottom: 24px;
}
.kc-unlock__stats {
  text-align: left;
  border-top: 1px solid var(--kc-surface-2);
  border-bottom: 1px solid var(--kc-surface-2);
  padding: 14px 0;
  display: grid; gap: 8px;
  font-size: 12px;
  margin-bottom: 20px;
}
.kc-unlock__stat {
  display: flex; justify-content: space-between;
  color: var(--kc-muted);
}
.kc-unlock__stat strong { color: var(--kc-text); font-weight: 700; }
.kc-unlock__stat--good strong { color: var(--kc-highlight); }
.kc-unlock__stat--scrap strong { color: var(--kc-warn); }

/* ── Skip hint (under the wheel during act 2) ───────────────────────── */
.kc-co__skip-hint {
  font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--kc-muted-dim); font-weight: 700;
  opacity: 0.6;
}

/* ── Flash card — winning card, centered, slides to dock ────────────── */
.kc-co__flash {
  position: fixed; left: 50%; top: 50%;
  z-index: 2147483650;
  width: clamp(220px, 28vw, 320px);
  padding: clamp(14px, 1.6vw, 20px);
  border-radius: clamp(14px, 1.6vw, 18px);
  background: linear-gradient(180deg, #0c1410, var(--kc-surface));
  border: 2px solid currentColor;
  box-shadow: 0 0 60px currentColor, 0 24px 60px rgba(0,0,0,0.7);
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  pointer-events: none;
  transform-origin: center;
  transform: translate(-50%, -50%) scale(0.9);
  opacity: 0;
}
.kc-co__flash[data-phase="flashing"] {
  animation: kc-co-flash-pop 360ms cubic-bezier(0.18, 0.9, 0.3, 1.05) forwards;
}
.kc-co__flash[data-phase="docking"] {
  transition:
    transform 360ms cubic-bezier(0.5, 0, 0.7, 1),
    opacity 320ms ease 40ms;
  transform: translate(35vw, 35vh) scale(0.18);
  opacity: 0;
}
@keyframes kc-co-flash-pop {
  0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
  60%  { transform: translate(-50%, -50%) scale(1.04); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
}
.kc-co__flash::before {
  content: ""; position: absolute; inset: -2px;
  border-radius: inherit;
  background: radial-gradient(ellipse at top, currentColor, transparent 65%);
  opacity: 0.18;
  pointer-events: none;
}
.kc-co__flash-banner {
  font-size: 10px; font-weight: 900; letter-spacing: 0.32em;
  text-transform: uppercase;
  color: currentColor;
  position: relative;
}
.kc-co__flash-art {
  width: clamp(110px, 14vw, 160px); height: clamp(110px, 14vw, 160px);
  border-radius: clamp(10px, 1.2vw, 14px);
  background: var(--kc-surface-2);
  border: 2px solid currentColor;
  position: relative;
}
.kc-co__flash-art > svg {
  width: 100%; height: 100%; display: block; border-radius: inherit;
}
.kc-co__flash-name {
  font-size: clamp(15px, 1.8vw, 19px); font-weight: 900;
  color: var(--kc-text); margin: 4px 0 0;
  letter-spacing: -0.01em;
  position: relative;
}
.kc-co__flash-type {
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--kc-muted);
  position: relative;
}
.kc-co__flash-tag {
  font-size: 11px; font-weight: 800; letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  margin-top: 4px;
  position: relative;
}
.kc-co__flash-tag--new {
  background: rgba(83,252,24,0.15);
  color: var(--kc-primary);
}
.kc-co__flash-tag--dup {
  background: rgba(255,193,87,0.16);
  color: var(--kc-warn);
}

/* ── Dock tray (bottom-right, fills as cards land) ──────────────────── */
.kc-co__dock {
  position: fixed;
  right: clamp(16px, 2.4vw, 32px);
  bottom: clamp(16px, 2.4vw, 32px);
  z-index: 2147483640;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
  background: rgba(8, 12, 10, 0.78);
  border: 1px solid var(--kc-surface-2);
  border-radius: 14px;
  padding: 12px 14px;
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.5);
  animation: kc-co-dock-in 280ms ease forwards;
  max-width: min(80vw, 560px);
}
@keyframes kc-co-dock-in {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.kc-co__dock-head {
  display: flex; align-items: baseline; gap: 8px;
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--kc-muted);
}
.kc-co__dock-count {
  color: var(--kc-text);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.kc-co__dock-label { font-weight: 700; }
.kc-co__dock-row {
  display: flex; gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.kc-co__dock-slot {
  position: relative;
  width: clamp(44px, 5vw, 56px);
  height: clamp(44px, 5vw, 56px);
  border-radius: 10px;
  background: var(--kc-surface-2);
  border: 2px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  transition: transform 200ms ease;
}
.kc-co__dock-slot[data-filled="false"] {
  border-style: dashed;
  border-color: rgba(255,255,255,0.12);
}
.kc-co__dock-slot[data-filled="true"] { border-style: solid; }
.kc-co__dock-slot--common[data-filled="true"]    { border-color: var(--kc-rarity-common);    box-shadow: 0 0 12px rgba(159,199,166,0.35); }
.kc-co__dock-slot--uncommon[data-filled="true"]  { border-color: var(--kc-rarity-uncommon);  box-shadow: 0 0 12px rgba(120,228,140,0.45); }
.kc-co__dock-slot--rare[data-filled="true"]      { border-color: var(--kc-rarity-rare);      box-shadow: 0 0 14px rgba(102,212,255,0.55); }
.kc-co__dock-slot--epic[data-filled="true"]      { border-color: var(--kc-rarity-epic);      box-shadow: 0 0 16px rgba(199,139,255,0.65); }
.kc-co__dock-slot--legendary[data-filled="true"] { border-color: var(--kc-rarity-legendary); box-shadow: 0 0 18px rgba(255,216,102,0.75); }
.kc-co__dock-slot[data-just-filled="true"] {
  animation: kc-co-dock-pop 360ms cubic-bezier(0.2, 0.9, 0.3, 1.25);
}
@keyframes kc-co-dock-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.kc-co__dock-art {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.kc-co__dock-art > svg {
  width: 100%; height: 100%; display: block;
}
.kc-co__dock-placeholder {
  font-size: 11px; font-weight: 900;
  color: var(--kc-muted-dim);
  font-variant-numeric: tabular-nums;
}
.kc-co__dock-dup {
  position: absolute;
  bottom: 2px; right: 2px;
  font-size: 9px; font-weight: 900;
  letter-spacing: 0.04em;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(0,0,0,0.7);
  color: var(--kc-warn);
}

/* ── Finale — full grid + totals ────────────────────────────────────── */
.kc-co__finale {
  position: relative;
  z-index: 2147483650;
  width: min(720px, 92vw);
  max-height: 88vh;
  overflow: auto;
  padding: clamp(20px, 3vw, 32px);
  border-radius: clamp(14px, 2vw, 20px);
  background: linear-gradient(180deg, #0c1410, var(--kc-surface));
  border: 1px solid var(--kc-surface-2);
  box-shadow: 0 30px 80px rgba(0,0,0,0.7);
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  animation: kc-co-finale-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes kc-co-finale-in {
  from { transform: translateY(14px) scale(0.97); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
.kc-co__finale-eyebrow {
  font-size: 11px; font-weight: 800; letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--kc-primary);
}
.kc-co__finale-title {
  margin: 0;
  font-size: clamp(20px, 2.6vw, 28px);
  font-weight: 900;
  color: var(--kc-text);
  letter-spacing: -0.01em;
}
.kc-co__finale-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
  width: 100%;
  margin: 6px 0 4px;
}
.kc-co__finale-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 8px;
  border-radius: 10px;
  background: var(--kc-surface-2);
  border: 2px solid rgba(255,255,255,0.06);
  position: relative;
  overflow: hidden;
}
.kc-co__finale-card--common    { border-color: rgba(159,199,166,0.4); }
.kc-co__finale-card--uncommon  { border-color: rgba(120,228,140,0.55); }
.kc-co__finale-card--rare      { border-color: rgba(102,212,255,0.6); }
.kc-co__finale-card--epic      { border-color: rgba(199,139,255,0.65); }
.kc-co__finale-card--legendary { border-color: rgba(255,216,102,0.75); box-shadow: 0 0 14px rgba(255,216,102,0.25); }
.kc-co__finale-art {
  width: clamp(60px, 6vw, 80px); height: clamp(60px, 6vw, 80px);
  display: flex; align-items: center; justify-content: center;
}
.kc-co__finale-art > svg { width: 100%; height: 100%; display: block; }
.kc-co__finale-name {
  font-size: 12px; font-weight: 800;
  color: var(--kc-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 100%;
}
.kc-co__finale-rarity {
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em;
  text-transform: uppercase;
}
.kc-co__finale-card--common    .kc-co__finale-rarity { color: var(--kc-rarity-common); }
.kc-co__finale-card--uncommon  .kc-co__finale-rarity { color: var(--kc-rarity-uncommon); }
.kc-co__finale-card--rare      .kc-co__finale-rarity { color: var(--kc-rarity-rare); }
.kc-co__finale-card--epic      .kc-co__finale-rarity { color: var(--kc-rarity-epic); }
.kc-co__finale-card--legendary .kc-co__finale-rarity { color: var(--kc-rarity-legendary); }
.kc-co__finale-status {
  font-size: 10px; font-weight: 900; letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
}
.kc-co__finale-status--new {
  background: rgba(83,252,24,0.15);
  color: var(--kc-primary);
}
.kc-co__finale-status--dup {
  background: rgba(255,193,87,0.14);
  color: var(--kc-warn);
}
.kc-co__finale-totals {
  display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
  padding: 12px 0;
  border-top: 1px solid var(--kc-surface-2);
  border-bottom: 1px solid var(--kc-surface-2);
  width: 100%;
  margin: 4px 0 8px;
}
.kc-co__finale-total {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 78px;
}
.kc-co__finale-total-v {
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 900;
  color: var(--kc-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.kc-co__finale-total-l {
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--kc-muted);
}

/* ═════════════════════════════════════════════════════════════════════
   CLAIM REVEAL (welcome + quest claim + tier claim — fullscreen overlay)
   ═════════════════════════════════════════════════════════════════════ */
.kc-claim {
  position: fixed; inset: 0;
  z-index: 2147483700;
  pointer-events: auto;
  /* "safe center" keeps the stage vertically centered when the content
     fits, but falls back to start-alignment when the summary is taller
     than the viewport — so the top never gets clipped off-screen. The
     overlay itself scrolls when that happens, not an inner box, so we
     don't end up with a mid-card scrollbar. */
  display: flex;
  align-items: safe center;
  justify-content: center;
  padding: clamp(16px, 3vw, 40px);
  background:
    radial-gradient(ellipse at 50% 20%, rgba(83,252,24,0.08), transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgba(22,163,74,0.10), transparent 50%),
    #000;
  animation: kc-fade-in 260ms ease forwards;
  overflow-x: hidden;
  overflow-y: auto;
  container-type: inline-size;
}
/* Hide the overlay's own scrollbar — the orbs live behind .kc-claim__bg
   which is positioned + clipped, so a visible track would sit over them
   awkwardly. Content still scrolls with the wheel / touch gesture. */
.kc-claim::-webkit-scrollbar { width: 0; height: 0; }
.kc-claim { scrollbar-width: none; }
.kc-claim[data-stage="closing"] { animation: kc-fade-out 260ms ease forwards; }

.kc-claim__bg {
  position: absolute; inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.kc-claim__orb {
  position: absolute;
  width: 50vmax; height: 50vmax;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
}
.kc-claim__orb--1 {
  top: -15vmax; left: -15vmax;
  background: radial-gradient(circle, rgba(83,252,24,0.35), transparent 60%);
  animation: kc-orb-a 18s ease-in-out infinite;
}
.kc-claim__orb--2 {
  bottom: -18vmax; right: -10vmax;
  background: radial-gradient(circle, rgba(44,183,11,0.3), transparent 60%);
  animation: kc-orb-b 22s ease-in-out infinite;
}
.kc-claim__orb--3 {
  top: 30%; left: 40%;
  width: 30vmax; height: 30vmax;
  background: radial-gradient(circle, rgba(120,228,140,0.22), transparent 60%);
  animation: kc-orb-c 16s ease-in-out infinite;
}
@keyframes kc-orb-a {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(4vw, 3vh); }
}
@keyframes kc-orb-b {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-3vw, -2vh); }
}
@keyframes kc-orb-c {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-45%, -55%) scale(1.1); }
}

.kc-claim__stage {
  position: relative;
  width: min(720px, 100%);
  /* No max-height or overflow on the stage itself — the .kc-claim
     overlay scrolls when content genuinely doesn't fit, so we never
     get a mid-card scrollbar when the summary is slightly tall. */
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
  gap: clamp(12px, 1.6vw, 18px);
  margin: auto 0;
  animation: kc-claim-rise 520ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
@keyframes kc-claim-rise {
  from { transform: translateY(24px) scale(0.96); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.kc-claim__logo {
  width: clamp(72px, 12vw, 120px); height: clamp(72px, 12vw, 120px);
  filter: drop-shadow(0 0 24px rgba(83,252,24,0.4));
  animation: kc-claim-float 3.2s ease-in-out infinite;
}
.kc-claim__logo svg { width: 100%; height: 100%; display: block; }
@keyframes kc-claim-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.kc-claim__eyebrow {
  font-size: clamp(10px, 1.1vw, 12px); font-weight: 800;
  letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--kc-primary);
}
.kc-claim__title {
  font-size: clamp(28px, 5vw, 48px); font-weight: 900;
  margin: 0; color: var(--kc-text);
  letter-spacing: -0.02em; line-height: 1.05;
}
.kc-claim__title--sm { font-size: clamp(22px, 3.6vw, 34px); }
.kc-claim__username { color: var(--kc-primary); }
.kc-claim__sub {
  font-size: clamp(13px, 1.6vw, 15px);
  color: var(--kc-muted);
  max-width: 480px; margin: 0; line-height: 1.5;
}

.kc-claim__banner {
  font-size: clamp(11px, 1.2vw, 13px); font-weight: 900;
  letter-spacing: 0.24em; text-transform: uppercase;
}
.kc-claim__art {
  width: clamp(140px, 24vw, 220px); height: clamp(140px, 24vw, 220px);
  border-radius: clamp(14px, 2vw, 20px);
  background-color: var(--kc-surface-1);
  background-size: contain; background-position: center; background-repeat: no-repeat;
  border: 2px solid var(--kc-border);
  box-shadow: 0 0 60px rgba(83,252,24,0.15);
}
.kc-claim__art--common    { border-color: var(--kc-rarity-common); box-shadow: 0 0 60px rgba(159,199,166,0.20); }
.kc-claim__art--uncommon  { border-color: var(--kc-rarity-uncommon); box-shadow: 0 0 60px rgba(120,228,140,0.25); }
.kc-claim__art--rare      { border-color: var(--kc-rarity-rare); box-shadow: 0 0 60px rgba(102,212,255,0.30); }
.kc-claim__art--epic      { border-color: var(--kc-rarity-epic); box-shadow: 0 0 80px rgba(199,139,255,0.30); }
.kc-claim__art--legendary { border-color: var(--kc-rarity-legendary); box-shadow: 0 0 90px rgba(255,216,102,0.35); }

.kc-claim__name {
  font-size: clamp(22px, 3.5vw, 32px); font-weight: 900;
  margin: 0; color: var(--kc-text); letter-spacing: -0.01em;
}
.kc-claim__type {
  font-size: clamp(10px, 1.1vw, 12px); font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--kc-muted-dim);
}
.kc-claim__desc {
  max-width: 480px; margin: 0;
  font-size: clamp(12px, 1.4vw, 14px); color: var(--kc-muted);
  line-height: 1.55;
}

.kc-claim__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(120px, 18vw, 160px), 1fr));
  gap: clamp(10px, 1.4vw, 14px);
  width: 100%;
  max-width: 600px;
  margin: clamp(6px, 1vw, 10px) 0;
}
.kc-claim__grid--single { grid-template-columns: minmax(0, 240px); justify-content: center; }
.kc-claim__grid-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px;
  padding: clamp(10px, 1.4vw, 14px);
  background: rgba(255,255,255,0.03);
  border: 1.5px solid var(--kc-border);
  border-radius: clamp(10px, 1.4vw, 14px);
  backdrop-filter: blur(10px);
}
.kc-claim__grid-item--common    { border-color: var(--kc-rarity-common); }
.kc-claim__grid-item--uncommon  { border-color: var(--kc-rarity-uncommon); }
.kc-claim__grid-item--rare      { border-color: var(--kc-rarity-rare); }
.kc-claim__grid-item--epic      { border-color: var(--kc-rarity-epic); }
.kc-claim__grid-item--legendary { border-color: var(--kc-rarity-legendary); }
.kc-claim__grid-art {
  width: clamp(72px, 11vw, 96px); height: clamp(72px, 11vw, 96px);
  border-radius: 10px;
  background-color: rgba(0,0,0,0.35);
  background-size: contain; background-position: center; background-repeat: no-repeat;
}
.kc-claim__grid-name {
  font-size: clamp(12px, 1.3vw, 14px); font-weight: 800;
  color: var(--kc-text);
  max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kc-claim__grid-type {
  font-size: clamp(9px, 1vw, 10px); font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--kc-muted-dim);
}

.kc-claim__bonuses {
  display: flex; flex-wrap: wrap; gap: clamp(8px, 1.2vw, 12px);
  justify-content: center;
}
.kc-claim__bonus {
  display: flex; flex-direction: column; align-items: center;
  gap: 2px;
  padding: clamp(10px, 1.4vw, 14px) clamp(14px, 2vw, 20px);
  background: rgba(83,252,24,0.08);
  border: 1px solid rgba(83,252,24,0.25);
  border-radius: 12px;
  min-width: 96px;
}
.kc-claim__bonus--dup {
  background: rgba(255,176,32,0.08);
  border-color: rgba(255,176,32,0.3);
}
.kc-claim__bonus-v {
  font-size: clamp(18px, 2.4vw, 22px); font-weight: 900;
  color: var(--kc-primary);
  letter-spacing: -0.01em;
}
.kc-claim__bonus--dup .kc-claim__bonus-v { color: var(--kc-warn); }
.kc-claim__bonus-l {
  font-size: clamp(9px, 1vw, 10px); font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--kc-muted-dim);
}

/* ═════════════════════════════════════════════════════════════════════
   WELCOME DIALOG (first-visit popup)
   ═════════════════════════════════════════════════════════════════════ */
.kc-welcome-dialog {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(4,7,6,0.9);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  padding: clamp(12px, 2vw, 24px);
  pointer-events: auto !important;
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  overflow: hidden;
}
.kc-welcome-dialog[data-state="open"] { animation: kc-fade-in 200ms ease; }
.kc-welcome-dialog[data-state="closed"] { animation: kc-fade-out 180ms ease forwards; }

.kc-welcome-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: min(92vh, 92dvh);
  background: var(--kc-surface);
  border: 1px solid var(--kc-border);
  border-radius: 12px;
  padding: 0 20px 20px;
  text-align: center;
  color: var(--kc-text-dim);
  animation: kc-rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.kc-welcome-card__close {
  all: unset;
  position: absolute; top: 10px; right: 10px;
  width: 32px; height: 32px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--kc-muted);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.kc-welcome-card__close:hover { background: rgba(255,255,255,0.06); color: var(--kc-text); }
.kc-welcome-card__close svg { width: 14px; height: 14px; fill: currentColor; }
.kc-welcome-card__hero {
  flex: 0 0 auto;
  width: calc(100% + 40px);
  margin: 0 -20px 14px;
  height: clamp(120px, 22vh, 180px);
  overflow: hidden;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  background: var(--kc-surface-1);
}
.kc-welcome-card__hero svg { width: 100%; height: 100%; display: block; }
.kc-welcome-card__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.kc-welcome-card__title {
  margin: 0 0 8px;
  font-size: clamp(18px, 2.2vw, 20px); font-weight: 700;
  color: var(--kc-text);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.kc-welcome-card__brand { color: var(--kc-primary); }
.kc-welcome-card__subtitle {
  margin: 0 0 18px;
  color: var(--kc-muted);
  font-size: clamp(12px, 1.3vw, 13px);
  line-height: 1.55;
  text-wrap: balance;
}
.kc-welcome-card__actions {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: auto;
  width: 100%;
  box-sizing: border-box;
}
.kc-welcome-card__cta {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: block;
  padding: 12px 16px;
  background: var(--kc-primary);
  color: #06140a;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border-radius: 8px;
  cursor: pointer;
  transition: background 120ms ease, transform 80ms ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kc-welcome-card__cta:hover { background: var(--kc-primary-soft); }
.kc-welcome-card__cta:active { transform: translateY(1px); }
.kc-welcome-card__skip {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: block;
  padding: 10px;
  color: var(--kc-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  border-radius: 6px;
  transition: color 120ms ease, background 120ms ease;
}
.kc-welcome-card__skip:hover { color: var(--kc-text-dim); background: rgba(255,255,255,0.04); }

/* ═════════════════════════════════════════════════════════════════════
   FOCUS + INTERACTIVITY
   ═════════════════════════════════════════════════════════════════════ */
.kc-btn:focus-visible,
.kc-tab:focus-visible,
.kc-close:focus-visible,
.kc-cat:focus-visible,
.kc-item:focus-visible,
.kc-sidebar-btn:focus-visible {
  outline: 2px solid var(--kc-highlight);
  outline-offset: 2px;
}
.kc-dialog *:focus { outline: none; }
.kc-dialog *:focus-visible {
  outline: 2px solid var(--kc-highlight);
  outline-offset: 2px;
  border-radius: 6px;
}

.kc-crate { cursor: default; }
.kc-crate[data-ready="true"] { cursor: pointer; }
.kc-crate[data-ready="true"]:hover {
  background: var(--kc-surface-1);
  border-color: var(--kc-primary-soft);
}

.kc-quest { transition: border-color 160ms ease, transform 120ms ease, box-shadow 200ms ease; }
.kc-quest[data-claimable="true"]:hover {
  box-shadow: 0 0 0 1px var(--kc-primary), 0 6px 22px rgba(22,163,74,0.18);
  transform: translateY(-1px);
}

.kc-tier { cursor: pointer; }
.kc-tier:hover:not([data-current="true"]) {
  border-color: var(--kc-border-strong);
  transform: translateY(-2px);
}

.kc-item:focus-visible { transform: scale(1.1); z-index: 3; }

.kc-slot { transition: border-color 160ms ease, background 160ms ease; }
.kc-slot:hover { border-color: var(--kc-border); background: var(--kc-surface); }

/* Hide text-only selection flash */
.kc-dialog ::selection { background: rgba(120,228,140,0.35); color: var(--kc-text); }

/* ═════════════════════════════════════════════════════════════════════
   RESPONSIVE — container queries (dialog-relative) + viewport fallbacks
   Most sizing now lives in clamp()/auto-fit across the file; these
   blocks only handle LAYOUT changes that clamp can't express.
   ═════════════════════════════════════════════════════════════════════ */

/* Dialog goes edge-to-edge once it can't fit its own padding + shadow */
@media (max-width: 680px) {
  .kc-overlay { padding: 0; }
  .kc-dialog {
    height: 100vh; height: 100dvh;
    max-height: 100dvh;
    max-width: 100%;
    border-radius: 0; border-left: 0; border-right: 0;
  }
}

/* Header compacts progressively — content stays visible, just tighter. */
@container (max-width: 820px) {
  .kc-head:not(.kc-head--minimal) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "brand" "stats" "right";
    gap: 8px;
    padding: 10px 12px;
  }
  .kc-head:not(.kc-head--minimal) .kc-brand { grid-area: brand; }
  .kc-head:not(.kc-head--minimal) .kc-head__left {
    grid-area: stats;
    justify-content: center;
    flex-wrap: wrap;
  }
  .kc-head:not(.kc-head--minimal) .kc-head__right {
    grid-area: right;
    justify-content: center;
    flex-wrap: wrap;
  }
  .kc-xpbar { flex: 1 1 180px; min-width: 120px; }
}
@container (max-width: 520px) {
  .kc-brand__sub { font-size: 8px; letter-spacing: 0.12em; }
  .kc-avatar-chip__sub { display: none; }
  .kc-avatar-chip__name { max-width: 100px; }
  .kc-stat { min-width: 40px; height: 38px; padding: 0 6px; }
  .kc-stat__value { font-size: 12px; }
  .kc-stat__label { font-size: 7px; }
  .kc-xpbar__lbl { font-size: 9px; }
}

/* BP tier-progress wraps onto two lines when tight */
@container (max-width: 520px) {
  .kc-bp__tier-progress { flex-wrap: wrap; }
  .kc-bp__tier-progress > div { flex: 1 1 100%; }
}

/* Hide Welcome reward pill if super tight — numbers still visible in bar */
@container (max-width: 420px) {
  .kc-welcome__reward { display: none; }
  .kc-welcome { flex-direction: column; align-items: stretch; }
  .kc-welcome__step { align-self: flex-start; }
}

/* ═════════════════════════════════════════════════════════════════════
   Page mode — full-viewport surface that mounts at
   /kickcrates?kc_tab=<tab>. Rides on top of whatever Kick renders at
   /kickcrates (a 404 today, potentially a bot-profile tomorrow),
   covering the main content area. Query-param-on-base-path is
   deliberate: Kick only renders its navbar + sidebar shell at top-
   level segments, so deep paths like /kickcrates/app/x lose the
   chrome. Uses Kick's own CSS custom properties so the layout
   tracks navbar + sidebar size changes without us re-measuring.
   ═════════════════════════════════════════════════════════════════════ */
.kc-page-surface {
  position: fixed !important;
  top: var(--navbar-height, 56px) !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  background: var(--kc-bg) !important;
  z-index: 100 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  pointer-events: auto !important;
  display: flex !important;
  flex-direction: column !important;
  animation: kc-fade-in 160ms ease forwards;
}
/* On XL (Kick's docked-sidebar breakpoint) shift right of the sidebar
   so users can still click into channels from the nav. On smaller
   viewports Kick's sidebar is an off-canvas drawer, so we span full
   width. */
@media (min-width: 1280px) {
  .kc-page-surface {
    left: var(--sidebar-expanded-width, 240px) !important;
  }
}

/* When rendered inside the page surface, the dialog sheds its modal
   shell: no fixed width, no centered drop shadow, no rise animation,
   no rounded corners. It becomes the page body. */
.kc-dialog--page {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  min-height: 100% !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  animation: none !important;
  transform: none !important;
  opacity: 1 !important;
  background: var(--kc-bg) !important;
  flex: 1 1 auto;
}

/* Hide Kick's 404 body while our page is active. Two selectors for
   defense: the test-id (stable) and the wrapping flex div (fallback
   for when test-ids move). The surface sits on top regardless, but
   hiding avoids screen-readers announcing "Oops, something went
   wrong" and keeps Kick's 404 PNG from flashing before mount. */
html.kc-page-active [data-testid="not-found"],
html.kc-page-active main > div:has([data-testid="not-found"]) {
  display: none !important;
}
/* Body scroll is already locked by Kick's own lg:h-dvh +
   lg:overflow-hidden classes on the body element. We deliberately
   don't add a second overflow lock on html — users reported sidebar
   dimming flashes which appeared correlated with this rule triggering
   scrollbar removal on route change. The page surface owns its own
   scroll. */

/* ═════════════════════════════════════════════════════════════════════
   PageHeader — title + stats + season chips row. Replaces the dialog's
   modal header + tab switcher when rendered as a Kick page. Mirrors
   Kick's own page headers (Following, Browse) for typography and
   rhythm: big tight H1, muted subline, stats pulled to the right.
   ═════════════════════════════════════════════════════════════════════ */
.kc-page-header {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(16px, 2.4vw, 28px) clamp(16px, 2.4vw, 28px) 12px;
  border-bottom: 1px solid var(--kc-border);
}
.kc-page-header__row {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}
.kc-page-header__titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 300px;
}
.kc-page-header__h1 {
  margin: 0;
  font-size: clamp(24px, 2.6vw, 32px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--kc-text);
  line-height: 1.1;
}
.kc-page-header__sub {
  margin: 0;
  color: var(--kc-muted);
  font-size: 14px;
  line-height: 1.45;
  max-width: 56ch;
}
.kc-page-header__stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 0 0 auto;
}
.kc-page-header__stat {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 52px;
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-border);
}
.kc-page-header__stat-v {
  font-size: 15px;
  font-weight: 800;
  color: var(--kc-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.kc-page-header__stat-l {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--kc-muted-dim);
  line-height: 1;
}
.kc-page-header__xp {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--kc-surface-1);
  border: 1px solid var(--kc-border);
  min-width: 260px;
}
.kc-page-header__xp-lvl {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--kc-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.kc-page-header__xp-track {
  flex: 1 1 auto;
  height: 4px;
  border-radius: 2px;
  background: var(--kc-surface-2);
  overflow: hidden;
  min-width: 80px;
}
.kc-page-header__xp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--kc-primary-dim), var(--kc-primary));
  border-radius: inherit;
  transition: width 300ms ease;
}
.kc-page-header__xp-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--kc-muted);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.kc-page-header__season {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.kc-page-header__season-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--kc-surface-2);
  color: var(--kc-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.kc-page-header__season-chip--live {
  background: var(--kc-primary);
  color: #06140a;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.kc-page-header__season-chip--warn {
  color: var(--kc-warn);
  border: 1px solid rgba(255,176,32,0.3);
  background: rgba(255,176,32,0.08);
}
.kc-page-header__season-chip-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #06140a;
  opacity: 0.6;
}

/* In page mode, the dashboard scrolls as a page — the inner panel
   owns the scroll area so the header stays visible above. */
.kc-dialog--page .kc-panel {
  flex: 1 1 auto;
  overflow-y: auto;
}

/* ═════════════════════════════════════════════════════════════════════
   Kick-native look-and-feel polish. Applies to every interactive
   surface in the app so the pages feel continuous with Kick's own UI.
   ═════════════════════════════════════════════════════════════════════ */

/* Tabular-nums on every number the user reads in a list or comparison
   — prevents digit-shift during live updates. */
.kc-stat__value,
.kc-xpbar__lbl,
.kc-stat-tile__value,
.kc-stat-tile__hint,
.kc-crate__progress-label,
.kc-quest__pct,
.kc-quest__xp,
.kc-tier__num,
.kc-rarity-row__count,
.kc-cat__count-num,
.kc-cat__count-total,
.kc-profile-head__level-num,
.kc-profile-head__xp,
.kc-bp__hero-stat-v,
.kc-bp__tier-sub,
.kc-bp__tier-label,
.kc-bp__tier-badge,
.kc-bp__claim-all-count,
.kc-recent-row__when,
.kc-crate-cards-badge,
.kc-item__dup,
.kc-sidebar-level {
  font-variant-numeric: tabular-nums;
}

/* Rounded-full chip/pill treatment — matches Kick's tag style
   (English / funny / IRL pills, viewer-count pills, etc). */
.kc-bp-chip,
.kc-rarity-pill,
.kc-recent-row__source {
  border-radius: 999px !important;
}
/* Kick's LIVE-badge treatment — solid primary with black text. Used
   for the "READY" state on a crate (the "click to open" signal). */
.kc-crate-tag--ready {
  background: var(--kc-primary) !important;
  color: #06140a !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
  padding: 3px 8px !important;
  border-radius: 3px !important;
  text-transform: uppercase;
}

/* Press-scale feedback on every button-like surface. Mirrors Kick's
   own betterhover active scale affordance. */
.kc-btn:active:not(:disabled),
.kc-cat:active,
.kc-tier:active,
.kc-item:active:not(:disabled),
.kc-sidebar-btn:active,
.kc-sidebar-sublink:active {
  transform: scale(0.98);
  transition: transform 80ms ease;
}

/* ─── Corner brackets on hover — Kick's signature card affordance.
   Four 12×12 L-shaped corners in primary green, layered via 8
   pinpoint background gradients on a single pseudo-element. Fades
   in on hover; also solid on active / ready / selected states so
   the card reads as "live" without needing a pointer. */
.kc-crate,
.kc-item,
.kc-tier,
.kc-cat,
.kc-stat-tile,
.kc-slot,
.kc-recent-row__btn,
.kc-quest,
.kc-crate-card,
.kc-bp__hero {
  position: relative;
}
.kc-crate::before,
.kc-item::before,
.kc-tier::before,
.kc-cat::before,
.kc-stat-tile::before,
.kc-slot::before,
.kc-recent-row__btn::before,
.kc-quest::before,
.kc-bp__hero::before {
  content: "";
  position: absolute;
  inset: -2px;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  transition: opacity 160ms ease;
  z-index: 3;
  background:
    linear-gradient(var(--kc-primary), var(--kc-primary)) top    left  / 14px 2px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) top    left  / 2px 14px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) top    right / 14px 2px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) top    right / 2px 14px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) bottom left  / 14px 2px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) bottom left  / 2px 14px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) bottom right / 14px 2px no-repeat,
    linear-gradient(var(--kc-primary), var(--kc-primary)) bottom right / 2px 14px no-repeat;
}
.kc-crate:hover::before,
.kc-item:hover::before,
.kc-tier:hover::before,
.kc-cat:hover::before,
.kc-stat-tile:hover::before,
.kc-slot:hover::before,
.kc-recent-row__btn:hover::before,
.kc-quest:hover::before,
.kc-bp__hero:hover::before,
.kc-crate[data-ready="true"]::before,
.kc-tier[data-selected="true"]::before,
.kc-cat[data-selected="true"]::before,
.kc-item[data-owned="true"]:hover::before {
  opacity: 1;
}
/* Disabled / locked cards suppress the brackets — no false affordance. */
.kc-item[disabled]:hover::before,
.kc-btn:disabled:hover::before {
  opacity: 0 !important;
}

/* ═════════════════════════════════════════════════════════════════════
   Flat aesthetic — final cascade layer.
   Strips every border-radius, every card/chip border, and every
   container background across the dashboard. The interactive
   affordance becomes exclusively the hover corner brackets defined
   above (matches Kick's gaming-UI card treatment). Content is what's
   visible; frames are invisible until you point at them.
   Kept in a single override block so the direction can be reversed
   wholesale by deleting this block if we want framing back later.
   ═════════════════════════════════════════════════════════════════════ */
[id^="kc-"] *,
[id^="kc-"] ::before,
[id^="kc-"] ::after {
  border-radius: 0 !important;
}

/* Card / tile / panel surfaces lose their borders + filled chrome —
   scoped to PAGE context only. The dialog shell (.kc-dialog when NOT
   .kc-dialog--page) and standalone preview modal (.kc-preview) keep
   their framing so actual dialogs still feel like dialogs. */
.kc-crate,
.kc-item,
.kc-tier,
.kc-cat,
.kc-stat-tile,
.kc-slot,
.kc-recent-row__btn,
.kc-quest,
.kc-bp__hero,
.kc-crate-card,
.kc-page-header__stat,
.kc-page-header__xp,
.kc-dialog--page,
.kc-dialog--page .kc-panel,
.kc-dialog--page .kc-section,
.kc-meta-progress {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Dividers / separators via bottom-border on the page header stay,
   slimmed to match Kick's outline-decorative hairlines. */
.kc-page-header {
  border-bottom: 1px solid var(--kc-border) !important;
}

/* Chips keep uppercase / spacing treatment but go from pill to
   square. The LIVE-style badge still reads as a badge via bold
   weight + letter-spacing + solid primary fill. */
.kc-bp-chip,
.kc-rarity-pill,
.kc-recent-row__source,
.kc-crate-tag,
.kc-crate-tag--ready,
.kc-crate-cards-badge,
.kc-page-header__season-chip,
.kc-page-header__season-chip--live,
.kc-page-header__season-chip--warn,
.kc-sidebar-level,
.kc-sidebar-new-badge,
.kc-sidebar-ready-dot,
.kc-item__dup {
  border-radius: 0 !important;
  border: 0 !important;
}

/* Buttons go flat: solid fill where primary, hollow otherwise.
   No border, no radius, no shadow. Press-scale feedback survives
   from the earlier polish block. */
.kc-btn,
.kc-btn--primary,
.kc-btn--secondary,
.kc-btn--ghost,
.kc-close,
.kc-sidebar-btn,
.kc-sidebar-sublink,
.kc-mobile-menu-btn {
  border-radius: 0 !important;
  box-shadow: none !important;
}
.kc-btn--secondary,
.kc-btn--ghost {
  border: 0 !important;
}

/* Progress tracks + fills go square. The bar still reads as a bar
   because it's a colored rectangle against a darker track. */
.kc-crate__progress,
.kc-crate__progress-fill,
.kc-bp__tier-track,
.kc-bp__tier-fill,
.kc-quest__track,
.kc-quest__fill,
.kc-rarity-row__track,
.kc-rarity-row__fill,
.kc-welcome__track,
.kc-welcome__fill,
.kc-profile-head__track,
.kc-profile-head__fill,
.kc-page-header__xp-track,
.kc-page-header__xp-fill,
.kc-xpbar__track,
.kc-xpbar__fill {
  border-radius: 0 !important;
}

/* Avatars stay circular (they're not cards, they're portraits —
   circular portraits are the standard across Kick's UI too). */
.kc-avatar,
.kc-avatar-chip__avatar,
.kc-profile-head .kc-avatar {
  border-radius: 50% !important;
}

/* Ready-dot / status-dot indicators stay round — they're dots. */
.kc-sidebar-ready-dot,
.kc-bp-chip__dot,
.kc-page-header__season-chip-dot,
.kc-item__rarity-dot {
  border-radius: 50% !important;
}

/* Art containers (inline SVG holders) on PAGE surfaces shed any
   frame — the corner brackets on the parent card do the framing job.
   Note: .kc-preview__art and .kc-preview__art-frame stay out of this
   list on purpose — they belong to the dialog modal and keep their
   rounded frame. */
.kc-item__art,
.kc-crate__art,
.kc-tier__art,
.kc-slot__preview,
.kc-recent-row__art,
.kc-bp__hero-art,
.kc-card__art,
.kc-unlock__art,
.kc-claim__art,
.kc-claim__grid-art {
  border-radius: 0 !important;
  border: 0 !important;
}

/* Hover corner brackets anchor at inset:0 on flat cards (no more
   -2px offset needed since there's no border to sit outside of).
   Tighter bracket size reads crisper on flat surfaces. */
.kc-crate::before,
.kc-item::before,
.kc-tier::before,
.kc-cat::before,
.kc-stat-tile::before,
.kc-slot::before,
.kc-recent-row__btn::before,
.kc-quest::before,
.kc-bp__hero::before {
  inset: 0 !important;
  background-size:
    12px 2px, 2px 12px,
    12px 2px, 2px 12px,
    12px 2px, 2px 12px,
    12px 2px, 2px 12px !important;
}

/* ═════════════════════════════════════════════════════════════════════
   Restore dialog framing. The flat-aesthetic cascade above strips
   radius + backgrounds from every .kc-* descendant; actual dialogs
   (item preview, loadout picker, welcome card, crate opening, claim
   reveal) still need their dialog chrome: scrim backdrop, rounded
   opaque card, drop shadow. These rules come after the flat block
   so at equal !important-specificity they win by source order.
   ═════════════════════════════════════════════════════════════════════ */

/* Backdrop scrim + blur on the generic dialog overlay — used by
   the Loadout picker and the item-preview modal. */
.kc-overlay {
  background: rgba(4,7,6,0.82) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}

/* Main dialog shell — restore the framed-card look when NOT in
   page mode. The kc-dialog--page variant stays flat (page doesn't
   want a card around it). */
.kc-dialog:not(.kc-dialog--page) {
  background: #101012 !important;
  border: 1px solid var(--kc-border) !important;
  border-radius: clamp(12px, 1.6vw, 16px) !important;
  box-shadow:
    0 40px 120px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.03) !important;
}

/* Item preview modal — its own framed card. */
.kc-preview {
  background: #0f0f11 !important;
  border: 1px solid var(--kc-border) !important;
  border-radius: clamp(12px, 1.4vw, 16px) !important;
  box-shadow: 0 40px 120px rgba(0,0,0,0.6) !important;
}
.kc-preview__art-frame {
  border-radius: clamp(12px, 1.6vw, 14px) !important;
}
.kc-preview__art {
  border-radius: inherit !important;
}

/* Welcome card — framed dialog with scrim backdrop. Matches what
   the welcome looked like before any flat pass. */
.kc-welcome-dialog {
  background: rgba(4,7,6,0.82) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
}
.kc-welcome-card {
  background: #101012 !important;
  border: 1px solid var(--kc-border) !important;
  border-radius: 16px !important;
  box-shadow: 0 40px 120px rgba(0,0,0,0.6) !important;
}
.kc-welcome-card__hero {
  border-top-left-radius: 16px !important;
  border-top-right-radius: 16px !important;
  overflow: hidden !important;
}
.kc-welcome-card__cta {
  border-radius: 8px !important;
}

/* Buttons inside dialogs restore a small radius so they read as
   buttons within a framed card (flat squares inside a rounded
   card look broken). Page surface buttons stay flat. */
.kc-overlay .kc-btn,
.kc-welcome-dialog .kc-btn,
.kc-preview .kc-btn {
  border-radius: 6px !important;
}

/* Preview close (×) icon button — stays a rounded affordance. */
.kc-preview__close,
.kc-welcome-card__close {
  border-radius: 8px !important;
}

/* ═════════════════════════════════════════════════════════════════════
   Unified button system. Three states, full stop:
     1. Default (any .kc-btn variant)  → primary green / black text
     2. :disabled                       → locked gray, non-interactive
     3. .kc-btn--danger                 → destructive red (sign out only)
   Dropping the primary/secondary/ghost distinction collapses "click
   this", "view this", "change this", "preview this", "claim this" into
   a single affordance — matches Kick's own 2-variant discipline. No
   more ghost outlines, no more size sub-variants driving a different
   look. Kept in this block so reverting is one delete away.
   ═════════════════════════════════════════════════════════════════════ */
.kc-btn,
.kc-btn--primary,
.kc-btn--secondary,
.kc-btn--ghost,
.kc-btn--xs,
.kc-btn--lg,
.kc-btn--block {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  padding: 8px 16px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
  background: var(--kc-primary) !important;
  color: #06140a !important;
  border: 0 !important;
  cursor: pointer !important;
  transition: background 140ms ease, color 140ms ease, transform 80ms ease !important;
  white-space: nowrap !important;
  text-transform: none !important;
  font-variant-numeric: tabular-nums;
}
.kc-btn:hover:not(:disabled),
.kc-btn--primary:hover:not(:disabled),
.kc-btn--secondary:hover:not(:disabled),
.kc-btn--ghost:hover:not(:disabled) {
  background: var(--kc-primary-soft) !important;
}
.kc-btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* Locked state — disabled + the old "Not Ready" / "No Tokens" /
   "Already claimed" affordances all resolve to the same gray. */
.kc-btn:disabled,
.kc-btn--primary:disabled,
.kc-btn--secondary:disabled,
.kc-btn--ghost:disabled {
  background: var(--kc-surface-1) !important;
  color: var(--kc-muted-dim) !important;
  cursor: not-allowed !important;
  pointer-events: none;
}

/* Destructive — reserved for Sign out. Red surface, off-white text. */
.kc-btn--danger,
.kc-btn--danger:disabled {
  background: var(--kc-danger) !important;
  color: #140505 !important;
}
.kc-btn--danger:hover:not(:disabled) {
  background: #ff8585 !important;
}

/* Block-width helper stays size-only — no visual change. */
.kc-btn--block {
  width: 100% !important;
  display: flex !important;
}

/* Full-size button variant for hero CTAs (Sign in, Open Crate) —
   bigger target, same look. */
.kc-btn--lg {
  padding: 14px 28px !important;
  font-size: 16px !important;
}

/* Compact button variant for inline claims inside cards. */
.kc-btn--xs {
  padding: 5px 10px !important;
  font-size: 12px !important;
}

/* Inside dialog contexts, the button gains its 6px radius back —
   already declared above, this block re-affirms priority. */
.kc-overlay .kc-btn,
.kc-welcome-dialog .kc-btn,
.kc-preview .kc-btn {
  border-radius: 6px !important;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .kc-overlay,
  .kc-dialog,
  .kc-page-surface,
  .kc-co,
  .kc-co__strip--animated,
  .kc-co__crate-svg,
  .kc-co__crate-halo,
  .kc-co__spark,
  .kc-co__flash,
  .kc-co__dock,
  .kc-co__dock-slot,
  .kc-co__finale,
  .kc-unlock,
  .kc-card,
  .kc-crate,
  .kc-cat,
  .kc-quest,
  .kc-tier,
  .kc-bp__claim-all,
  .kc-sidebar-btn {
    animation: none !important;
    transition: none !important;
  }
  .kc-crate[data-ready="true"] .kc-crate-glyph,
  .kc-bp__hero-art,
  .kc-sidebar-ready-dot {
    animation: none !important;
  }
}

/* ═════════════════════════════════════════════════════════════════════
   Emote picker / quick-emotes / chat rewriter
   ═════════════════════════════════════════════════════════════════════ */
.kc-epkr-art,
.kc-qe-art {
  display: inline-block;
  line-height: 0;
}
.kc-epkr-art > svg,
.kc-qe-art > svg {
  width: 100%;
  height: 100%;
  display: block;
}
#kc-emote-picker-tab svg {
  width: 28px;
  height: 28px;
}
#kc-emote-picker-section [data-kc-emote-slug]:not([disabled]) {
  cursor: pointer;
}
#kc-emote-picker-section [data-kc-emote-slug][disabled] {
  cursor: help;
}
#kc-quick-row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
  margin-right: 4px;
  border-right: 1px solid rgba(83, 252, 24, 0.18);
}
#kc-quick-row:empty {
  display: none;
}
.kc-chat-emote {
  display: inline-block;
  vertical-align: middle;
  width: 1.6em;
  height: 1.6em;
  margin: 0 1px;
  line-height: 0;
}
.kc-chat-emote > svg {
  width: 100%;
  height: 100%;
  display: block;
}
`;
