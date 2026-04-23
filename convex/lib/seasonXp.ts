// Season XP accounting. A user's seasonXp is scoped to user.currentSeasonId;
// when the active season rolls over, seasonXp resets to 0 and currentSeasonId
// is patched here. grantXp returns computed counters only — the caller owns
// the user-doc write so XP grants can be batched with other mutations in the
// same transaction.
import type { MutationCtx } from "../_generated/server.js";
import type { Doc, Id } from "../_generated/dataModel.js";

type ActiveSeason = Doc<"seasons">;

async function getActiveSeason(ctx: MutationCtx): Promise<ActiveSeason | null> {
  return await ctx.db
    .query("seasons")
    .withIndex("by_active", (q) => q.eq("active", true))
    .first();
}

/** Aligns user.currentSeasonId with the active season, resetting seasonXp to 0 on rollover. */
export async function syncSeasonXp(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<{
  seasonXp: number;
  activeSeasonId: Id<"seasons"> | null;
}> {
  const active = await getActiveSeason(ctx);
  if (!active) {
    return { seasonXp: user.seasonXp, activeSeasonId: null };
  }
  if (user.currentSeasonId === active._id) {
    return { seasonXp: user.seasonXp, activeSeasonId: active._id };
  }
  await ctx.db.patch(user._id, {
    currentSeasonId: active._id,
    seasonXp: 0,
  });
  return { seasonXp: 0, activeSeasonId: active._id };
}

/** Computed counters from an XP grant; caller must persist. */
export type XpGrantResult = {
  newTotalXp: number;
  newSeasonXp: number;
  newLevel: number;
  activeSeasonId: Id<"seasons"> | null;
};

/** Computes updated lifetime and season XP counters (handles season rollover); does not write the user doc. */
export async function grantXp(
  ctx: MutationCtx,
  user: Doc<"users">,
  xpDelta: number,
  levelFromTotalXp: (total: number) => number,
): Promise<XpGrantResult> {
  const { seasonXp, activeSeasonId } = await syncSeasonXp(ctx, user);
  const newTotalXp = user.totalXp + xpDelta;
  const newSeasonXp = seasonXp + xpDelta;
  const newLevel = levelFromTotalXp(newTotalXp);
  return { newTotalXp, newSeasonXp, newLevel, activeSeasonId };
}
