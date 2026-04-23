import { useEffect, useMemo, useState } from "preact/hooks";
import type { Id } from "../../../../../../convex/_generated/dataModel.js";
import { inlineSvg } from "../../svgUri.js";
import { ItemPreviewDialog } from "../ItemPreviewDialog.js";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type Season = {
  id: Id<"seasons">;
  seasonNumber: number;
  name: string;
  theme: string;
  startsAt: number;
  endsAt: number;
  tierCount: number;
  xpPerTier?: number;
  bonusXpMultiplier: number;
};

type QuestRow = {
  def: {
    _id: Id<"questDef">;
    cadence: "daily" | "weekly" | "season";
    name: string;
    description: string;
    xpReward: number;
    scrapReward: number;
    crateTokenReward?: number;
    requirement: { type: string; target: number };
  };
  cadenceKey: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

type Me = {
  totalXp: number;
  seasonXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

type TierReward = {
  tier: number;
  rarity: Rarity;
  xpRequired: number;
  item: {
    _id: Id<"items">;
    slug: string;
    name: string;
    type: "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";
    rarity: Rarity;
    assetSvg: string;
    animated: boolean;
    description: string;
    sellValue: number;
  } | null;
};

type TierClaim = { tierNumber: number; claimedAt: number };

type InventoryRow = { itemId: Id<"items">; duplicates: number };

/**
 * "Battle Pass" tab — season dashboard with the active tier hero,
 * tier strip, and the right-rail challenge list.
 *
 * Layout lays out three axes simultaneously: the hero card (reward +
 * claim action), the tier strip (rarity-tinted cards across all
 * season tiers), and the daily/weekly quest column. Tier progress is
 * always driven by `season.xpPerTier` when available, falling back to
 * the first tier reward's XP requirement so old seed data still
 * renders a sensible track. A 30 s `setInterval` keeps the cadence
 * countdowns (`daysLeft`, "resets in…") fresh without re-subscribing
 * to server state. The panel is fully controlled — every claim action
 * is an `onClaim*` callback so the dialog shell owns auth/Convex.
 */
export function BattlePassPanel(props: {
  season: Season | null;
  me: Me | null;
  quests: QuestRow[];
  tierRewards: TierReward[];
  tierClaims: TierClaim[];
  inventory: InventoryRow[];
  onClaimQuest: (id: Id<"questDef">) => void;
  onClaimTier: (tier: number) => void;
  onClaimAllTiers: (tiers: number[]) => void;
  onSell: (itemId: Id<"items">) => void;
  sellBusy: boolean;
}) {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [previewTier, setPreviewTier] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const claimedSet = useMemo(
    () => new Set(props.tierClaims.map((c) => c.tierNumber)),
    [props.tierClaims],
  );

  const claimableTiers = useMemo(() => {
    const xp = props.me?.seasonXp ?? 0;
    return props.tierRewards
      .filter((r) => r.item && xp >= r.xpRequired && !claimedSet.has(r.tier))
      .map((r) => r.tier)
      .sort((a, b) => a - b);
  }, [props.tierRewards, props.me?.seasonXp, claimedSet]);

  if (!props.season) {
    return (
      <div class="kc-panel">
        <div class="kc-empty">No active season — run seed:seedSeason1</div>
      </div>
    );
  }

  const seasonXp = props.me?.seasonXp ?? 0;
  const xpPerTier = props.season?.xpPerTier
    ? Math.max(1, props.season.xpPerTier)
    : props.tierRewards[0]
      ? Math.max(1, props.tierRewards[0].xpRequired)
      : 500;
  const currentTier = Math.min(
    props.season.tierCount,
    Math.max(0, Math.floor(seasonXp / xpPerTier)),
  );
  const nextTier = Math.min(currentTier + 1, props.season.tierCount);
  const nextTierXp = nextTier * xpPerTier;
  const currentTierXpBase = currentTier * xpPerTier;
  const xpIntoTier = Math.max(0, seasonXp - currentTierXpBase);
  const xpToNextTier = Math.max(0, nextTierXp - seasonXp);
  const tierProgressPct =
    xpPerTier > 0 ? Math.min(100, (xpIntoTier / xpPerTier) * 100) : 0;

  const daysLeft = Math.max(
    0,
    Math.floor((props.season.endsAt - now) / (24 * 3600 * 1000)),
  );
  const daily = props.quests.filter((q) => q.def.cadence === "daily");
  const weekly = props.quests.filter((q) => q.def.cadence === "weekly");
  const dailiesDone = daily.filter((q) => q.completed).length;
  const weeklyMetaTotal = daily.length * 7;
  const weeklyMetaProgress = daily.filter((q) => q.claimed).length;

  const activeTier = selectedTier ?? nextTier;
  const activeReward =
    props.tierRewards.find((r) => r.tier === activeTier) ?? null;
  const activeAsset = activeReward?.item?.assetSvg ?? "";
  const activeRarity = activeReward?.rarity ?? "uncommon";
  const activeClaimed = claimedSet.has(activeTier);
  const activeReached = activeReward
    ? seasonXp >= activeReward.xpRequired
    : false;

  return (
    <div class="kc-panel">
      <div class="kc-bp">
        <div class="kc-bp__main">
          <div class="kc-bp__chips">
            <span class="kc-bp-chip kc-bp-chip--accent">
              <span class="kc-bp-chip__dot" />
              {props.season.name.toUpperCase()}
            </span>
            <span class="kc-bp-chip">
              <span class="kc-bp-chip__dot" />
              {props.season.theme.toUpperCase()}
            </span>
            <span
              class="kc-bp-chip"
              style={{ marginLeft: "auto", color: "var(--kc-warn)" }}
            >
              {daysLeft}d · +
              {Math.round((props.season.bonusXpMultiplier - 1) * 100)}% XP
            </span>
            <span class="kc-bp-chip kc-bp-chip--live">
              <span class="kc-bp-chip__dot" />
              LIVE
            </span>
          </div>
          <div class="kc-bp__season">
            <span class="kc-bp__season-num">
              Season {props.season.seasonNumber}:
            </span>
            <span class="kc-bp__season-name">{props.season.name}</span>
            {claimableTiers.length > 0 ? (
              <button
                class="kc-btn kc-btn--primary kc-bp__claim-all"
                type="button"
                onClick={() => props.onClaimAllTiers(claimableTiers)}
                title={
                  "Claim tier " +
                  claimableTiers[0] +
                  (claimableTiers.length > 1
                    ? "–" + claimableTiers[claimableTiers.length - 1]
                    : "")
                }
              >
                <span class="kc-bp__claim-all-count">
                  {claimableTiers.length}
                </span>
                Claim all
              </button>
            ) : null}
          </div>

          <div class="kc-bp__hero">
            <div
              class={"kc-bp__hero-art kc-bp__hero-art--" + activeRarity}
              dangerouslySetInnerHTML={inlineSvg(activeAsset)}
            />
            <div class="kc-bp__hero-meta">
              <div class="kc-bp__hero-tierline">
                <span class="kc-bp__hero-tier-chip">Tier {activeTier}</span>
                {activeClaimed ? (
                  <span class="kc-bp__hero-status kc-bp__hero-status--claimed">
                    Claimed
                  </span>
                ) : activeReached ? (
                  <span class="kc-bp__hero-status kc-bp__hero-status--ready">
                    Ready
                  </span>
                ) : (
                  <span class="kc-bp__hero-status">Locked</span>
                )}
              </div>
              <div
                class="kc-bp__hero-rarity"
                style={{ color: rarityHex(activeRarity) }}
              >
                {activeRarity}{" "}
                {activeReward?.item?.type
                  ? friendlyType(activeReward.item.type)
                  : "Reward"}
              </div>
              <h3 class="kc-bp__hero-name">
                {activeReward?.item?.name ?? "Tier " + activeTier}
              </h3>
              {activeReward?.item?.description ? (
                <p class="kc-bp__hero-desc">{activeReward.item.description}</p>
              ) : null}
              <div class="kc-bp__hero-stats">
                <div class="kc-bp__hero-stat">
                  <span class="kc-bp__hero-stat-l">Unlocks at</span>
                  <span class="kc-bp__hero-stat-v">
                    {activeReward?.xpRequired.toLocaleString() ?? "—"} Season XP
                  </span>
                </div>
                <div class="kc-bp__hero-stat">
                  <span class="kc-bp__hero-stat-l">Season XP</span>
                  <span class="kc-bp__hero-stat-v">
                    {seasonXp.toLocaleString()}
                  </span>
                </div>
                {activeTier % 5 === 0 ? (
                  <div class="kc-bp__hero-stat">
                    <span class="kc-bp__hero-stat-l">Tier bonus</span>
                    <span class="kc-bp__hero-stat-v">+1 Season Token</span>
                  </div>
                ) : null}
              </div>
              <div class="kc-bp__hero-actions">
                <HeroClaimButton
                  reward={activeReward}
                  reached={activeReached}
                  claimed={activeClaimed}
                  onClaim={() =>
                    activeReward && props.onClaimTier(activeReward.tier)
                  }
                />
                {activeReward?.item ? (
                  <button
                    class="kc-btn kc-btn--ghost"
                    onClick={() => setPreviewTier(activeTier)}
                    type="button"
                  >
                    Preview
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div
            class="kc-bp__tier-progress"
            title={
              "Tier progress is driven by Season XP (resets each season). Each tier = " +
              xpPerTier.toLocaleString() +
              " XP. Current Season XP: " +
              seasonXp.toLocaleString()
            }
          >
            <div class="kc-bp__tier-badge">{currentTier}</div>
            <div
              style={{
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div class="kc-bp__tier-label">
                <span>
                  Tier <strong>{currentTier}</strong> / {props.season.tierCount}
                </span>
                <span class="kc-bp__tier-sub">
                  {xpIntoTier.toLocaleString()} / {xpPerTier.toLocaleString()}{" "}
                  XP to Tier {nextTier}
                </span>
              </div>
              <div class="kc-bp__tier-track">
                <div
                  class="kc-bp__tier-fill"
                  style={{ width: tierProgressPct.toFixed(1) + "%" }}
                />
              </div>
            </div>
          </div>

          <div class="kc-tier-strip">
            {props.tierRewards.map((reward) => {
              const claimed = claimedSet.has(reward.tier);
              const unlocked = seasonXp >= reward.xpRequired;
              const isNext = reward.tier === nextTier;
              return (
                <button
                  class="kc-tier"
                  data-unlocked={unlocked ? "true" : "false"}
                  data-current={isNext ? "true" : "false"}
                  data-claimed={claimed ? "true" : "false"}
                  data-selected={activeTier === reward.tier ? "true" : "false"}
                  onClick={() => setSelectedTier(reward.tier)}
                  title={
                    "Tier " +
                    reward.tier +
                    " — " +
                    (reward.item?.name ?? "reward")
                  }
                >
                  <div class="kc-tier__num">{reward.tier}</div>
                  <div
                    class={"kc-tier__art kc-tier__art--" + reward.rarity}
                    dangerouslySetInnerHTML={inlineSvg(reward.item?.assetSvg)}
                  />
                  {claimed ? (
                    <div class="kc-tier__check" aria-hidden="true">
                      <svg viewBox="0 0 16 16">
                        <path
                          d="M3 8l3 3l7 -7"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside class="kc-bp__side">
          <div class="kc-bp__side-head">
            <div class="kc-bp__side-title">Challenges</div>
            <div class="kc-bp__side-sub">Earn XP &amp; Tokens</div>
          </div>

          <div class="kc-bp__side-scroll">
            <div class="kc-bp__side-group">
              <div class="kc-bp__side-group-head">
                <span>Daily</span>
                <span>
                  {dailiesDone}/{Math.max(1, daily.length)} ·{" "}
                  {formatDuration(msUntilNextUtcMidnight(now))}
                </span>
              </div>
              {daily.map((q) => (
                <QuestCard q={q} onClaim={props.onClaimQuest} />
              ))}
            </div>

            {weekly.length > 0 ? (
              <div class="kc-bp__side-group">
                <div class="kc-bp__side-group-head">
                  <span>Weekly</span>
                  <span>{formatDuration(msUntilNextUtcMonday(now))}</span>
                </div>
                {weekly.map((q) => (
                  <QuestCard q={q} onClaim={props.onClaimQuest} />
                ))}
              </div>
            ) : null}

            <div class="kc-meta-progress">
              <div class="kc-meta-progress__title">Weekly Crate Progress</div>
              <div class="kc-meta-progress__desc">
                Clear all dailies every day this week to earn a bonus crate.
              </div>
              <div class="kc-welcome__progress" style={{ marginTop: "8px" }}>
                <span class="kc-welcome__label">
                  {weeklyMetaProgress}/{weeklyMetaTotal || "?"}
                </span>
                <div class="kc-welcome__track">
                  <div
                    class="kc-welcome__fill"
                    style={{
                      width:
                        weeklyMetaTotal > 0
                          ? Math.min(
                              100,
                              (weeklyMetaProgress / weeklyMetaTotal) * 100,
                            ).toFixed(0) + "%"
                          : "0%",
                    }}
                  />
                </div>
                <span class="kc-welcome__label">
                  {weeklyMetaTotal > 0
                    ? ((weeklyMetaProgress / weeklyMetaTotal) * 100).toFixed(
                        0,
                      ) + "%"
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {previewTier !== null
        ? (() => {
            const pr = props.tierRewards.find((r) => r.tier === previewTier);
            if (!pr || !pr.item) return null;
            const claimed = claimedSet.has(previewTier);
            const reached = seasonXp >= pr.xpRequired;
            const itemId = pr.item._id;
            const inv = props.inventory.find((r) => r.itemId === itemId);
            const duplicates = inv?.duplicates ?? 0;
            const sellable = duplicates > 0 && pr.item.sellValue > 0;
            return (
              <ItemPreviewDialog
                item={pr.item}
                eyebrow={`Battle Pass · Tier ${previewTier} / ${props.season!.tierCount}`}
                stats={[
                  {
                    label: "Unlocks at",
                    value: pr.xpRequired.toLocaleString() + " Season XP",
                  },
                  {
                    label: "Season XP",
                    value: seasonXp.toLocaleString(),
                    accent: reached ? "primary" : "muted",
                  },
                  {
                    label: "Status",
                    value: claimed
                      ? "Already claimed"
                      : reached
                        ? "Ready to claim"
                        : "Locked",
                    accent: claimed ? "muted" : reached ? "primary" : "warn",
                  },
                  previewTier % 5 === 0
                    ? {
                        label: "Tier bonus",
                        value: "+1 Season Token",
                        accent: "primary",
                      }
                    : null,
                  pr.item.sellValue > 0
                    ? {
                        label: "Sell value",
                        value: "+" + pr.item.sellValue + " scrap / copy",
                        accent: "muted",
                      }
                    : null,
                  duplicates > 0
                    ? {
                        label: "Copies",
                        value: "×" + (duplicates + 1),
                        accent: "muted",
                      }
                    : null,
                ]}
                action={
                  !claimed && reached
                    ? {
                        label: "Claim tier " + previewTier,
                        onClick: () => {
                          props.onClaimTier(previewTier);
                          setPreviewTier(null);
                        },
                      }
                    : null
                }
                secondaryAction={
                  sellable
                    ? {
                        label:
                          "Sell 1 duplicate · +" + pr.item.sellValue + " scrap",
                        disabled: props.sellBusy,
                        onClick: () => props.onSell(itemId),
                      }
                    : null
                }
                onClose={() => setPreviewTier(null)}
              />
            );
          })()
        : null}
    </div>
  );
}

function HeroClaimButton(props: {
  reward: TierReward | null;
  reached: boolean;
  claimed: boolean;
  onClaim: () => void;
}) {
  if (!props.reward || !props.reward.item) {
    return (
      <button class="kc-btn kc-btn--secondary" disabled>
        No reward
      </button>
    );
  }
  if (props.claimed) {
    return (
      <button class="kc-btn kc-btn--secondary" disabled>
        Already claimed
      </button>
    );
  }
  if (props.reached) {
    return (
      <button class="kc-btn kc-btn--primary" onClick={props.onClaim}>
        Claim tier {props.reward.tier}
      </button>
    );
  }
  return (
    <button class="kc-btn kc-btn--secondary" disabled>
      Locked
    </button>
  );
}

function QuestCard(props: {
  q: QuestRow;
  onClaim: (id: Id<"questDef">) => void;
}) {
  const { q } = props;
  const pct = Math.min(
    100,
    (q.progress / Math.max(1, q.def.requirement.target)) * 100,
  );
  const tokenReward = q.def.crateTokenReward ?? 0;
  return (
    <div
      class="kc-quest"
      data-claimable={q.completed && !q.claimed ? "true" : "false"}
    >
      <div class="kc-quest__top">
        <div class="kc-quest__name">{q.def.name}</div>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span class="kc-quest__xp">+{q.def.xpReward} XP</span>
          {q.def.scrapReward > 0 ? (
            <span class="kc-quest__xp kc-quest__xp--scrap">
              +{q.def.scrapReward} scrap
            </span>
          ) : null}
          {tokenReward > 0 ? (
            <span
              class="kc-quest__xp"
              style={{ color: "var(--kc-rarity-epic)" }}
              title="Season crate tokens"
            >
              +{tokenReward} token{tokenReward === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>
      <div class="kc-quest__desc">{q.def.description}</div>
      <div class="kc-quest__progress">
        <div class="kc-quest__track">
          <div
            class={
              "kc-quest__fill " + (q.completed ? "kc-quest__fill--done" : "")
            }
            style={{ width: pct.toFixed(0) + "%" }}
          />
        </div>
        <div class="kc-quest__pct">
          {q.progress}/{q.def.requirement.target}
        </div>
      </div>
      {q.claimed ? (
        <div class="kc-quest__claimed">Claimed</div>
      ) : q.completed ? (
        <div class="kc-quest__claim">
          <button
            class="kc-btn kc-btn--primary kc-btn--xs kc-btn--block"
            onClick={() => props.onClaim(q.def._id)}
          >
            Claim
          </button>
        </div>
      ) : null}
    </div>
  );
}

function rarityHex(r: Rarity): string {
  switch (r) {
    case "common":
      return "#9fc7a6";
    case "uncommon":
      return "#78e48c";
    case "rare":
      return "#66d4ff";
    case "epic":
      return "#c78bff";
    case "legendary":
      return "#ffd866";
  }
}

function friendlyType(t: string): string {
  switch (t) {
    case "emote":
      return "Emote";
    case "badge":
      return "Badge";
    case "nameColor":
      return "Name Color";
    case "profileCard":
      return "Profile Card";
    case "chatFlair":
      return "Chat Flair";
    default:
      return "Cosmetic";
  }
}

function msUntilNextUtcMidnight(ts: number): number {
  const d = new Date(ts);
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
  );
  return Math.max(0, next - ts);
}

function msUntilNextUtcMonday(ts: number): number {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + daysUntilMonday,
  );
  return Math.max(0, next - ts);
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return d + "d " + rh + "h";
  }
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}
