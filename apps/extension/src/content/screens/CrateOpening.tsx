import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import type { Id } from "../../../../../convex/_generated/dataModel.js";
import { inlineSvg } from "../svgUri.js";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type CrateOpenResult = {
  rollSeed: string;
  featuredItemId: Id<"items">;
  results: Array<{
    itemId: Id<"items">;
    rarity: Rarity;
    wasDuplicate: boolean;
    scrapAwarded: number;
  }>;
  totalScrapAwarded: number;
  xpAwarded: number;
  newTotalXp: number;
  newLevel: number;
  newScrap: number;
};

export type Item = {
  _id: Id<"items">;
  slug: string;
  name: string;
  type: "emote" | "badge" | "nameColor" | "profileCard" | "chatFlair";
  rarity: Rarity;
  assetSvg: string;
  animated: boolean;
};

type Phase =
  | "buildup"
  | "opening"
  | "spinning"
  | "flashing"
  | "docking"
  | "finale"
  | "closing";

const PHASE_MS: Record<Exclude<Phase, "finale" | "closing">, number> = {
  buildup: 1400,
  opening: 700,
  spinning: 1100,
  flashing: 480,
  docking: 360,
};
const CLOSE_FADE_MS = 220;

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const FILLER_COUNT = 80;
const WIN_INDEX_FROM_START = 55;
const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/** Fullscreen 3-act crate-opening flow: buildup/lid open, then per-card spin → flash → dock, then a grid finale with totals. */
export function CrateOpening(props: {
  result: CrateOpenResult;
  items: Item[];
  onClose: () => void;
}) {
  const totalCards = props.result.results.length;
  const [phase, setPhase] = useState<Phase>("buildup");
  const [cardIdx, setCardIdx] = useState(0);
  const [dockedCount, setDockedCount] = useState(0);
  const [stripAnimated, setStripAnimated] = useState(false);
  const closingRef = useRef(false);

  const itemLookup = useMemo(() => {
    const m = new Map<string, Item>();
    for (const it of props.items) m.set(it._id as unknown as string, it);
    return m;
  }, [props.items]);

  const peakRarity = useMemo<Rarity>(() => {
    let best: Rarity = "common";
    for (const r of props.result.results) {
      if (RARITY_RANK[r.rarity] > RARITY_RANK[best]) best = r.rarity;
    }
    return best;
  }, [props.result.results]);

  const currentResult =
    props.result.results[cardIdx] ?? props.result.results[0]!;
  const currentItem =
    itemLookup.get(currentResult.itemId as unknown as string) ?? null;

  const strip = useMemo(() => {
    const arr: Array<{ key: string; rarity: Rarity; item: Item | null }> = [];
    let seed = hashSeed(props.result.rollSeed + ":" + cardIdx);
    function prng(): number {
      seed = (seed ^ (seed << 13)) >>> 0;
      seed = (seed ^ (seed >>> 17)) >>> 0;
      seed = (seed ^ (seed << 5)) >>> 0;
      return (seed >>> 0) / 0x1_0000_0000;
    }
    const pool = props.items;
    for (let i = 0; i < FILLER_COUNT; i++) {
      if (pool.length === 0) {
        arr.push({ key: "f" + i, rarity: "common", item: null });
        continue;
      }
      const pick = pool[Math.floor(prng() * pool.length)]!;
      arr.push({ key: "f" + i, rarity: pick.rarity, item: pick });
    }
    arr[WIN_INDEX_FROM_START] = {
      key: "win",
      rarity: currentResult.rarity,
      item: currentItem,
    };
    return arr;
  }, [
    props.result.rollSeed,
    cardIdx,
    props.items,
    currentItem,
    currentResult.rarity,
  ]);

  const stripTranslateX = useMemo(() => {
    const baseOffset = -(WIN_INDEX_FROM_START * (CARD_WIDTH + CARD_GAP));
    const jitter =
      ((hashSeed(props.result.rollSeed + ":" + cardIdx) % 41) - 20) * 1.5;
    return baseOffset + jitter + CARD_WIDTH / 2;
  }, [props.result.rollSeed, cardIdx]);

  function close(): void {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("closing");
    window.setTimeout(() => props.onClose(), CLOSE_FADE_MS);
  }

  function advanceToNextCardOrFinale(): void {
    setDockedCount(cardIdx + 1);
    if (cardIdx + 1 >= totalCards) {
      setPhase("finale");
    } else {
      setCardIdx(cardIdx + 1);
      setPhase("spinning");
    }
  }

  function skip(): void {
    if (phase === "buildup" || phase === "opening") {
      setPhase("spinning");
      return;
    }
    if (phase === "spinning" || phase === "flashing" || phase === "docking") {
      advanceToNextCardOrFinale();
    }
  }

  useEffect(() => {
    let timer: number | undefined;
    if (phase === "buildup") {
      timer = window.setTimeout(() => setPhase("opening"), PHASE_MS.buildup);
    } else if (phase === "opening") {
      timer = window.setTimeout(() => setPhase("spinning"), PHASE_MS.opening);
    } else if (phase === "spinning") {
      timer = window.setTimeout(() => setPhase("flashing"), PHASE_MS.spinning);
    } else if (phase === "flashing") {
      timer = window.setTimeout(() => setPhase("docking"), PHASE_MS.flashing);
    } else if (phase === "docking") {
      timer = window.setTimeout(advanceToNextCardOrFinale, PHASE_MS.docking);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [phase, cardIdx, totalCards]);

  useEffect(() => {
    if (phase !== "spinning") return;
    setStripAnimated(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setStripAnimated(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [phase, cardIdx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (phase === "finale") {
        close();
      } else {
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, cardIdx]);

  const showCrate = phase === "buildup" || phase === "opening";
  const showWheel =
    phase === "spinning" || phase === "flashing" || phase === "docking";
  const showDock = !showCrate;
  const showFinale = phase === "finale";

  return (
    <div
      class="kc-co"
      data-phase={phase}
      data-peak={peakRarity}
      role="dialog"
      aria-modal="true"
      aria-label="Crate opening"
    >
      <div class="kc-co__bg" aria-hidden="true">
        <div class="kc-co__halo" />
      </div>

      {showCrate ? (
        <div class="kc-co__stage" aria-hidden={!showCrate}>
          <CrateBox rarity={peakRarity} phase={phase} />
        </div>
      ) : null}

      {showWheel ? (
        <div class="kc-co__wheel">
          <div class="kc-co__wheel-title">
            Card {cardIdx + 1} of {totalCards}
          </div>
          <div class="kc-co__wheel-stage">
            <div
              class="kc-co__pointer kc-co__pointer--top"
              aria-hidden="true"
            />
            <div
              class="kc-co__pointer kc-co__pointer--bottom"
              aria-hidden="true"
            />
            <div
              class={
                "kc-co__strip" +
                (stripAnimated ? " kc-co__strip--animated" : "")
              }
              style={{
                transform:
                  "translateY(-50%) translateX(" +
                  (stripAnimated ? stripTranslateX : 0) +
                  "px)",
              }}
            >
              {strip.map((c, i) => (
                <CardView
                  key={c.key}
                  rarity={c.rarity}
                  item={c.item}
                  featured={i === WIN_INDEX_FROM_START && phase !== "spinning"}
                />
              ))}
            </div>
          </div>
          <div class="kc-co__skip-hint" aria-hidden="true">
            Space / Enter to skip
          </div>
        </div>
      ) : null}

      {(phase === "flashing" || phase === "docking") && currentItem ? (
        <FlashCard
          phase={phase}
          rarity={currentResult.rarity}
          item={currentItem}
          wasDuplicate={currentResult.wasDuplicate}
          scrapAwarded={currentResult.scrapAwarded}
        />
      ) : null}

      {showDock ? (
        <Dock
          slots={props.result.results}
          itemLookup={itemLookup}
          dockedCount={dockedCount}
          totalCards={totalCards}
        />
      ) : null}

      {showFinale ? (
        <Finale
          result={props.result}
          itemLookup={itemLookup}
          onContinue={close}
        />
      ) : null}
    </div>
  );
}

function CrateBox(props: { rarity: Rarity; phase: Phase }) {
  const color = RARITY_HEX[props.rarity];
  return (
    <div class="kc-co__crate" data-phase={props.phase}>
      <svg
        viewBox="0 0 240 280"
        xmlns="http://www.w3.org/2000/svg"
        class="kc-co__crate-svg"
      >
        <defs>
          <linearGradient id="kc-co-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={color} stop-opacity="0.95" />
            <stop offset="100%" stop-color="#0b0b0c" stop-opacity="0.95" />
          </linearGradient>
          <linearGradient id="kc-co-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={color} />
            <stop offset="100%" stop-color={color} stop-opacity="0.4" />
          </linearGradient>
          <radialGradient id="kc-co-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color={color} stop-opacity="0.5" />
            <stop offset="60%" stop-color={color} stop-opacity="0.08" />
            <stop offset="100%" stop-color={color} stop-opacity="0" />
          </radialGradient>
          <radialGradient id="kc-co-flash" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="60%" stop-color={color} stop-opacity="0.7" />
            <stop offset="100%" stop-color={color} stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx="120"
          cy="160"
          r="120"
          fill="url(#kc-co-halo)"
          class="kc-co__crate-halo"
        />

        <g class="kc-co__crate-base">
          <polygon
            points="40,140 120,170 200,140 200,230 120,260 40,230"
            fill="url(#kc-co-body)"
            stroke="url(#kc-co-edge)"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <polygon
            points="120,170 120,260 40,230 40,140"
            fill="#000"
            opacity="0.3"
          />
          <polygon
            points="120,190 138,212 120,234 102,212"
            fill={color}
            stroke="#0b0b0c"
            stroke-width="2"
          />
          <polygon
            points="120,200 130,212 120,224 110,212"
            fill="#fff"
            opacity="0.85"
          />
          <rect
            x="40"
            y="190"
            width="160"
            height="4"
            fill={color}
            opacity="0.6"
            transform="skewX(-5)"
          />
        </g>

        <g class="kc-co__crate-lid">
          <polygon
            points="40,90 120,60 200,90 120,120"
            fill="url(#kc-co-body)"
            stroke="url(#kc-co-edge)"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <polygon points="120,60 200,90 120,120" fill="#000" opacity="0.2" />
          <circle cx="120" cy="92" r="6" fill={color} />
          <circle cx="120" cy="92" r="2.5" fill="#fff" />
        </g>

        <rect
          class="kc-co__crate-beam"
          x="100"
          y="0"
          width="40"
          height="180"
          fill="url(#kc-co-flash)"
        />

        <circle
          cx="120"
          cy="120"
          r="180"
          fill="url(#kc-co-flash)"
          class="kc-co__crate-flash"
        />
      </svg>

      <div class="kc-co__sparks" aria-hidden="true">
        <span class="kc-co__spark kc-co__spark--1" />
        <span class="kc-co__spark kc-co__spark--2" />
        <span class="kc-co__spark kc-co__spark--3" />
        <span class="kc-co__spark kc-co__spark--4" />
      </div>
    </div>
  );
}

function CardView(props: {
  rarity: Rarity;
  item: Item | null;
  featured: boolean;
}) {
  const classes = [
    "kc-card",
    "kc-card--" + props.rarity,
    props.featured ? "kc-card--featured" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div class={classes}>
      <div
        class="kc-card__art"
        dangerouslySetInnerHTML={inlineSvg(props.item?.assetSvg)}
      />
      <div class="kc-card__meta">
        <div class="kc-card__name" title={props.item?.name ?? ""}>
          {props.item?.name ?? "???"}
        </div>
        <div class="kc-card__rarity">{props.rarity}</div>
      </div>
    </div>
  );
}

function FlashCard(props: {
  phase: Phase;
  rarity: Rarity;
  item: Item;
  wasDuplicate: boolean;
  scrapAwarded: number;
}) {
  const color = RARITY_HEX[props.rarity];
  return (
    <div
      class={"kc-co__flash kc-co__flash--" + props.rarity}
      data-phase={props.phase}
      style={{ color }}
      aria-live="polite"
    >
      <div class="kc-co__flash-banner">{props.rarity}</div>
      <div
        class="kc-co__flash-art"
        dangerouslySetInnerHTML={inlineSvg(props.item.assetSvg)}
      />
      <div class="kc-co__flash-name">{props.item.name}</div>
      <div class="kc-co__flash-type">{friendlyType(props.item.type)}</div>
      {props.wasDuplicate ? (
        <div class="kc-co__flash-tag kc-co__flash-tag--dup">
          Duplicate · +{props.scrapAwarded} scrap
        </div>
      ) : (
        <div class="kc-co__flash-tag kc-co__flash-tag--new">New</div>
      )}
    </div>
  );
}

function Dock(props: {
  slots: CrateOpenResult["results"];
  itemLookup: Map<string, Item>;
  dockedCount: number;
  totalCards: number;
}) {
  return (
    <div class="kc-co__dock" aria-label="Cards collected">
      <div class="kc-co__dock-head">
        <span class="kc-co__dock-count">
          {props.dockedCount} / {props.totalCards}
        </span>
        <span class="kc-co__dock-label">Collected</span>
      </div>
      <div class="kc-co__dock-row">
        {props.slots.map((r, i) => {
          const filled = i < props.dockedCount;
          const item = filled
            ? props.itemLookup.get(r.itemId as unknown as string) ?? null
            : null;
          const justFilled = filled && i === props.dockedCount - 1;
          return (
            <div
              class={"kc-co__dock-slot kc-co__dock-slot--" + r.rarity}
              data-filled={filled ? "true" : "false"}
              data-just-filled={justFilled ? "true" : "false"}
              title={item?.name ?? "Card " + (i + 1)}
            >
              {item ? (
                <div
                  class="kc-co__dock-art"
                  dangerouslySetInnerHTML={inlineSvg(item.assetSvg)}
                />
              ) : (
                <div class="kc-co__dock-placeholder">{i + 1}</div>
              )}
              {filled && r.wasDuplicate ? (
                <div
                  class="kc-co__dock-dup"
                  title="Duplicate — converted to scrap"
                >
                  +{r.scrapAwarded}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Finale(props: {
  result: CrateOpenResult;
  itemLookup: Map<string, Item>;
  onContinue: () => void;
}) {
  const newCount = props.result.results.filter((r) => !r.wasDuplicate).length;
  const dupeCount = props.result.results.length - newCount;
  return (
    <div class="kc-co__finale" role="dialog" aria-label="Crate summary">
      <div class="kc-co__finale-eyebrow">Crate complete</div>
      <h2 class="kc-co__finale-title">
        {newCount > 0
          ? newCount + " new · " + dupeCount + " duplicate"
          : "All duplicates — converted to scrap"}
      </h2>

      <div class="kc-co__finale-grid">
        {props.result.results.map((r) => {
          const item =
            props.itemLookup.get(r.itemId as unknown as string) ?? null;
          return (
            <div class={"kc-co__finale-card kc-co__finale-card--" + r.rarity}>
              <div
                class="kc-co__finale-art"
                dangerouslySetInnerHTML={inlineSvg(item?.assetSvg)}
              />
              <div class="kc-co__finale-name">{item?.name ?? "???"}</div>
              <div class="kc-co__finale-rarity">{r.rarity}</div>
              <div
                class={
                  "kc-co__finale-status " +
                  (r.wasDuplicate
                    ? "kc-co__finale-status--dup"
                    : "kc-co__finale-status--new")
                }
              >
                {r.wasDuplicate ? "+" + r.scrapAwarded + " scrap" : "New"}
              </div>
            </div>
          );
        })}
      </div>

      <div class="kc-co__finale-totals">
        <div class="kc-co__finale-total">
          <div class="kc-co__finale-total-v">+{props.result.xpAwarded}</div>
          <div class="kc-co__finale-total-l">XP</div>
        </div>
        {props.result.totalScrapAwarded > 0 ? (
          <div class="kc-co__finale-total">
            <div class="kc-co__finale-total-v">
              +{props.result.totalScrapAwarded}
            </div>
            <div class="kc-co__finale-total-l">Scrap</div>
          </div>
        ) : null}
        <div class="kc-co__finale-total">
          <div class="kc-co__finale-total-v">Lv {props.result.newLevel}</div>
          <div class="kc-co__finale-total-l">Level</div>
        </div>
      </div>

      <button
        class="kc-btn kc-btn--primary kc-btn--lg"
        onClick={props.onContinue}
        autofocus
      >
        Continue
      </button>
    </div>
  );
}

const RARITY_HEX: Record<Rarity, string> = {
  common: "#9fc7a6",
  uncommon: "#78e48c",
  rare: "#66d4ff",
  epic: "#c78bff",
  legendary: "#ffd866",
};

function friendlyType(t: string): string {
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
    default:
      return "Cosmetic";
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
