import { useMemo, useState } from "preact/hooks";

import type { Id } from "../../../../../../convex/_generated/dataModel.js";
import { CloseIcon } from "../../icons.jsx";
import { inlineSvg } from "../../svgUri.js";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type ItemType = "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";

type SeasonItem = {
  _id: Id<"items">;
  slug: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  assetSvg: string;
};

type InventoryRow = {
  inventoryId: Id<"inventory">;
  itemId: Id<"items">;
};

/** Equipped-item ids keyed by slot. A `null` on any slot means "unequipped" — matches the backend's expectation that omitted fields clear the slot. */
export type LoadoutSlots = {
  badgeItemId?: Id<"items"> | null;
  nameColorItemId?: Id<"items"> | null;
  profileCardItemId?: Id<"items"> | null;
  chatFlairItemId?: Id<"items"> | null;
};

const SLOTS: Array<{ key: keyof LoadoutSlots; label: string; type: ItemType }> =
  [
    { key: "badgeItemId", label: "Badge", type: "badge" },
    { key: "nameColorItemId", label: "Name Color", type: "nameColor" },
    { key: "profileCardItemId", label: "Profile Card", type: "profileCard" },
    { key: "chatFlairItemId", label: "Chat Flair", type: "chatFlair" },
  ];

/**
 * "Loadout" tab — four equippable slots (badge, name color, profile
 * card, chat flair) plus a modal item picker per slot.
 *
 * The panel is purely presentational: equipping an item calls
 * `props.onEquip(slot, itemId)` (or `null` to clear). The picker grid
 * only enables items the user actually owns, with a dashed "None" card
 * as the first entry so the slot can always be cleared even when the
 * user owns every item for that type.
 */
export function LoadoutPanel(props: {
  items: SeasonItem[];
  inventory: InventoryRow[];
  loadout: LoadoutSlots | null;
  onEquip: (slot: keyof LoadoutSlots, itemId: Id<"items"> | null) => void;
}) {
  const [picker, setPicker] = useState<keyof LoadoutSlots | null>(null);
  const itemsById = useMemo(() => {
    const m = new Map<string, SeasonItem>();
    for (const it of props.items) m.set(it._id as unknown as string, it);
    return m;
  }, [props.items]);
  const ownedIds = useMemo(
    () => new Set(props.inventory.map((r) => r.itemId as unknown as string)),
    [props.inventory],
  );

  return (
    <div class="kc-panel">
      <div class="kc-section">
        <div class="kc-section__eyebrow">Equipped</div>
        <h2 class="kc-section__title">Loadout</h2>
        <div class="kc-loadout">
          {SLOTS.map((slot) => {
            const equippedId = props.loadout?.[slot.key] ?? null;
            const equipped = equippedId
              ? itemsById.get(equippedId as unknown as string) ?? null
              : null;
            return (
              <div class="kc-slot">
                <div
                  class="kc-slot__preview"
                  dangerouslySetInnerHTML={inlineSvg(equipped?.assetSvg)}
                />
                <div class="kc-slot__meta">
                  <div class="kc-slot__label">{slot.label}</div>
                  <div
                    class={
                      "kc-slot__name " +
                      (!equipped ? "kc-slot__name--empty" : "")
                    }
                  >
                    {equipped ? equipped.name : "None equipped"}
                  </div>
                  <button
                    class="kc-btn kc-btn--secondary kc-btn--xs"
                    onClick={() => setPicker(slot.key)}
                  >
                    Change
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {picker ? (
        <Picker
          slotKey={picker}
          items={props.items.filter(
            (it) => it.type === SLOTS.find((s) => s.key === picker)!.type,
          )}
          ownedIds={ownedIds}
          currentId={(props.loadout?.[picker] ?? null) as Id<"items"> | null}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            props.onEquip(picker, id);
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Picker(props: {
  slotKey: keyof LoadoutSlots;
  items: SeasonItem[];
  ownedIds: Set<string>;
  currentId: Id<"items"> | null;
  onClose: () => void;
  onPick: (id: Id<"items"> | null) => void;
}) {
  return (
    <div
      class="kc-overlay"
      style={{ zIndex: 2147482500 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="kc-dialog" style={{ maxWidth: "640px" }}>
        <div class="kc-head">
          <div class="kc-head__left">
            <div class="kc-brand__sub">Equip</div>
          </div>
          <div class="kc-brand">
            <div class="kc-brand__wordmark">SELECT</div>
          </div>
          <div class="kc-head__right">
            <button class="kc-close" onClick={props.onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
        </div>
        <div class="kc-panel">
          <div class="kc-coll__grid">
            <button
              class="kc-item"
              data-owned="true"
              onClick={() => props.onPick(null)}
              title="None"
              style={{ border: "1.5px dashed var(--kc-border)" }}
            >
              <div class="kc-item__art" style={{ background: "transparent" }} />
            </button>
            {props.items.map((it) => {
              const owned = props.ownedIds.has(it._id as unknown as string);
              return (
                <button
                  class={"kc-item kc-item--" + it.rarity}
                  data-owned={owned ? "true" : "false"}
                  disabled={!owned}
                  onClick={() => owned && props.onPick(it._id)}
                  title={it.name}
                >
                  <div
                    class="kc-item__art"
                    dangerouslySetInnerHTML={inlineSvg(it.assetSvg)}
                  />
                  <div class="kc-item__rarity-dot" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
