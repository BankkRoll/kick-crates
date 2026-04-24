import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { applyAuthToReactive, getReactiveClient } from "../../convex.js";
import { isExtensionContextAlive } from "../../chromeSafe.js";
import {
  onRecencyChange,
  readRecency,
  recordRecency,
  topRecent,
  type RecencyMap,
} from "./recency.js";

export type EmoteRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Picker row: every active-season emote, with `owned` flag and (when owned) duplicate count. */
export type PickerEmote = {
  itemId: Id<"items">;
  slug: string;
  name: string;
  rarity: EmoteRarity;
  assetSvg: string;
  description: string;
  sellValue: number;
  owned: boolean;
  duplicates: number;
};

/** In-memory snapshot the picker, quick-row, and chat rewriter all read from. */
export type EmoteSnapshot = {
  all: PickerEmote[];
  ownedBySlug: Map<string, PickerEmote>;
  recency: RecencyMap;
  recentOwnedSlugs: string[];
};

const QUICK_ROW_LIMIT = 10;

type SeasonItemRow = {
  _id: Id<"items">;
  slug: string;
  name: string;
  type: "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";
  rarity: EmoteRarity;
  assetSvg: string;
  description?: string;
  sellValue: number;
  retired: boolean;
};

type InventoryRow = {
  itemId: Id<"items">;
  duplicates: number;
};

let latestSeasonItems: SeasonItemRow[] = [];
let latestInventory: InventoryRow[] = [];
let latestRecency: RecencyMap = {};
let snapshot: EmoteSnapshot = freshSnapshot();
let running = false;
let teardown: (() => void) | null = null;
const listeners = new Set<(s: EmoteSnapshot) => void>();

function freshSnapshot(): EmoteSnapshot {
  return {
    all: [],
    ownedBySlug: new Map(),
    recency: {},
    recentOwnedSlugs: [],
  };
}

function recompute(): void {
  const ownedDupes = new Map<string, number>();
  for (const inv of latestInventory) {
    ownedDupes.set(inv.itemId as unknown as string, inv.duplicates);
  }
  const all: PickerEmote[] = [];
  const ownedBySlug = new Map<string, PickerEmote>();
  for (const it of latestSeasonItems) {
    if (it.type !== "emote") continue;
    if (it.retired) continue;
    const owned = ownedDupes.has(it._id as unknown as string);
    const duplicates = ownedDupes.get(it._id as unknown as string) ?? 0;
    const row: PickerEmote = {
      itemId: it._id,
      slug: it.slug,
      name: it.name,
      rarity: it.rarity,
      assetSvg: it.assetSvg,
      description: it.description ?? "",
      sellValue: it.sellValue,
      owned,
      duplicates,
    };
    all.push(row);
    if (owned) ownedBySlug.set(it.slug, row);
  }
  all.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
  const ownedSlugSet = new Set(ownedBySlug.keys());
  const recentOwnedSlugs = topRecent(
    latestRecency,
    ownedSlugSet,
    QUICK_ROW_LIMIT,
  );
  snapshot = { all, ownedBySlug, recency: latestRecency, recentOwnedSlugs };
  for (const l of listeners) l(snapshot);
}

function rarityRank(r: EmoteRarity): number {
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

/**
 * Boots the emote state machine: loads recency from `chrome.storage.local`,
 * opens reactive Convex subscriptions to `api.seasons.listItems` and
 * `api.users.myInventory`, and re-applies auth on session changes so the
 * inventory subscription follows the current user. Idempotent — calling it
 * more than once is a no-op until {@link stopEmoteState} runs.
 */
export function startEmoteState(): void {
  if (running) return;
  running = true;
  const unsubs: Array<() => void> = [];
  let cancelled = false;

  void readRecency().then((r) => {
    if (cancelled) return;
    latestRecency = r;
    recompute();
  });
  unsubs.push(
    onRecencyChange((next) => {
      latestRecency = next;
      recompute();
    }),
  );

  (async () => {
    await applyAuthToReactive();
    if (cancelled) return;
    const client = getReactiveClient();
    if (!client) return;
    unsubs.push(
      client.onUpdate(api.seasons.listItems, {}, (rows) => {
        latestSeasonItems = ((rows as SeasonItemRow[] | null) ?? []).slice();
        recompute();
      }),
    );
    unsubs.push(
      client.onUpdate(api.users.myInventory, {}, (rows) => {
        const raw =
          (rows as Array<{ itemId: Id<"items">; duplicates: number }> | null) ??
          [];
        latestInventory = raw.map((r) => ({
          itemId: r.itemId,
          duplicates: r.duplicates,
        }));
        recompute();
      }),
    );
  })().catch(() => {});

  function onStorageAuthChange(
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) {
    if (area !== "local") return;
    if (!("kc_session_v1" in changes)) return;
    applyAuthToReactive().catch(() => {});
  }
  if (isExtensionContextAlive()) {
    chrome.storage.onChanged.addListener(onStorageAuthChange);
    unsubs.push(() => {
      try {
        chrome.storage.onChanged.removeListener(onStorageAuthChange);
      } catch {}
    });
  }

  teardown = () => {
    cancelled = true;
    for (const u of unsubs) {
      try {
        u();
      } catch {}
    }
  };
}

/** Tears down the Convex subscriptions and clears the cached snapshot. */
export function stopEmoteState(): void {
  if (!running) return;
  running = false;
  const t = teardown;
  teardown = null;
  if (t) t();
  latestSeasonItems = [];
  latestInventory = [];
  latestRecency = {};
  snapshot = freshSnapshot();
  for (const l of listeners) l(snapshot);
}

/** Current in-memory snapshot; safe to read synchronously from any injector. */
export function getEmoteSnapshot(): EmoteSnapshot {
  return snapshot;
}

/**
 * Subscribes to snapshot changes and immediately invokes the listener with
 * the current state. Returns a teardown that deregisters the listener.
 */
export function subscribeEmotes(
  listener: (s: EmoteSnapshot) => void,
): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

/** Records a use of `slug` in the local recency store (fire-and-forget). */
export function noteEmoteUse(slug: string): void {
  void recordRecency(slug);
}
