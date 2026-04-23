// Quest progress is keyed by (user, questDef, cadenceKey) where cadenceKey is
// a UTC day/week bucket or the literal "season" — rotation happens naturally
// on key change, not via cron reset. bumpQuestProgressInline is called from
// other mutations (watch time, crate opens) and matches by requirement.type;
// claim is the sole writer of claimed/claimedAt and the sole payout path.
// Season crate tokens from quest claims flow into crateState.tokensHeld for
// the "season" crate slug.
import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import { requireUser } from "./auth.js";
import { err } from "./lib/errors.js";
import { levelFromTotalXp } from "./lib/constants.js";
import { dayKeyUTC, weekKeyUTC, now as nowMs } from "./lib/time.js";
import { rateLimiter } from "./lib/rateLimiter.js";
import { grantXp } from "./lib/seasonXp.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";

function cadenceKeyFor(cadence: Doc<"questDef">["cadence"], at: number): string {
  switch (cadence) {
    case "daily":
      return dayKeyUTC(at);
    case "weekly":
      return weekKeyUTC(at);
    case "season":
      return "season";
  }
}

async function getOrInsertProgress(
  ctx: MutationCtx,
  userId: Id<"users">,
  def: Doc<"questDef">,
  at: number,
): Promise<Doc<"questProgress">> {
  const cadenceKey = cadenceKeyFor(def.cadence, at);
  const existing = await ctx.db
    .query("questProgress")
    .withIndex("by_user_quest_cadence", (q) =>
      q.eq("userId", userId).eq("questDefId", def._id).eq("cadenceKey", cadenceKey),
    )
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("questProgress", {
    userId,
    questDefId: def._id,
    cadenceKey,
    progressValue: 0,
    completed: false,
    claimed: false,
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("questProgress insert did not roundtrip");
  return row;
}

/** Advances progress on every active quest matching `requirementType` within the same mutation. */
export async function bumpQuestProgressInline(
  ctx: MutationCtx,
  userId: Id<"users">,
  requirementType: Doc<"questDef">["requirement"]["type"],
  delta: number,
  at: number,
): Promise<void> {
  if (delta <= 0) return;
  const dailyDefs = await ctx.db
    .query("questDef")
    .withIndex("by_cadence_active", (q) => q.eq("cadence", "daily").eq("active", true))
    .collect();
  const weeklyDefs = await ctx.db
    .query("questDef")
    .withIndex("by_cadence_active", (q) => q.eq("cadence", "weekly").eq("active", true))
    .collect();
  const seasonDefs = await ctx.db
    .query("questDef")
    .withIndex("by_cadence_active", (q) => q.eq("cadence", "season").eq("active", true))
    .collect();
  const allDefs = [...dailyDefs, ...weeklyDefs, ...seasonDefs];
  for (const def of allDefs) {
    if (def.requirement.type !== requirementType) continue;
    const prog = await getOrInsertProgress(ctx, userId, def, at);
    if (prog.completed) continue;
    const next = Math.min(prog.progressValue + delta, def.requirement.target);
    const completed = next >= def.requirement.target;
    await ctx.db.patch(prog._id, {
      progressValue: next,
      completed,
      ...(completed && !prog.completedAt ? { completedAt: at } : {}),
    });
  }
}

/** Claims a completed quest, granting XP, scrap, and any season crate tokens. */
export const claim = mutation({
  args: { questDefId: v.id("questDef") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "claimQuest", { key: user._id, throws: true });

    const def = await ctx.db.get(args.questDefId);
    if (!def || !def.active) err("INVALID_INPUT", "quest not found or inactive");

    const now = nowMs();
    const cadenceKey = cadenceKeyFor(def.cadence, now);
    const prog = await ctx.db
      .query("questProgress")
      .withIndex("by_user_quest_cadence", (q) =>
        q.eq("userId", user._id).eq("questDefId", def._id).eq("cadenceKey", cadenceKey),
      )
      .first();

    if (!prog) err("QUEST_NOT_COMPLETE");
    if (!prog.completed) err("QUEST_NOT_COMPLETE");
    if (prog.claimed) err("QUEST_ALREADY_CLAIMED");

    await ctx.db.patch(prog._id, { claimed: true, claimedAt: now });

    const { newTotalXp, newSeasonXp, newLevel } = await grantXp(
      ctx,
      user,
      def.xpReward,
      levelFromTotalXp,
    );
    const newScrap = user.scrap + def.scrapReward;
    await ctx.db.patch(user._id, {
      totalXp: newTotalXp,
      seasonXp: newSeasonXp,
      level: newLevel,
      scrap: newScrap,
      lastActiveAt: now,
    });
    await ctx.db.insert("xpEvents", {
      userId: user._id,
      source: "quest",
      amount: def.xpReward,
      newLevel,
      questDefId: def._id,
      at: now,
    });

    const tokensAwarded = def.crateTokenReward ?? 0;
    if (tokensAwarded > 0) {
      const seasonCrate = await ctx.db
        .query("crateDef")
        .withIndex("by_slug", (q) => q.eq("slug", "season"))
        .first();
      if (seasonCrate) {
        const cs = await ctx.db
          .query("crateState")
          .withIndex("by_user_crate", (q) =>
            q.eq("userId", user._id).eq("crateDefId", seasonCrate._id),
          )
          .first();
        if (cs) {
          await ctx.db.patch(cs._id, {
            tokensHeld: cs.tokensHeld + tokensAwarded,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("crateState", {
            userId: user._id,
            crateDefId: seasonCrate._id,
            secondsEarned: 0,
            tokensHeld: tokensAwarded,
            updatedAt: now,
          });
        }
      }
    }

    return {
      questName: def.name,
      xpAwarded: def.xpReward,
      scrapAwarded: def.scrapReward,
      tokensAwarded,
      newTotalXp,
      newLevel,
      newScrap,
    };
  },
});

/** Lists active quests with the caller's current-cadence progress; unauthenticated callers get defs only. */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? (identity.subject as Id<"users">) : null;
    const now = nowMs();

    const defs = (
      await Promise.all([
        ctx.db
          .query("questDef")
          .withIndex("by_cadence_active", (q) => q.eq("cadence", "daily").eq("active", true))
          .collect(),
        ctx.db
          .query("questDef")
          .withIndex("by_cadence_active", (q) => q.eq("cadence", "weekly").eq("active", true))
          .collect(),
        ctx.db
          .query("questDef")
          .withIndex("by_cadence_active", (q) => q.eq("cadence", "season").eq("active", true))
          .collect(),
      ])
    ).flat();

    const result: Array<{
      def: Doc<"questDef">;
      cadenceKey: string;
      progress: number;
      completed: boolean;
      claimed: boolean;
    }> = [];
    for (const def of defs) {
      const cadenceKey = cadenceKeyFor(def.cadence, now);
      let progress = 0;
      let completed = false;
      let claimed = false;
      if (userId) {
        const prog = await ctx.db
          .query("questProgress")
          .withIndex("by_user_quest_cadence", (q) =>
            q.eq("userId", userId).eq("questDefId", def._id).eq("cadenceKey", cadenceKey),
          )
          .first();
        if (prog) {
          progress = prog.progressValue;
          completed = prog.completed;
          claimed = prog.claimed;
        }
      }
      result.push({ def, cadenceKey, progress, completed, claimed });
    }
    return result;
  },
});
