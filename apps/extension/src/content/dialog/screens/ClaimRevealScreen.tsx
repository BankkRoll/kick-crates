import { useEffect, useState } from "preact/hooks";

import type { Id } from "../../../../../../convex/_generated/dataModel.js";
import { inlineSvg } from "../../svgUri.js";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type ItemType = "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";

/** Item shape used by {@link ClaimReveal}'s card/grid layouts — slim projection that drops server-only fields. */
export type ClaimItem = {
  _id: Id<"items">;
  slug: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  assetSvg: string;
  animated: boolean;
  description: string;
};

/** Unified payload shape for all three reveal variants (welcome kit, quest claim, tier claim); unused numeric fields are simply omitted per-variant. */
export type ClaimPayload = {
  variant: "welcome" | "quest" | "tier";
  eyebrow: string;
  title: string;
  subtitle?: string;
  items: ClaimItem[];
  xpAwarded?: number;
  scrapAwarded?: number;
  tokensAwarded?: number;
  duplicateScrap?: number;
};

type Stage = "intro" | "item" | "summary" | "closing";

/**
 * Full-screen staged reveal for welcome kits, quest rewards, and tier
 * claims.
 *
 * Welcome kits play the full `intro → item[] → summary` walkthrough
 * (1.8 s intro timer, then one `item` stage per reward before landing
 * on the summary). Quest and tier variants skip straight to `summary`
 * since they only ever yield a single reward + a bonus tally. The
 * acknowledge step runs `onAcknowledge` after a 260 ms `closing`
 * transition so the caller can clear the payload once the exit
 * animation completes — closing immediately would cut the animation.
 */
export function ClaimReveal(props: {
  payload: ClaimPayload;
  onAcknowledge: () => void;
}) {
  const hasWalkthrough = props.payload.variant === "welcome";
  const hasIntro = props.payload.variant === "welcome";
  const [stage, setStage] = useState<Stage>(hasIntro ? "intro" : "summary");
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (!hasIntro) return;
    const t = window.setTimeout(() => {
      setStage(
        hasWalkthrough && props.payload.items.length > 0 ? "item" : "summary",
      );
    }, 1800);
    return () => window.clearTimeout(t);
  }, []);

  function advance() {
    if (stage === "intro") {
      setStage(
        hasWalkthrough && props.payload.items.length > 0 ? "item" : "summary",
      );
      return;
    }
    if (stage === "item") {
      if (stepIdx < props.payload.items.length - 1) {
        setStepIdx(stepIdx + 1);
      } else {
        setStage("summary");
      }
      return;
    }
    if (stage === "summary") {
      setStage("closing");
      window.setTimeout(() => props.onAcknowledge(), 260);
    }
  }

  const currentItem = props.payload.items[stepIdx] ?? null;

  return (
    <div class="kc-claim" role="dialog" aria-modal="true" data-stage={stage}>
      <div class="kc-claim__bg" aria-hidden="true">
        <div class="kc-claim__orb kc-claim__orb--1" />
        <div class="kc-claim__orb kc-claim__orb--2" />
        <div class="kc-claim__orb kc-claim__orb--3" />
      </div>

      {stage === "intro" ? (
        <IntroStage
          eyebrow={props.payload.eyebrow}
          title={props.payload.title}
          subtitle={props.payload.subtitle ?? ""}
          onSkip={advance}
        />
      ) : null}

      {stage === "item" && currentItem ? (
        <ItemStage
          item={currentItem}
          step={stepIdx + 1}
          total={props.payload.items.length}
          onContinue={advance}
        />
      ) : null}

      {stage === "summary" ? (
        <SummaryStage payload={props.payload} onClaim={advance} />
      ) : null}
    </div>
  );
}

function IntroStage(props: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onSkip: () => void;
}) {
  return (
    <div class="kc-claim__stage kc-claim__stage--intro">
      <div class="kc-claim__logo" aria-hidden="true">
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="kc-claim-logo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#53fc18" />
              <stop offset="100%" stop-color="#2cb70b" />
            </linearGradient>
          </defs>
          <polygon
            points="60,10 104,34 104,86 60,110 16,86 16,34"
            fill="url(#kc-claim-logo-g)"
          />
          <polygon
            points="60,24 90,42 90,78 60,96 30,78 30,42"
            fill="#0b0b0c"
            opacity="0.55"
          />
          <circle cx="60" cy="60" r="14" fill="#0b0b0c" />
          <circle cx="60" cy="60" r="7" fill="#53fc18" />
        </svg>
      </div>
      <div class="kc-claim__eyebrow">{props.eyebrow}</div>
      <h1 class="kc-claim__title">{props.title}</h1>
      {props.subtitle ? <p class="kc-claim__sub">{props.subtitle}</p> : null}
      <button class="kc-btn kc-btn--primary kc-btn--lg" onClick={props.onSkip}>
        Continue
      </button>
    </div>
  );
}

function ItemStage(props: {
  item: ClaimItem;
  step: number;
  total: number;
  onContinue: () => void;
}) {
  const rarityColor = rarityHex(props.item.rarity);
  return (
    <div class="kc-claim__stage kc-claim__stage--item">
      <div class="kc-claim__banner" style={{ color: rarityColor }}>
        {props.item.rarity} Reward · {props.step} / {props.total}
      </div>
      <div
        class={"kc-claim__art kc-claim__art--" + props.item.rarity}
        dangerouslySetInnerHTML={inlineSvg(props.item.assetSvg)}
      />
      <h2 class="kc-claim__name">{props.item.name}</h2>
      <div class="kc-claim__type">{friendlyType(props.item.type)}</div>
      {props.item.description ? (
        <p class="kc-claim__desc">{props.item.description}</p>
      ) : null}
      <button
        class="kc-btn kc-btn--primary kc-btn--lg"
        onClick={props.onContinue}
      >
        {props.step < props.total ? "Next reward" : "Finish opening"}
      </button>
    </div>
  );
}

function SummaryStage(props: { payload: ClaimPayload; onClaim: () => void }) {
  const p = props.payload;
  const hasItems = p.items.length > 0;
  const buttonLabel =
    p.variant === "welcome"
      ? "Claim & start watching"
      : p.variant === "tier"
        ? "Claim tier reward"
        : "Claim reward";
  return (
    <div class="kc-claim__stage kc-claim__stage--summary">
      <div class="kc-claim__eyebrow">{p.eyebrow}</div>
      <h2 class="kc-claim__title kc-claim__title--sm">{p.title}</h2>
      {p.subtitle ? <p class="kc-claim__sub">{p.subtitle}</p> : null}

      {hasItems ? (
        <div
          class={
            "kc-claim__grid " +
            (p.items.length === 1 ? "kc-claim__grid--single" : "")
          }
        >
          {p.items.map((it) => (
            <div
              class={"kc-claim__grid-item kc-claim__grid-item--" + it.rarity}
            >
              <div
                class="kc-claim__grid-art"
                dangerouslySetInnerHTML={inlineSvg(it.assetSvg)}
              />
              <div class="kc-claim__grid-name">{it.name}</div>
              <div class="kc-claim__grid-type">{friendlyType(it.type)}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div class="kc-claim__bonuses">
        {p.xpAwarded !== undefined && p.xpAwarded > 0 ? (
          <div class="kc-claim__bonus">
            <div class="kc-claim__bonus-v">+{p.xpAwarded}</div>
            <div class="kc-claim__bonus-l">XP</div>
          </div>
        ) : null}
        {p.scrapAwarded !== undefined && p.scrapAwarded > 0 ? (
          <div class="kc-claim__bonus">
            <div class="kc-claim__bonus-v">+{p.scrapAwarded}</div>
            <div class="kc-claim__bonus-l">Scrap</div>
          </div>
        ) : null}
        {p.tokensAwarded !== undefined && p.tokensAwarded > 0 ? (
          <div class="kc-claim__bonus">
            <div class="kc-claim__bonus-v">+{p.tokensAwarded}</div>
            <div class="kc-claim__bonus-l">Crate Tokens</div>
          </div>
        ) : null}
        {p.duplicateScrap !== undefined && p.duplicateScrap > 0 ? (
          <div class="kc-claim__bonus kc-claim__bonus--dup">
            <div class="kc-claim__bonus-v">+{p.duplicateScrap}</div>
            <div class="kc-claim__bonus-l">Duplicate Scrap</div>
          </div>
        ) : null}
      </div>

      <button class="kc-btn kc-btn--primary kc-btn--lg" onClick={props.onClaim}>
        {buttonLabel}
      </button>
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

function friendlyType(t: ItemType): string {
  switch (t) {
    case "emote":
      return "Chat Emote";
    case "badge":
      return "Chat Badge";
    case "nameColor":
      return "Name Color";
    case "profileCard":
      return "Profile Card";
    case "chatFlair":
      return "Chat Flair";
  }
}
