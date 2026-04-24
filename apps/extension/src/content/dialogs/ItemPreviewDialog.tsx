import { h } from "preact";
import { useEffect } from "preact/hooks";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { CloseIcon } from "../icons.jsx";
import { inlineSvg } from "../svgUri.js";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type ItemType = "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";

/** Projection of an item row sufficient to render a preview card — only the fields the dialog actually reads. */
export type PreviewItem = {
  _id: Id<"items">;
  slug: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  assetSvg: string;
  animated: boolean;
  description: string;
  sellValue?: number;
};

/** One label/value row shown below the hero; `null`/`undefined` entries are filtered so callers can conditionally include rows without branching. */
export type PreviewStat = {
  label: string;
  value: string;
  accent?: "primary" | "warn" | "muted";
};

/**
 * Shared item preview modal used across Battle Pass, Collection, and
 * Loadout panels.
 *
 * Renders the item's art, rarity-tinted frame, type/rarity line,
 * description, a filterable list of stat rows, and up to three action
 * buttons: the panel's primary `action` (e.g. "Claim tier", "Equip"),
 * an intrinsic "Sell 1 duplicate" button that surfaces automatically
 * whenever `duplicates > 0` and the item carries a positive `sellValue`
 * (so callers can't accidentally forget the sell affordance on a new
 * surface), and the built-in "Close". Closes on Escape, backdrop click,
 * the X button, or the "Close" button — any of which invokes
 * `props.onClose`.
 */
export function ItemPreviewDialog(props: {
  item: PreviewItem;
  eyebrow?: string;
  stats?: Array<PreviewStat | null | undefined>;
  action?: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
  } | null;
  owned?: boolean;
  duplicates?: number;
  onSell?: (itemId: Id<"items">) => void;
  sellBusy?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rarityColor = rarityHex(props.item.rarity);
  const filteredStats = (props.stats ?? []).filter(
    (s): s is PreviewStat => s !== null && s !== undefined,
  );
  const duplicates = props.duplicates ?? 0;
  const sellValue = props.item.sellValue ?? 0;
  // Show the Sell control whenever the user owns the item AND the item
  // has a scrap value AND a sell handler is wired. When `duplicates === 0`
  // the button renders in its locked state with a copy explaining why —
  // silently hiding it before made the "need 2+ copies to sell" mechanic
  // invisible to users who only had one copy.
  const showSell =
    props.owned === true && sellValue > 0 && props.onSell !== undefined;
  const canSell = showSell && duplicates > 0;

  return (
    <div
      class="kc-overlay kc-preview-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        class={"kc-preview kc-preview--" + props.item.rarity}
        role="dialog"
        aria-modal="true"
        aria-label={props.item.name}
        style={{ "--kc-preview-color": rarityColor } as h.JSX.CSSProperties}
      >
        <button
          class="kc-preview__close"
          aria-label="Close preview"
          onClick={props.onClose}
          type="button"
        >
          <CloseIcon />
        </button>

        <div class="kc-preview__body">
          <div class="kc-preview__art-frame">
            <div
              class={"kc-preview__art kc-preview__art--" + props.item.rarity}
              dangerouslySetInnerHTML={inlineSvg(props.item.assetSvg)}
            />
          </div>

          <div class="kc-preview__meta">
            {props.eyebrow ? (
              <div class="kc-preview__eyebrow">{props.eyebrow}</div>
            ) : null}
            <div class="kc-preview__rarity" style={{ color: rarityColor }}>
              <span class="kc-preview__rarity-dot" />
              {props.item.rarity} · {friendlyType(props.item.type)}
            </div>
            <h2 class="kc-preview__name">{props.item.name}</h2>
            {props.item.description ? (
              <p class="kc-preview__desc">{props.item.description}</p>
            ) : null}

            {filteredStats.length > 0 ? (
              <dl class="kc-preview__stats">
                {filteredStats.map((s) => (
                  <div
                    class={
                      "kc-preview__stat" +
                      (s.accent ? " kc-preview__stat--" + s.accent : "")
                    }
                  >
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div class="kc-preview__actions">
              {props.action ? (
                <button
                  class="kc-btn kc-btn--primary"
                  disabled={props.action.disabled}
                  onClick={() => {
                    props.action!.onClick();
                  }}
                >
                  {props.action.label}
                </button>
              ) : null}
              {showSell ? (
                <button
                  class="kc-btn"
                  disabled={!canSell || props.sellBusy}
                  onClick={() => canSell && props.onSell!(props.item._id)}
                  type="button"
                  title={
                    canSell
                      ? "Sell one duplicate copy for " + sellValue + " scrap"
                      : "You need 2+ copies to sell — the first copy is permanent"
                  }
                >
                  {canSell
                    ? "Sell 1 duplicate · +" + sellValue + " scrap"
                    : "No duplicates to sell"}
                </button>
              ) : null}
              <button
                class="kc-btn kc-btn--ghost"
                onClick={props.onClose}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function rarityHex(r: Rarity): string {
  switch (r) {
    case "common":
      return "#b0b3b5";
    case "uncommon":
      return "#78e48c";
    case "rare":
      return "#66d4ff";
    case "epic":
      return "#c78bff";
    case "legendary":
      return "#ffc53d";
  }
}

function friendlyType(t: ItemType): string {
  switch (t) {
    case "emote":
      return "Chat Emote";
    case "badge":
      return "Chat Badge";
    case "nameColor":
      return "Name Color";
    case "profileCard":
      return "Profile Card";
    case "chatFlair":
      return "Chat Flair";
  }
}
