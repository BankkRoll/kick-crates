import { isExtensionContextAlive } from "../../chromeSafe.js";

const STORAGE_KEY = "kc_emote_recency_v1";

export type RecencyMap = Record<string, number>;

/** Reads the caller's local recency map (`slug` → last-used epoch ms). Returns `{}` if storage is unreachable. */
export async function readRecency(): Promise<RecencyMap> {
  if (!isExtensionContextAlive()) return {};
  try {
    const out = await chrome.storage.local.get(STORAGE_KEY);
    const val = out[STORAGE_KEY];
    if (val && typeof val === "object") return val as RecencyMap;
    return {};
  } catch {
    return {};
  }
}

/** Records that `slug` was used at `at` ms, trimming the map to the top 32 most recent entries. */
export async function recordRecency(
  slug: string,
  at: number = Date.now(),
): Promise<void> {
  if (!isExtensionContextAlive()) return;
  try {
    const current = await readRecency();
    current[slug] = at;
    const entries = Object.entries(current)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 32);
    const trimmed: RecencyMap = {};
    for (const [k, v] of entries) trimmed[k] = v;
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
  } catch {}
}

/** Subscribes to `chrome.storage.local` changes scoped to the recency key. Returns a teardown. */
export function onRecencyChange(
  handler: (next: RecencyMap) => void,
): () => void {
  if (!isExtensionContextAlive()) return () => {};
  function listener(
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) {
    if (area !== "local") return;
    if (!(STORAGE_KEY in changes)) return;
    const next = changes[STORAGE_KEY]!.newValue;
    handler(next && typeof next === "object" ? (next as RecencyMap) : {});
  }
  try {
    chrome.storage.onChanged.addListener(listener);
  } catch {
    return () => {};
  }
  return () => {
    try {
      chrome.storage.onChanged.removeListener(listener);
    } catch {}
  };
}

/** Ordered slugs, most-recently-used first, filtered to `ownedSlugs` and capped at `limit`. */
export function topRecent(
  recency: RecencyMap,
  ownedSlugs: Set<string>,
  limit: number,
): string[] {
  return Object.entries(recency)
    .filter(([slug]) => ownedSlugs.has(slug))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => slug);
}
