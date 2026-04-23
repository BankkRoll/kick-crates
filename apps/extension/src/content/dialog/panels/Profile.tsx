import { applyAuthToReactive, getReactiveClient } from "../../../convex.js";
import { useEffect, useState } from "preact/hooks";

import type { Id } from "../../../../../../convex/_generated/dataModel.js";
import { api } from "../../../../../../convex/_generated/api.js";
import { inlineSvg } from "../../svgUri.js";

type Me = {
  id: Id<"users">;
  kickUsername: string;
  kickProfilePicture: string | null;
  totalXp: number;
  level: number;
  scrap: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressToNextLevel: number;
};

type InventoryRow = {
  inventoryId: Id<"inventory">;
  itemId: Id<"items">;
  duplicates: number;
  acquiredAt: number;
  acquiredFrom?: "crate" | "quest" | "pass" | "promo" | "admin";
  item: {
    slug: string;
    name: string;
    type: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    assetSvg: string;
    animated: boolean;
  };
};

function sourceLabel(src?: string): string {
  switch (src) {
    case "crate":
      return "Crate";
    case "quest":
      return "Quest";
    case "pass":
      return "Battle Pass";
    case "promo":
      return "Gift";
    case "admin":
      return "Admin";
    default:
      return "";
  }
}

type DailyUsage = {
  dateKey: string;
  totalSeconds: number;
  totalXp: number;
  distinctChannels: string[];
};

/**
 * "Profile" tab — user stats card, recent-drop history, and the
 * sign-out control.
 *
 * Subscribes to `api.users.myDailyUsage` on mount so the "Today Watched"
 * tile updates live — the dashboard bootstrap doesn't include daily
 * usage because it's too volatile to cache. Everything else is derived
 * from the parent-owned `me` / `inventory` / `totalItemsInSeason`
 * props so this panel doesn't need its own Convex subscriptions for
 * those values.
 */
export function ProfilePanel(props: {
  me: Me | null;
  username: string;
  avatar: string | null;
  inventory: InventoryRow[];
  totalItemsInSeason: number;
  onLogout: () => void;
}) {
  const [daily, setDaily] = useState<DailyUsage | null>(null);

  useEffect(() => {
    let active = true;
    let unsub: (() => void) | null = null;
    (async () => {
      await applyAuthToReactive();
      if (!active) return;
      const client = getReactiveClient();
      if (!client) return;
      unsub = client.onUpdate(api.users.myDailyUsage, {}, (v) => {
        if (!active) return;
        setDaily((v as DailyUsage | null) ?? null);
      });
    })();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  const ownedItems = props.inventory.length;
  const totalItems = props.totalItemsInSeason || 0;
  const collectionPct =
    totalItems > 0 ? Math.round((ownedItems / totalItems) * 100) : 0;
  const totalDupes = props.inventory.reduce((s, r) => s + r.duplicates, 0);
  const rarestItem = [...props.inventory].sort(
    (a, b) => rarityRank(b.item.rarity) - rarityRank(a.item.rarity),
  )[0];
  const recentDrops = [...props.inventory]
    .sort((a, b) => b.acquiredAt - a.acquiredAt)
    .slice(0, 6);
  const watchMinutes = Math.floor((daily?.totalSeconds ?? 0) / 60);
  const channelsToday = daily?.distinctChannels.length ?? 0;

  return (
    <div class="kc-panel">
      <div class="kc-profile-head">
        <div
          class="kc-avatar kc-avatar--xl"
          style={{
            backgroundImage: props.avatar
              ? "url(" + props.avatar + ")"
              : "none",
          }}
        />
        <div class="kc-profile-head__meta">
          <div class="kc-profile-head__handle">@{props.username}</div>
          <div class="kc-profile-head__level-row">
            <span class="kc-profile-head__level-num">
              Level {props.me?.level ?? 1}
            </span>
            <span class="kc-profile-head__xp">
              {(props.me?.xpIntoLevel ?? 0).toLocaleString()} /{" "}
              {(props.me?.xpForNextLevel ?? 0).toLocaleString()} XP
            </span>
          </div>
          <div class="kc-profile-head__track">
            <div
              class="kc-profile-head__fill"
              style={{
                width:
                  (
                    Math.max(
                      0,
                      Math.min(1, props.me?.progressToNextLevel ?? 0),
                    ) * 100
                  ).toFixed(1) + "%",
              }}
            />
          </div>
        </div>
        <button
          class="kc-btn kc-btn--ghost kc-btn--xs"
          onClick={props.onLogout}
        >
          Sign out
        </button>
      </div>

      <div class="kc-section">
        <div class="kc-section__eyebrow">Stats</div>
        <h2 class="kc-section__title">By the Numbers</h2>
        <div class="kc-stats-grid">
          <StatTile
            label="Total XP"
            value={(props.me?.totalXp ?? 0).toLocaleString()}
            accent="xp"
          />
          <StatTile
            label="Scrap"
            value={(props.me?.scrap ?? 0).toLocaleString()}
            accent="scrap"
          />
          <StatTile
            label="Collection"
            value={ownedItems + " / " + totalItems}
            hint={collectionPct + "%"}
          />
          <StatTile label="Duplicates" value={totalDupes.toLocaleString()} />
          <StatTile
            label="Today Watched"
            value={watchMinutes + "m"}
            hint={channelsToday + " channel" + (channelsToday === 1 ? "" : "s")}
          />
          <StatTile
            label="Rarest Drop"
            value={rarestItem ? capitalize(rarestItem.item.rarity) : "—"}
            hint={rarestItem?.item.name ?? "Nothing yet"}
            accentRarity={rarestItem?.item.rarity}
          />
        </div>
      </div>

      {recentDrops.length > 0 ? (
        <div class="kc-section">
          <div class="kc-section__eyebrow">History</div>
          <h2 class="kc-section__title">Recent Drops</h2>
          <ul class="kc-recent-list">
            {recentDrops.map((row) => (
              <li class="kc-recent-row">
                <div
                  class={
                    "kc-recent-row__art kc-recent-row__art--" + row.item.rarity
                  }
                  dangerouslySetInnerHTML={inlineSvg(row.item.assetSvg)}
                />
                <div class="kc-recent-row__main">
                  <div class="kc-recent-row__name">{row.item.name}</div>
                  <div class="kc-recent-row__sub">
                    <span
                      class={
                        "kc-rarity-pill kc-rarity-pill--" + row.item.rarity
                      }
                    >
                      {row.item.rarity}
                    </span>
                    {row.acquiredFrom ? (
                      <span class="kc-recent-row__source">
                        {sourceLabel(row.acquiredFrom)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <time class="kc-recent-row__when">
                  {relative(row.acquiredAt)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div class="kc-section">
          <div class="kc-section__eyebrow">History</div>
          <h2 class="kc-section__title">Recent Drops</h2>
          <div class="kc-empty-state">
            <p class="kc-empty-state__text">
              No drops yet. Watch a stream to start earning crates.
            </p>
          </div>
        </div>
      )}

      <div class="kc-section">
        <div class="kc-section__eyebrow">About</div>
        <h2 class="kc-section__title">How it works</h2>
        <p class="kc-about-text">
          KickCrates is a third-party extension. Items shown in chat are only
          visible to other users with the extension installed. Earn XP by
          actively watching streams — no bots, no background grinding.
        </p>
      </div>
    </div>
  );
}

function StatTile(props: {
  label: string;
  value: string;
  hint?: string;
  accent?: "xp" | "scrap";
  accentRarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
}) {
  const cls =
    "kc-stat-tile" +
    (props.accent === "xp" ? " kc-stat-tile--xp" : "") +
    (props.accent === "scrap" ? " kc-stat-tile--scrap" : "") +
    (props.accentRarity ? " kc-stat-tile--" + props.accentRarity : "");
  return (
    <div class={cls}>
      <div class="kc-stat-tile__value">{props.value}</div>
      <div class="kc-stat-tile__label">{props.label}</div>
      {props.hint ? <div class="kc-stat-tile__hint">{props.hint}</div> : null}
    </div>
  );
}

function rarityRank(r: InventoryRow["item"]["rarity"]): number {
  switch (r) {
    case "common":
      return 0;
    case "uncommon":
      return 1;
    case "rare":
      return 2;
    case "epic":
      return 3;
    case "legendary":
      return 4;
  }
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function relative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}
