import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { api } from "../../../../../convex/_generated/api.js";
import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { isExtensionContextAlive, safeSendMessage } from "../../chromeSafe.js";
import { applyAuthToReactive, getReactiveClient } from "../../convex.js";
import type { AuthStatus } from "../../messaging.js";
import { closeDialog, subscribeDialog } from "../dialogState.js";
import { AlertIcon, CloseIcon } from "../icons.js";
import { BattlePassPanel } from "./panels/BattlePass.js";
import { CollectionPanel } from "./panels/Collection.js";
import { CratesPanel } from "./panels/Crates.js";
import { LoadoutPanel, type LoadoutSlots } from "./panels/Loadout.js";
import { ProfilePanel } from "./panels/Profile.js";
import {
  ClaimReveal,
  type ClaimPayload,
} from "./screens/ClaimRevealScreen.jsx";
import {
  CrateOpening,
  type CrateOpenResult,
  type Item,
} from "./screens/CrateOpening.jsx";

type TabKey = "crates" | "battlepass" | "collection" | "loadout" | "profile";

type Me = {
  id: Id<"users">;
  kickUsername: string;
  kickProfilePicture: string | null;
  totalXp: number;
  seasonXp: number;
  level: number;
  scrap: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressToNextLevel: number;
  fraudFlagged: boolean;
  bannedAt: number | null;
  welcomeAcknowledged: boolean;
  loadout: (LoadoutSlots & { title?: string | null }) | null;
};

type WelcomeKit = {
  items: Array<{
    _id: Id<"items">;
    slug: string;
    name: string;
    type: "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    assetSvg: string;
    animated: boolean;
    description: string;
  }>;
  xpAwarded: number;
  scrapAwarded: number;
  username: string;
};

type Season = {
  id: Id<"seasons">;
  seasonNumber: number;
  name: string;
  theme: string;
  startsAt: number;
  endsAt: number;
  tierCount: number;
  xpPerTier: number;
  bonusXpMultiplier: number;
};

type CrateDef = {
  _id: Id<"crateDef">;
  slug: "daily" | "weekly" | "monthly" | "season";
  name: string;
  description: string;
  watchMinutesRequired?: number;
  cooldownHours?: number;
  cardsPerOpen: number;
  tokenGated: boolean;
  active: boolean;
};

type CrateState = {
  crateDefId: Id<"crateDef">;
  secondsEarned: number;
  lastOpenedAt?: number;
  tokensHeld: number;
};

type QuestRow = {
  def: {
    _id: Id<"questDef">;
    slug: string;
    cadence: "daily" | "weekly" | "season";
    name: string;
    description: string;
    xpReward: number;
    scrapReward: number;
    crateTokenReward?: number;
    requirement: {
      type: "watch_minutes" | "watch_distinct_channels" | "open_crate";
      target: number;
    };
  };
  cadenceKey: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
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

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** A single battle-pass tier row: the tier number, its rarity band, XP gate, and the item it unlocks (null for gated rows with no reward yet). */
export type TierReward = {
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

/** Record of a user claiming a single battle-pass tier, keyed by tier number and when the claim fired. */
export type TierClaim = {
  tierNumber: number;
  claimedAt: number;
};

type TierClaimResult = {
  tierNumber: number;
  item: {
    _id: Id<"items">;
    slug: string;
    name: string;
    type: "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    assetSvg: string;
    animated: boolean;
    description: string;
  };
  wasDuplicate: boolean;
  scrapAwarded: number;
  tokensAwarded: number;
};

/**
 * Top-level dialog shell.
 *
 * Subscribes to {@link subscribeDialog} for open/close state, installs a
 * document-level `Escape` handler while open, and renders the backdrop
 * overlay. Clicks on the overlay (outside the inner dialog) close the
 * dialog. The actual content tree — auth, bootstrap, tabs, modals — is
 * kept in the private `DialogContents` component so its Convex
 * subscriptions tear down cleanly the moment the dialog closes.
 */
export function Root() {
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeDialog(setOpen), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) closeDialog();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      class="kc-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDialog();
      }}
    >
      <DialogContents />
    </div>
  );
}

function DialogContents() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [crates, setCrates] = useState<CrateDef[]>([]);
  const [crateStates, setCrateStates] = useState<CrateState[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tierRewards, setTierRewards] = useState<TierReward[]>([]);
  const [tierClaims, setTierClaims] = useState<TierClaim[]>([]);
  const [tab, setTab] = useState<TabKey>("crates");
  const [busy, setBusy] = useState(false);
  const [sellBusy, setSellBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<CrateOpenResult | null>(null);
  const [welcomeKit, setWelcomeKit] = useState<WelcomeKit | null>(null);
  const [claim, setClaim] = useState<ClaimPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refetchAuth() {
      const s = await safeSendMessage<AuthStatus>({ type: "auth/status" });
      if (cancelled) return;
      if (s) setAuth(s);
      else setAuth({ signedIn: false });
    }
    refetchAuth();

    function onStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) {
      if (area !== "local") return;
      if (!("kc_session_v1" in changes)) return;
      refetchAuth();
      applyAuthToReactive().catch(() => {});
    }
    if (isExtensionContextAlive()) {
      chrome.storage.onChanged.addListener(onStorageChange);
    }
    return () => {
      cancelled = true;
      if (isExtensionContextAlive()) {
        chrome.storage.onChanged.removeListener(onStorageChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!auth?.signedIn) return;
    let active = true;
    const unsubs: Array<() => void> = [];
    (async () => {
      await applyAuthToReactive();
      if (!active) return;
      const client = getReactiveClient();
      if (!client) return;

      try {
        const boot = (await client.query(api.dashboard.bootstrap, {})) as {
          me: Me | null;
          clientConfig: { activeSeason: Season | null };
          crates: CrateDef[];
          myCrateStates: CrateState[];
          quests: QuestRow[];
          inventory: InventoryRow[];
          seasonItems: Item[];
          tierRewards: TierReward[];
          myTierClaims: TierClaim[];
          welcomeKit: WelcomeKit | null;
        } | null;
        if (!active || !boot) return;
        setMe(boot.me);
        setSeason(boot.clientConfig.activeSeason);
        setCrates(boot.crates);
        setCrateStates(boot.myCrateStates);
        setQuests(boot.quests);
        setInventory(boot.inventory);
        setItems(boot.seasonItems);
        setTierRewards(boot.tierRewards);
        setTierClaims(boot.myTierClaims);
        setWelcomeKit(boot.welcomeKit);
      } catch {}

      unsubs.push(
        client.onUpdate(
          api.users.me,
          {},
          (v) => active && setMe((v as Me) ?? null),
        ),
      );
      unsubs.push(
        client.onUpdate(
          api.crates.myCrateStates,
          {},
          (v) => active && setCrateStates((v as CrateState[]) ?? []),
        ),
      );
      unsubs.push(
        client.onUpdate(
          api.quests.listActive,
          {},
          (v) => active && setQuests((v as QuestRow[]) ?? []),
        ),
      );
      unsubs.push(
        client.onUpdate(
          api.users.myInventory,
          {},
          (v) => active && setInventory((v as InventoryRow[]) ?? []),
        ),
      );
      unsubs.push(
        client.onUpdate(
          api.seasons.listMyTierClaims,
          {},
          (v) => active && setTierClaims((v as TierClaim[]) ?? []),
        ),
      );
    })();
    return () => {
      active = false;
      for (const u of unsubs) u();
    };
  }, [auth?.signedIn]);

  const login = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await safeSendMessage<{ ok: boolean; error?: string }>({
        type: "auth/start",
      });
      if (!r) setError("Extension reloaded. Refresh the page and try again.");
      else if (r.ok === false) setError(r.error ?? "login failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await safeSendMessage({ type: "auth/logout" });
    setAuth({ signedIn: false });
    setMe(null);
    await applyAuthToReactive();
  }, []);

  const openCrate = useCallback(async (slug: string) => {
    setError(null);
    setBusy(true);
    try {
      const r = await safeSendMessage<{
        ok: boolean;
        error?: string;
        result?: CrateOpenResult;
      }>({ type: "crate/open", crateSlug: slug });
      if (!r) {
        setError("Extension reloaded. Refresh the page and try again.");
        setBusy(false);
        return;
      }
      if (r.ok === false) {
        setError(humanError(r.error ?? ""));
        setBusy(false);
        return;
      }
      if (r.ok === true && r.result) {
        setReveal(r.result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const claimTier = useCallback(async (tierNumber: number) => {
    setError(null);
    try {
      await applyAuthToReactive();
      const client = getReactiveClient();
      if (!client) {
        setError("Convex URL not configured.");
        return;
      }
      const r = (await client.mutation(api.seasons.claimTier, {
        tierNumber,
      })) as TierClaimResult;
      setClaim({
        variant: "tier",
        eyebrow: "Tier " + r.tierNumber + " unlocked",
        title: r.item.name,
        subtitle: r.wasDuplicate
          ? "Duplicate — converted to scrap"
          : "New reward added to your collection",
        items: [r.item],
        scrapAwarded: r.scrapAwarded,
        tokensAwarded: r.tokensAwarded,
      });
    } catch (e) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const claimAllTiers = useCallback(async (tiers: number[]) => {
    if (tiers.length === 0) return;
    setError(null);
    try {
      await applyAuthToReactive();
      const client = getReactiveClient();
      if (!client) {
        setError("Convex URL not configured.");
        return;
      }
      const r = (await client.mutation(api.seasons.claimEligibleTiers, {
        tierNumbers: tiers,
      })) as {
        claimed: TierClaimResult[];
        totalScrapAwarded: number;
        totalTokensAwarded: number;
      };
      if (r.claimed.length === 0) {
        setError("Nothing to claim — these tiers were already claimed or unreached.");
        return;
      }
      const first = r.claimed[0]!.tierNumber;
      const last = r.claimed[r.claimed.length - 1]!.tierNumber;
      const rangeLabel =
        r.claimed.length === 1 ? "Tier " + first : "Tiers " + first + "–" + last;
      const subtitle =
        r.claimed.length === 1
          ? r.claimed[0]!.wasDuplicate
            ? "Duplicate — converted to scrap"
            : "New reward added to your collection"
          : r.claimed.length + " rewards added to your collection";
      setClaim({
        variant: "tier",
        eyebrow: rangeLabel + " unlocked",
        title:
          r.claimed.length === 1
            ? r.claimed[0]!.item.name
            : r.claimed.length + " rewards claimed",
        subtitle,
        items: r.claimed.map((c) => c.item),
        scrapAwarded: r.totalScrapAwarded,
        tokensAwarded: r.totalTokensAwarded,
      });
    } catch (e) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const claimQuest = useCallback(async (questDefId: Id<"questDef">) => {
    try {
      await applyAuthToReactive();
      const client = getReactiveClient();
      if (!client) {
        setError("Convex URL not configured.");
        return;
      }
      const r = (await client.mutation(api.quests.claim, { questDefId })) as {
        questName: string;
        xpAwarded: number;
        scrapAwarded: number;
        tokensAwarded: number;
      };
      setClaim({
        variant: "quest",
        eyebrow: "Quest complete",
        title: r.questName,
        subtitle: "Rewards claimed",
        items: [],
        xpAwarded: r.xpAwarded,
        scrapAwarded: r.scrapAwarded,
        tokensAwarded: r.tokensAwarded,
      });
    } catch (e) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    }
  }, []);

  const sellItem = useCallback(async (itemId: Id<"items">) => {
    if (sellBusy) return;
    setError(null);
    setSellBusy(true);
    try {
      await applyAuthToReactive();
      const client = getReactiveClient();
      if (!client) {
        setError("Convex URL not configured.");
        return;
      }
      await client.mutation(api.scrap.sellItem, { itemId, quantity: 1 });
    } catch (e) {
      setError(humanError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSellBusy(false);
    }
  }, [sellBusy]);

  const acknowledgeWelcome = useCallback(async () => {
    try {
      await applyAuthToReactive();
      const client = getReactiveClient();
      if (!client) return;
      await client.mutation(api.users.acknowledgeWelcome, {});
      setWelcomeKit(null);
    } catch {
      setWelcomeKit(null);
    }
  }, []);

  const equipItem = useCallback(
    async (slot: keyof LoadoutSlots, itemId: Id<"items"> | null) => {
      try {
        await applyAuthToReactive();
        const client = getReactiveClient();
        if (!client) {
          setError("Convex URL not configured.");
          return;
        }
        const prev = me?.loadout ?? null;
        const next: {
          badgeItemId: Id<"items"> | null;
          nameColorItemId: Id<"items"> | null;
          profileCardItemId: Id<"items"> | null;
          chatFlairItemId: Id<"items"> | null;
          title: string | null;
        } = {
          badgeItemId: prev?.badgeItemId ?? null,
          nameColorItemId: prev?.nameColorItemId ?? null,
          profileCardItemId: prev?.profileCardItemId ?? null,
          chatFlairItemId: prev?.chatFlairItemId ?? null,
          title: prev?.title ?? null,
        };
        next[slot] = itemId;
        await client.mutation(api.users.setLoadout, next);
      } catch (e) {
        setError(humanError(e instanceof Error ? e.message : String(e)));
      }
    },
    [me?.loadout],
  );

  if (auth === null) {
    return (
      <div class="kc-dialog">
        <div class="kc-panel">
          <div class="kc-empty">Loading…</div>
        </div>
      </div>
    );
  }

  if (!auth.signedIn) {
    return (
      <div class="kc-dialog">
        <DialogHead me={null} username={null} avatar={null} season={null} />
        <div class="kc-hero">
          <div class="kc-hero__logo">K</div>
          <h2 class="kc-hero__title">KickCrates</h2>
          <p class="kc-hero__subtitle">
            Battle pass, crates, and XP for watching Kick streams. Sign in with
            your Kick account to start earning cosmetics.
          </p>
          <button
            class="kc-btn kc-btn--primary kc-btn--lg"
            onClick={login}
            disabled={busy}
          >
            {busy ? "Opening..." : "Sign in with Kick"}
          </button>
          {error ? (
            <div
              class="kc-error"
              style={{ marginTop: "14px", maxWidth: "420px" }}
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (me && me.bannedAt) {
    return (
      <div class="kc-dialog">
        <DialogHead
          me={me}
          username={auth.user.name}
          avatar={auth.user.profilePicture ?? me.kickProfilePicture ?? null}
          season={season}
          itemCount={inventory.length}
        />
        <div class="kc-hero">
          <div
            class="kc-hero__logo"
            style={{ background: "linear-gradient(135deg,#ff7676,#8c1f1f)" }}
          >
            !
          </div>
          <h2 class="kc-hero__title">Account suspended</h2>
          <p class="kc-hero__subtitle">
            This account was suspended on{" "}
            {new Date(me.bannedAt).toLocaleDateString()}. Appeal via the
            extension support channel; progression is frozen in the meantime.
          </p>
          <button class="kc-btn kc-btn--ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const flaggedBanner = me?.fraudFlagged ? (
    <div class="kc-flag-banner">
      <span class="kc-flag-banner__icon" aria-hidden="true">
        <AlertIcon />
      </span>
      <span>This account is under review for suspicious watch patterns</span>
    </div>
  ) : null;

  return (
    <div class="kc-dialog">
      <DialogHead
        me={me}
        username={auth.user.name}
        avatar={auth.user.profilePicture ?? me?.kickProfilePicture ?? null}
        season={season}
        itemCount={inventory.length}
        onProfileClick={() => setTab("profile")}
      />
      {flaggedBanner}
      <Tabs current={tab} onChange={setTab} />
      {tab === "crates" ? (
        <CratesPanel
          crates={crates}
          states={crateStates}
          onOpen={openCrate}
          busy={busy}
        />
      ) : null}
      {tab === "battlepass" ? (
        <BattlePassPanel
          season={season}
          me={
            me
              ? {
                  totalXp: me.totalXp,
                  seasonXp: me.seasonXp,
                  level: me.level,
                  xpIntoLevel: me.xpIntoLevel,
                  xpForNextLevel: me.xpForNextLevel,
                }
              : null
          }
          quests={quests}
          tierRewards={tierRewards}
          tierClaims={tierClaims}
          onClaimQuest={claimQuest}
          onClaimTier={claimTier}
          onClaimAllTiers={claimAllTiers}
        />
      ) : null}
      {tab === "collection" ? (
        <CollectionPanel
          items={items}
          inventory={inventory}
          onSell={sellItem}
          sellBusy={sellBusy}
        />
      ) : null}
      {tab === "profile" ? (
        <ProfilePanel
          me={me}
          username={auth.user.name}
          avatar={auth.user.profilePicture ?? me?.kickProfilePicture ?? null}
          inventory={inventory}
          totalItemsInSeason={items.length}
          onLogout={logout}
        />
      ) : null}
      {tab === "loadout" ? (
        <LoadoutPanel
          items={items}
          inventory={inventory}
          loadout={me?.loadout ?? null}
          onEquip={equipItem}
        />
      ) : null}
      {error ? (
        <div style={{ padding: "0 24px 16px" }}>
          <div class="kc-error">{error}</div>
        </div>
      ) : null}
      {reveal ? (
        <CrateOpening
          result={reveal}
          items={items}
          onClose={() => setReveal(null)}
        />
      ) : null}
      {claim ? (
        <ClaimReveal payload={claim} onAcknowledge={() => setClaim(null)} />
      ) : null}
      {welcomeKit && welcomeKit.items.length > 0 && !claim && !reveal ? (
        <ClaimReveal
          payload={{
            variant: "welcome",
            eyebrow: "Welcome to KickCrates",
            title: "Ready, " + welcomeKit.username + "?",
            subtitle: "You just earned your starter pack. Let's open it.",
            items: welcomeKit.items,
            xpAwarded: welcomeKit.xpAwarded,
            scrapAwarded: welcomeKit.scrapAwarded,
          }}
          onAcknowledge={acknowledgeWelcome}
        />
      ) : null}
    </div>
  );
}

function DialogHead(props: {
  me: Me | null;
  username: string | null;
  avatar: string | null;
  season: Season | null;
  itemCount?: number;
  onProfileClick?: () => void;
}) {
  const { me, username, season } = props;
  const signedIn = me !== null || username !== null;
  const items = props.itemCount ?? 0;
  const level = me?.level ?? 1;
  const progressPct =
    me && me.xpForNextLevel > 0
      ? Math.min(100, (me.xpIntoLevel / me.xpForNextLevel) * 100)
      : 0;

  if (!signedIn) {
    return (
      <div class="kc-head kc-head--minimal">
        <div class="kc-brand">
          <div class="kc-brand__wordmark">
            KICK<span class="kc-brand__kick">CRATES</span>
          </div>
        </div>
        <button
          class="kc-close"
          aria-label="Close KickCrates"
          onClick={() => closeDialog()}
        >
          <CloseIcon />
        </button>
      </div>
    );
  }

  return (
    <div class="kc-head">
      <div class="kc-head__left">
        <div
          class="kc-stat"
          title="Scrap — currency earned from duplicate drops"
        >
          <div class="kc-stat__value">{compactNumber(me?.scrap ?? 0)}</div>
          <div class="kc-stat__label">Scrap</div>
        </div>
        <div class="kc-stat" title="Items collected">
          <div class="kc-stat__value">{items}</div>
          <div class="kc-stat__label">Items</div>
        </div>
      </div>
      <div class="kc-brand">
        <div class="kc-brand__wordmark">
          KICK<span class="kc-brand__kick">CRATES</span>
        </div>
        <div class="kc-brand__sub">
          {season
            ? "Season " +
              season.seasonNumber +
              " · " +
              season.name.toUpperCase()
            : "Loading season…"}
        </div>
      </div>
      <div class="kc-head__right">
        <div
          class="kc-xpbar"
          title={
            me
              ? "Level " +
                me.level +
                " — " +
                me.xpIntoLevel +
                " / " +
                me.xpForNextLevel +
                " XP toward Level " +
                (me.level + 1) +
                " (Total XP: " +
                me.totalXp.toLocaleString() +
                ")"
              : "Sign in to earn XP"
          }
        >
          <span class="kc-xpbar__lbl">LV {level}</span>
          <div class="kc-xpbar__track">
            <div
              class="kc-xpbar__fill"
              style={{ width: progressPct.toFixed(1) + "%" }}
            />
          </div>
          <span class="kc-xpbar__lbl kc-xpbar__lbl--accent">
            {me
              ? me.xpIntoLevel.toLocaleString() +
                " / " +
                me.xpForNextLevel.toLocaleString()
              : "— / —"}
          </span>
        </div>
        {username ? (
          <button
            class="kc-avatar-chip kc-avatar-chip--btn"
            type="button"
            onClick={() => props.onProfileClick?.()}
            title="Open profile"
          >
            <div
              class="kc-avatar"
              style={{
                backgroundImage: props.avatar
                  ? "url(" + props.avatar + ")"
                  : "none",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1px",
                textAlign: "left",
              }}
            >
              <div class="kc-avatar-chip__name">{username}</div>
              <div class="kc-avatar-chip__sub">Lv {level}</div>
            </div>
          </button>
        ) : null}
        <button
          class="kc-close"
          aria-label="Close KickCrates"
          onClick={() => closeDialog()}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function Tabs(props: { current: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: Array<{ k: TabKey; label: string; icon: h.JSX.Element }> = [
    { k: "crates", label: "Crates", icon: <IconCrate /> },
    { k: "battlepass", label: "Battle Pass", icon: <IconStar /> },
    { k: "collection", label: "Collection", icon: <IconGrid /> },
    { k: "loadout", label: "Loadout", icon: <IconUser /> },
    { k: "profile", label: "Profile", icon: <IconProfile /> },
  ];
  return (
    <div class="kc-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          class="kc-tab"
          role="tab"
          aria-selected={props.current === t.k}
          onClick={() => props.onChange(t.k)}
        >
          <span class="kc-tab__icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function IconCrate() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 5l6-3 6 3v6l-6 3-6-3V5zm2 1.3v3.8l4 2v-3.8l-4-2zm8 0l-4 2v3.8l4-2V6.3z" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1l2.2 4.5 5 .7-3.6 3.5.8 5L8 12.3 3.6 14.7l.8-5L.8 6.2l5-.7L8 1z" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="6" r="3" />
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5v1H2v-1z" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1l1.9 3.8 4.2.6-3 3 .7 4.1L8 10.6l-3.8 2 .7-4.1-3-3 4.2-.6L8 1z" />
    </svg>
  );
}

function compactNumber(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
}

function humanError(msg: string): string {
  if (!msg) return "Something went wrong.";
  if (msg.includes("CRATE_NOT_READY")) return "This crate isn't ready yet.";
  if (msg.includes("CRATE_INSUFFICIENT_TOKENS"))
    return "You don't have any tokens for this crate.";
  if (msg.includes("QUEST_NOT_COMPLETE")) return "Quest isn't complete yet.";
  if (msg.includes("QUEST_ALREADY_CLAIMED"))
    return "You already claimed this quest.";
  if (msg.includes("TIER_NOT_REACHED"))
    return "You haven't reached this tier yet.";
  if (msg.includes("TIER_ALREADY_CLAIMED"))
    return "You already claimed this tier.";
  if (msg.includes("TIER_OUT_OF_RANGE")) return "Invalid tier number.";
  if (
    msg.includes("UNAUTHENTICATED") ||
    msg.includes("TOKEN_REVOKED") ||
    msg.includes("TOKEN_EXPIRED")
  ) {
    return "Session expired. Sign in again.";
  }
  if (msg.includes("RATE_LIMITED")) return "Slow down — too many actions.";
  if (msg.includes("USER_BANNED")) return "This account has been banned.";
  return msg.replace(/^ConvexError:\s*/, "").slice(0, 240);
}
