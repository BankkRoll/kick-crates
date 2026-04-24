import type { Id } from "../../../../../../convex/_generated/dataModel.js";

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

/**
 * "Crates" tab — renders one `CrateCard` per crate definition.
 *
 * Crates are sorted by the fixed kind order (`season` → `daily` →
 * `weekly` → `monthly`) rather than by creation time, so the tab layout
 * stays stable across seasons and new crate rows don't reshuffle the
 * grid. `onOpen(slug)` is plumbed up to the Convex `crate/open`
 * mutation — the panel itself doesn't know about auth or Convex.
 */
export function CratesPanel(props: {
  crates: CrateDef[];
  states: CrateState[];
  onOpen: (slug: string) => void;
  busy: boolean;
}) {
  const sorted = [...props.crates].sort(
    (a, b) => crateOrder(a.slug) - crateOrder(b.slug),
  );
  return (
    <div class="kc-panel">
      <div class="kc-section">
        <div class="kc-section__eyebrow">Earn by Watching</div>
        <h2 class="kc-section__title">Available Crates</h2>
        <div class="kc-crates-grid">
          {sorted.map((c) => (
            <CrateCard
              crate={c}
              state={props.states.find((s) => s.crateDefId === c._id)}
              onOpen={props.onOpen}
              busy={props.busy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function crateOrder(slug: string): number {
  switch (slug) {
    case "season":
      return 0;
    case "daily":
      return 1;
    case "weekly":
      return 2;
    case "monthly":
      return 3;
    default:
      return 99;
  }
}

function CrateCard(props: {
  crate: CrateDef;
  state: CrateState | undefined;
  onOpen: (slug: string) => void;
  busy: boolean;
}) {
  const { crate, state } = props;
  const now = Date.now();
  const need = (crate.watchMinutesRequired ?? 0) * 60;
  const earned = state?.secondsEarned ?? 0;
  const cooldownUntil =
    crate.cooldownHours && state?.lastOpenedAt
      ? state.lastOpenedAt + crate.cooldownHours * 3600 * 1000
      : 0;
  const onCooldown = cooldownUntil > now;

  let ready = false;
  let tag = "LOCKED";
  let progressText = "";
  let pct = 0;
  let tertiaryText: string | null = null;

  if (crate.tokenGated) {
    const tokens = state?.tokensHeld ?? 0;
    ready = tokens > 0;
    tag = ready ? "READY" : "LOCKED";
    pct = ready ? 100 : 0;
    progressText = tokens + " token" + (tokens === 1 ? "" : "s");
    tertiaryText = ready
      ? "Ready to open"
      : "Reach Battle Pass tiers to earn tokens";
  } else {
    pct = need > 0 ? Math.min(100, (earned / need) * 100) : 100;
    if (onCooldown) {
      ready = false;
      tag = "LOCKED";
      progressText = "Resets in " + formatDur(cooldownUntil - now);
      tertiaryText = "Opened — wait for cooldown";
    } else if (earned >= need) {
      ready = true;
      tag = "READY";
      progressText =
        Math.floor(need / 60) + "/" + Math.floor(need / 60) + " min";
      tertiaryText = "Ready to Open!";
    } else {
      ready = false;
      tag = "LOCKED";
      progressText =
        Math.floor(earned / 60) + "/" + Math.floor(need / 60) + " min";
      tertiaryText =
        "Watch " + Math.max(1, Math.ceil((need - earned) / 60)) + " more min";
    }
  }

  return (
    <article class="kc-crate" data-ready={ready ? "true" : "false"}>
      <div class="kc-crate__art">
        <div class={"kc-crate-tag " + (ready ? "kc-crate-tag--ready" : "")}>
          {tag}
        </div>
        <div class="kc-crate-cards-badge" title="Cards per open">
          {crate.cardsPerOpen}× cards
        </div>
        <div class="kc-crate-glyph" aria-hidden="true">
          <CrateGlyph slug={crate.slug} ready={ready} />
        </div>
      </div>
      <div class="kc-crate__body">
        <div class="kc-crate__name">{crate.name}</div>
        <div class="kc-crate__desc">{crate.description}</div>
        {!crate.tokenGated ? (
          <div>
            <div
              class={
                "kc-crate__progress " +
                (ready ? "kc-crate__progress--ready" : "")
              }
            >
              <div
                class="kc-crate__progress-fill"
                style={{ width: pct.toFixed(1) + "%" }}
              />
            </div>
            <div class="kc-crate__progress-label">
              <span>{progressText}</span>
              <span class={ready ? "kc-ready-text" : ""}>
                {ready ? "100%" : pct.toFixed(0) + "%"}
              </span>
            </div>
            {tertiaryText ? (
              <div
                class="kc-crate__progress-label"
                style={{ marginTop: "2px" }}
              >
                <span class={ready ? "kc-ready-text" : ""}>{tertiaryText}</span>
                <span />
              </div>
            ) : null}
          </div>
        ) : (
          <div class="kc-crate__progress-label">
            <span class={ready ? "kc-ready-text" : ""}>
              {tertiaryText ?? progressText}
            </span>
            <span>{progressText}</span>
          </div>
        )}
        <button
          class={"kc-btn " + (ready ? "kc-btn--primary" : "kc-btn--secondary")}
          disabled={!ready || props.busy}
          onClick={() => ready && props.onOpen(crate.slug)}
        >
          {crate.tokenGated && !ready
            ? "No Tokens"
            : !ready
              ? "Not Ready"
              : "Open Crate"}
        </button>
      </div>
    </article>
  );
}

function formatDur(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

function CrateGlyph(props: { slug: string; ready: boolean }) {
  const color = props.ready ? "#78e48c" : "#3d5a45";
  if (props.slug === "season") {
    return (
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter
            id="kc-glow-season"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points="60,16 100,40 100,80 60,104 20,80 20,40"
          fill="none"
          stroke={color}
          stroke-width="3"
          filter={props.ready ? "url(#kc-glow-season)" : undefined}
        />
        <circle
          cx="60"
          cy="60"
          r="14"
          fill="none"
          stroke={color}
          stroke-width="2.5"
        />
        <circle cx="60" cy="60" r="5" fill={color} />
      </svg>
    );
  }
  if (props.slug === "daily") {
    return (
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter
            id="kc-glow-daily"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={props.ready ? "url(#kc-glow-daily)" : undefined}>
          <rect
            x="24"
            y="34"
            width="72"
            height="56"
            rx="4"
            fill="none"
            stroke={color}
            stroke-width="3"
          />
          <rect
            x="24"
            y="34"
            width="72"
            height="12"
            fill={color}
            opacity="0.25"
          />
          <rect
            x="52"
            y="30"
            width="16"
            height="16"
            rx="2"
            fill={color}
            opacity="0.5"
          />
          <rect
            x="52"
            y="52"
            width="16"
            height="28"
            rx="2"
            fill={color}
            opacity="0.7"
          />
        </g>
      </svg>
    );
  }
  if (props.slug === "weekly") {
    return (
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter
            id="kc-glow-weekly"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={props.ready ? "url(#kc-glow-weekly)" : undefined}>
          <rect
            x="22"
            y="30"
            width="76"
            height="60"
            rx="6"
            fill="none"
            stroke={color}
            stroke-width="3"
          />
          <path d="M22 48 h76" stroke={color} stroke-width="2" opacity="0.6" />
          <circle cx="60" cy="64" r="8" fill={color} opacity="0.55" />
          <path
            d="M56 64 l4 4 l8 -8"
            stroke="#0a0e0b"
            stroke-width="2"
            fill="none"
          />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter
          id="kc-glow-monthly"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={props.ready ? "url(#kc-glow-monthly)" : undefined}>
        <path
          d="M20 44 l40 -20 l40 20 v36 l-40 20 l-40 -20 z"
          fill="none"
          stroke={color}
          stroke-width="3"
        />
        <path d="M60 24 v76" stroke={color} stroke-width="2" opacity="0.4" />
        <circle cx="60" cy="62" r="10" fill={color} opacity="0.6" />
        <path
          d="M56 62 l4 4 l8 -8"
          stroke="#0a0e0b"
          stroke-width="2"
          fill="none"
        />
      </g>
    </svg>
  );
}
