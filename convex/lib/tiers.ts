// Battle-pass tier payout layout. Items are sorted rarest-first (ties broken
// by slug for determinism), then assigned from the top tier downward so the
// highest tier always gets the rarest available item. If items.length is less
// than tierCount, the sorted list cycles — so lower tiers repeat the rarer
// items rather than leaving gaps. Retired items are filtered out.
import type { Doc } from "../_generated/dataModel.js";
import type { Rarity } from "./constants.js";

const RARITY_WEIGHT: Record<Rarity, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  uncommon: 1,
  common: 0,
};

/** Battle-pass tier payout: which item unlocks at which tier. */
export type TierReward = {
  tier: number;
  itemId: Doc<"items">["_id"];
  rarity: Rarity;
};

/** Builds tier rewards back-to-front so rarest items land on highest tiers; cycles items if fewer exist than tiers. */
export function computeTierRewards(
  items: Doc<"items">[],
  tierCount: number,
): TierReward[] {
  const sorted = items
    .filter((i) => !i.retired)
    .slice()
    .sort((a, b) => {
      const d = RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity];
      if (d !== 0) return d;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });

  const rewards: TierReward[] = [];
  for (let i = 0; i < tierCount; i++) {
    const pick = sorted[i % Math.max(1, sorted.length)];
    if (!pick) break;
    rewards.push({
      tier: tierCount - i,
      itemId: pick._id,
      rarity: pick.rarity,
    });
  }
  rewards.sort((a, b) => a.tier - b.tier);
  return rewards;
}

/** Cumulative season XP needed to unlock a given tier. */
export function xpRequiredForTier(tier: number, xpPerTier: number): number {
  return Math.max(0, tier) * xpPerTier;
}
