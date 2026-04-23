import { useMemo, useState } from "preact/hooks";
import { h } from "preact";

import type { Id } from "../../../../../../convex/_generated/dataModel.js";
import {
  CategoryEmoteIcon,
  CategoryNameColorIcon,
  CategoryChatFlairIcon,
  CategoryBadgeIcon,
  CategoryProfileCardIcon,
} from "../../icons.js";
import { inlineSvg } from "../../svgUri.js";
import { ItemPreviewDialog } from "../ItemPreviewDialog.js";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type ItemType = "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";

type SeasonItem = {
  _id: Id<"items">;
  slug: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  assetSvg: string;
  animated: boolean;
  description?: string;
  sellValue?: number;
};

type InventoryRow = {
  inventoryId: Id<"inventory">;
  itemId: Id<"items">;
  duplicates: number;
};

const CATEGORIES: Array<{
  type: ItemType;
  label: string;
  Icon: () => h.JSX.Element;
}> = [
  { type: "emote", label: "Emotes", Icon: CategoryEmoteIcon },
  { type: "badge", label: "Badges", Icon: CategoryBadgeIcon },
  { type: "nameColor", label: "Name Colors", Icon: CategoryNameColorIcon },
  { type: "chatFlair", label: "Chat Flairs", Icon: CategoryChatFlairIcon },
  {
    type: "profileCard",
    label: "Profile Cards",
    Icon: CategoryProfileCardIcon,
  },
];

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

/**
 * "Collection" tab — owned-vs-available grid for the active season.
 *
 * Three sections are rendered: a category switcher (one per cosmetic
 * type) with `owned/total` counters, a by-rarity breakdown, and the
 * grid of items for the currently-selected category with duplicate
 * badges and a tap-to-preview interaction. All aggregates are memoized
 * against `props.items` / `props.inventory` so category switching
 * doesn't re-walk the arrays.
 */
export function CollectionPanel(props: {
  items: SeasonItem[];
  inventory: InventoryRow[];
  onSell: (itemId: Id<"items">) => void;
  sellBusy: boolean;
}) {
  const [selectedType, setSelectedType] = useState<ItemType>("emote");
  const [previewItemId, setPreviewItemId] = useState<Id<"items"> | null>(null);

  const ownedIds = useMemo(() => {
    const m = new Map<string, InventoryRow>();
    for (const r of props.inventory) m.set(r.itemId as unknown as string, r);
    return m;
  }, [props.inventory]);

  const byType = useMemo(() => {
    const m: Record<ItemType, SeasonItem[]> = {
      emote: [],
      nameColor: [],
      chatFlair: [],
      badge: [],
      profileCard: [],
    };
    for (const it of props.items) m[it.type].push(it);
    return m;
  }, [props.items]);

  const byRarity = useMemo(() => {
    const m: Record<Rarity, { total: number; owned: number }> = {
      common: { total: 0, owned: 0 },
      uncommon: { total: 0, owned: 0 },
      rare: { total: 0, owned: 0 },
      epic: { total: 0, owned: 0 },
      legendary: { total: 0, owned: 0 },
    };
    for (const it of props.items) {
      m[it.rarity].total++;
      if (ownedIds.has(it._id as unknown as string)) m[it.rarity].owned++;
    }
    return m;
  }, [props.items, ownedIds]);

  const totalOwned = props.inventory.length;
  const totalItems = props.items.length;
  const selectedItems = byType[selectedType];

  return (
    <div class="kc-panel">
      <div class="kc-coll__cats">
        {CATEGORIES.map((cat) => {
          const catItems = byType[cat.type];
          const catOwned = catItems.filter((it) =>
            ownedIds.has(it._id as unknown as string),
          ).length;
          const selected = selectedType === cat.type;
          return (
            <button
              class="kc-cat"
              data-selected={selected ? "true" : "false"}
              onClick={() => setSelectedType(cat.type)}
            >
              <div class="kc-cat__icon">
                <cat.Icon />
              </div>
              <div class="kc-cat__label">{cat.label}</div>
              <div class="kc-cat__count">
                <span class="kc-cat__count-num">{catOwned}</span>
                <span class="kc-cat__count-total">
                  /{catItems.length || "?"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div class="kc-section">
        <div class="kc-section__eyebrow">Breakdown</div>
        <h2 class="kc-section__title">By Rarity</h2>
        <div class="kc-rarity-block">
          {RARITIES.map((r) => {
            const row = byRarity[r];
            const pct = row.total > 0 ? (row.owned / row.total) * 100 : 0;
            return (
              <div class={"kc-rarity-row kc-rarity-row--" + r}>
                <div class="kc-rarity-row__name">{r}</div>
                <div class="kc-rarity-row__count">
                  {row.owned}/{row.total}
                </div>
                <div class="kc-rarity-row__track">
                  <div
                    class="kc-rarity-row__fill"
                    style={{ width: pct.toFixed(0) + "%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div class="kc-section">
        <div class="kc-section__eyebrow">
          {totalOwned}/{totalItems} Unlocked
        </div>
        <h2 class="kc-section__title">
          {CATEGORIES.find((c) => c.type === selectedType)?.label}
        </h2>
        <div class="kc-coll__grid">
          {selectedItems.map((it) => {
            const inv = ownedIds.get(it._id as unknown as string);
            const owned = inv !== undefined;
            return (
              <button
                type="button"
                class={"kc-item kc-item--" + it.rarity}
                data-owned={owned ? "true" : "false"}
                title={it.name + " · " + it.rarity}
                onClick={() => setPreviewItemId(it._id)}
              >
                <div
                  class="kc-item__art"
                  dangerouslySetInnerHTML={inlineSvg(it.assetSvg)}
                />
                <div class="kc-item__rarity-dot" />
                {owned && inv && inv.duplicates > 0 ? (
                  <div class="kc-item__dup">×{inv.duplicates + 1}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {previewItemId !== null
        ? (() => {
            const it = props.items.find((x) => x._id === previewItemId);
            if (!it) return null;
            const inv = ownedIds.get(it._id as unknown as string);
            const owned = inv !== undefined;
            const sellable =
              owned &&
              inv !== undefined &&
              inv.duplicates > 0 &&
              typeof it.sellValue === "number" &&
              it.sellValue > 0;
            return (
              <ItemPreviewDialog
                item={{
                  _id: it._id,
                  slug: it.slug,
                  name: it.name,
                  type: it.type,
                  rarity: it.rarity,
                  assetSvg: it.assetSvg,
                  animated: it.animated,
                  description: it.description ?? "",
                  ...(typeof it.sellValue === "number"
                    ? { sellValue: it.sellValue }
                    : {}),
                }}
                eyebrow="Collection"
                stats={[
                  {
                    label: "Status",
                    value: owned ? "Owned" : "Locked",
                    accent: owned ? "primary" : "warn",
                  },
                  owned && inv && inv.duplicates > 0
                    ? {
                        label: "Copies",
                        value: "×" + (inv.duplicates + 1),
                        accent: "muted",
                      }
                    : null,
                  typeof it.sellValue === "number" && it.sellValue > 0
                    ? {
                        label: "Sell value",
                        value: "+" + it.sellValue + " scrap / copy",
                        accent: "muted",
                      }
                    : null,
                ]}
                action={
                  sellable
                    ? {
                        label:
                          "Sell 1 duplicate · +" +
                          (it.sellValue ?? 0) +
                          " scrap",
                        disabled: props.sellBusy,
                        onClick: () => props.onSell(it._id),
                      }
                    : null
                }
                onClose={() => setPreviewItemId(null)}
              />
            );
          })()
        : null}
    </div>
  );
}
