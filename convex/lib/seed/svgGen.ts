import * as funEmoji from "@dicebear/fun-emoji";

import type { ItemType, Rarity } from "../constants.js";

import { createAvatar } from "@dicebear/core";

// Item art is computed deterministically from the item slug + type + rarity
// at seed time and stored as raw inline SVG markup in items.assetSvg.
//
// Design principles:
//   1. COLOR comes from the slug, not rarity. Each item has its own palette
//      so a "leaf-green" name color is actually green, a "watcher-gold"
//      badge is actually gold, a "flair-ember" flair is actually orange.
//      Unknown slugs hash-derive a unique hue so new items automatically
//      get their own color scheme.
//   2. RARITY adds polish — stroke weight, glow radius, sheen layers,
//      corner studs, sparkles. Higher tier = visibly richer, same color.
//   3. EMOTES map their slug to explicit DiceBear fun-emoji eye+mouth
//      combinations so names match faces (smile → cute + lilSmile,
//      pog → stars + shout, etc.).
//   4. All SVGs use a 1:1 128×128 viewBox with no explicit width/height
//      attributes, so the host container's CSS fully drives sizing.

// ═══════════════════════════════════════════════════════════════════════
// Palette: per-slug overrides + hash fallback
// ═══════════════════════════════════════════════════════════════════════
type ItemPalette = {
  primary: string;
  secondary: string;
  accent: string;
  deep: string; // dark anchor used for text / bg contrasts
};

function hexFromHsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + hex(r) + hex(g) + hex(b);
}

// Explicit palettes for named items — picked to match each item's NAME.
// Anything not here falls back to hash-derived HSL so new items still get
// deterministic unique colors.
const SLUG_PALETTE: Record<string, ItemPalette> = {
  // ── Name colors — name literally describes the color ──
  "leaf-green": {
    primary: "#9ad69a",
    secondary: "#5fb85f",
    accent: "#c6e8c6",
    deep: "#1e3820",
  },
  "forest-green": {
    primary: "#2f7a3f",
    secondary: "#184a22",
    accent: "#5ba66c",
    deep: "#0a1e10",
  },
  "emerald-gradient": {
    primary: "#26c6a6",
    secondary: "#1e8a6b",
    accent: "#6fe6c8",
    deep: "#062820",
  },
  aurora: {
    primary: "#9b5de5",
    secondary: "#00bbf9",
    accent: "#f15bb5",
    deep: "#1a0b38",
  },
  "sunset-chroma": {
    primary: "#ff9a56",
    secondary: "#ff4d8f",
    accent: "#ffd26f",
    deep: "#3a1014",
  },

  // ── Badges — named after materials ──
  "watcher-bronze": {
    primary: "#cd7f32",
    secondary: "#8b5a2b",
    accent: "#e8a857",
    deep: "#2a160a",
  },
  "watcher-silver": {
    primary: "#d4d4d8",
    secondary: "#8a8a90",
    accent: "#f4f4f6",
    deep: "#1f1f23",
  },
  "watcher-gold": {
    primary: "#ffd700",
    secondary: "#b8860b",
    accent: "#ffec8a",
    deep: "#2b1f04",
  },
  "watcher-diamond": {
    primary: "#b9f2ff",
    secondary: "#4a90e2",
    accent: "#ffffff",
    deep: "#0a1e30",
  },
  "founding-badge": {
    primary: "#53fc18",
    secondary: "#0b5a28",
    accent: "#c6ffb0",
    deep: "#061a06",
  },

  // ── Profile cards ──
  "card-matte": {
    primary: "#3a3a3e",
    secondary: "#1a1a1c",
    accent: "#53fc18",
    deep: "#08080a",
  },
  "card-shwompy": {
    primary: "#53fc18",
    secondary: "#2cb70b",
    accent: "#c6ffb0",
    deep: "#061a06",
  },
  "card-circuit": {
    primary: "#00c8ff",
    secondary: "#0068aa",
    accent: "#7dd9ff",
    deep: "#041624",
  },
  "card-holographic": {
    primary: "#ff71ce",
    secondary: "#01cdfe",
    accent: "#fffb96",
    deep: "#1a0b26",
  },
  "card-seasonal-hero": {
    primary: "#53fc18",
    secondary: "#000000",
    accent: "#ffffff",
    deep: "#000000",
  },

  // ── Chat flairs ──
  "flair-ember": {
    primary: "#ff6b35",
    secondary: "#c1292e",
    accent: "#ffd26f",
    deep: "#2a0a04",
  },
  "flair-holo": {
    primary: "#b57edc",
    secondary: "#00e5ff",
    accent: "#ff71ce",
    deep: "#160a2a",
  },
  "flair-shwompy-glow": {
    primary: "#53fc18",
    secondary: "#2cb70b",
    accent: "#c6ffb0",
    deep: "#061a06",
  },
};

function paletteForSlug(slug: string): ItemPalette {
  const override = SLUG_PALETTE[slug];
  if (override) return override;
  // Derive three harmonious colors from the slug hash.
  const hash = hashSeed(slug);
  const hue = hash % 360;
  return {
    primary: hexFromHsl(hue, 72, 58),
    secondary: hexFromHsl(hue + 20, 68, 40),
    accent: hexFromHsl(hue - 30, 80, 72),
    deep: hexFromHsl(hue, 40, 10),
  };
}

// Rarity tweaks visual polish only — never the base hue. The more you earn,
// the richer the same palette reads.
type RarityPolish = {
  strokeWidth: number;
  glowBlur: number;
  sparkles: number;
  sheenOpacity: number;
  frameWidth: number;
  cornerStuds: boolean;
};
const RARITY_POLISH: Record<Rarity, RarityPolish> = {
  common: {
    strokeWidth: 1.5,
    glowBlur: 0,
    sparkles: 0,
    sheenOpacity: 0.0,
    frameWidth: 4,
    cornerStuds: false,
  },
  uncommon: {
    strokeWidth: 2,
    glowBlur: 0,
    sparkles: 0,
    sheenOpacity: 0.08,
    frameWidth: 5,
    cornerStuds: false,
  },
  rare: {
    strokeWidth: 2.5,
    glowBlur: 2.5,
    sparkles: 3,
    sheenOpacity: 0.14,
    frameWidth: 6,
    cornerStuds: true,
  },
  epic: {
    strokeWidth: 3,
    glowBlur: 5,
    sparkles: 5,
    sheenOpacity: 0.2,
    frameWidth: 7,
    cornerStuds: true,
  },
  legendary: {
    strokeWidth: 3.5,
    glowBlur: 9,
    sparkles: 8,
    sheenOpacity: 0.28,
    frameWidth: 8,
    cornerStuds: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Emote — DiceBear fun-emoji with slug-mapped expressions
// ═══════════════════════════════════════════════════════════════════════
// Maps each emote slug to specific fun-emoji eyes+mouth so the face
// actually matches the name. Every (eyes, mouth) pair is unique so no two
// emotes look the same. Unknown slugs fall back to DiceBear's random pick
// seeded by the slug.
const EMOTE_EXPRESSION: Record<string, { eyes: string; mouth: string }> = {
  // Common — everyday reactions
  smile: { eyes: "cute", mouth: "lilSmile" },
  laugh: { eyes: "closed", mouth: "smileLol" },
  happy: { eyes: "closed2", mouth: "cute" },
  wink: { eyes: "wink", mouth: "lilSmile" },
  sad: { eyes: "sad", mouth: "sad" },
  cry: { eyes: "crying", mouth: "drip" },
  shy: { eyes: "plain", mouth: "shy" },
  plain: { eyes: "plain", mouth: "plain" },
  shock: { eyes: "plain", mouth: "shout" },

  // Uncommon — expressive
  grin: { eyes: "cute", mouth: "wideSmile" },
  sassy: { eyes: "wink2", mouth: "smileTeeth" },
  tongue: { eyes: "closed", mouth: "tongueOut" },
  annoyed: { eyes: "pissed", mouth: "pissed" },
  sleepy: { eyes: "sleepClose", mouth: "shy" },

  // Rare — signature looks
  kiss: { eyes: "love", mouth: "kissHeart" },
  starstruck: { eyes: "stars", mouth: "smileLol" },
  cool: { eyes: "shades", mouth: "lilSmile" },

  // Epic — rarer energy
  toothy: { eyes: "cute", mouth: "smileTeeth" },
  masked: { eyes: "plain", mouth: "faceMask" },

  // Legendary — the one everyone wants
  superstar: { eyes: "stars", mouth: "wideSmile" },
};

function emoteSvg(slug: string, rarity: Rarity): string {
  const pal = paletteForSlug(slug);
  const expr = EMOTE_EXPRESSION[slug];
  const polish = RARITY_POLISH[rarity];
  // DiceBear needs hex colors without the leading #.
  const bg = pal.deep.slice(1);
  // DiceBear types `eyes`/`mouth` as strict literal unions. The runtime
  // values we pass ARE valid members of those unions (see EMOTE_EXPRESSION
  // above), but TypeScript can't prove it from a plain string index, so
  // we cast at the boundary.
  const exprOpts = expr
    ? ({ eyes: [expr.eyes], mouth: [expr.mouth] } as unknown as Record<
        string,
        string[]
      >)
    : {};
  return createAvatar(funEmoji, {
    seed: slug,
    size: 128,
    backgroundColor: [bg],
    backgroundType: ["solid"],
    radius: 14,
    scale: 80 + Math.round(polish.sparkles),
    ...exprOpts,
  }).toString();
}

// ═══════════════════════════════════════════════════════════════════════
// Badge — shield in the slug's colors, rarity adds gloss + sparkles
// ═══════════════════════════════════════════════════════════════════════
function badgeSvg(slug: string, rarity: Rarity): string {
  const pal = paletteForSlug(slug);
  const r = RARITY_POLISH[rarity];
  const letter = slug
    .split(/[-_]/)
    .map((s) => (s[0] ?? "").toUpperCase())
    .slice(0, 2)
    .join("")
    .padEnd(1, (slug[0] ?? "K").toUpperCase());
  const id = "b" + hashSeed(slug).toString(36);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
    <defs>
      <linearGradient id='${id}g' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0%' stop-color='${pal.accent}'/>
        <stop offset='100%' stop-color='${pal.primary}'/>
      </linearGradient>
      <radialGradient id='${id}gl' cx='50%' cy='22%' r='55%'>
        <stop offset='0%' stop-color='#ffffff' stop-opacity='${0.25 + r.sheenOpacity}'/>
        <stop offset='100%' stop-color='#ffffff' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='128' height='128' fill='${pal.deep}' rx='14'/>
    <path d='M64 12 L108 30 V70 C108 92 88 112 64 118 C40 112 20 92 20 70 V30 Z'
      fill='url(#${id}g)' stroke='${pal.secondary}' stroke-width='${r.strokeWidth}' stroke-linejoin='round'/>
    <path d='M64 12 L108 30 V70 C108 92 88 112 64 118 C40 112 20 92 20 70 V30 Z'
      fill='url(#${id}gl)'/>
    <text x='64' y='78' text-anchor='middle'
      font-family='system-ui, -apple-system, Segoe UI, sans-serif'
      font-size='44' font-weight='900' fill='${pal.deep}'
      letter-spacing='-1'>${escapeXml(letter)}</text>
    ${sparkles(r.sparkles, id, pal.accent)}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════
// Name Color — edge-to-edge nameplate showing the @name in its color
// ═══════════════════════════════════════════════════════════════════════
function nameColorSvg(slug: string, rarity: Rarity): string {
  const pal = paletteForSlug(slug);
  const r = RARITY_POLISH[rarity];
  const id = "n" + hashSeed(slug).toString(36);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
    <defs>
      <linearGradient id='${id}g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${pal.primary}'/>
        <stop offset='50%' stop-color='${pal.accent}'/>
        <stop offset='100%' stop-color='${pal.secondary}'/>
      </linearGradient>
      <linearGradient id='${id}bg' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0%' stop-color='${pal.deep}'/>
        <stop offset='100%' stop-color='#0b0b0c'/>
      </linearGradient>
    </defs>
    <rect width='128' height='128' fill='url(#${id}bg)' rx='14'/>
    <rect x='0' y='0' width='128' height='${r.frameWidth}' fill='url(#${id}g)'/>
    <rect x='0' y='${128 - r.frameWidth}' width='128' height='${r.frameWidth}' fill='url(#${id}g)'/>
    <text x='64' y='76' text-anchor='middle'
      font-family='system-ui, -apple-system, Segoe UI, sans-serif'
      font-size='34' font-weight='900' fill='url(#${id}g)'
      letter-spacing='-0.02em'>@name</text>
    ${sparkles(r.sparkles, id, pal.accent)}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════
// Profile Card — rarity-framed trading card with slug-colored sigil
// ═══════════════════════════════════════════════════════════════════════
function profileCardSvg(slug: string, rarity: Rarity): string {
  const pal = paletteForSlug(slug);
  const r = RARITY_POLISH[rarity];
  const variant = hashSeed(slug) % 4;
  const id = "c" + hashSeed(slug).toString(36);
  const pattern = patternFor(variant, id, pal);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
    <defs>
      <linearGradient id='${id}frame' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${pal.accent}'/>
        <stop offset='100%' stop-color='${pal.primary}'/>
      </linearGradient>
      <linearGradient id='${id}panel' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0%' stop-color='${pal.deep}'/>
        <stop offset='100%' stop-color='#0b0b0c'/>
      </linearGradient>
      <linearGradient id='${id}sheen' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#ffffff' stop-opacity='0'/>
        <stop offset='50%' stop-color='#ffffff' stop-opacity='${r.sheenOpacity}'/>
        <stop offset='100%' stop-color='#ffffff' stop-opacity='0'/>
      </linearGradient>
      ${pattern.defs}
    </defs>
    <rect width='128' height='128' fill='url(#${id}frame)'/>
    <rect x='${r.frameWidth / 2}' y='${r.frameWidth / 2}'
      width='${128 - r.frameWidth}' height='${128 - r.frameWidth}'
      fill='url(#${id}panel)'/>
    <rect x='${r.frameWidth / 2}' y='${r.frameWidth / 2}'
      width='${128 - r.frameWidth}' height='${128 - r.frameWidth}'
      fill='${pattern.fill}'/>
    <rect x='${r.frameWidth / 2}' y='${r.frameWidth / 2}'
      width='${128 - r.frameWidth}' height='${128 - r.frameWidth}'
      fill='url(#${id}sheen)'/>
    <polygon points='64,34 92,50 92,78 64,94 36,78 36,50'
      fill='url(#${id}frame)' stroke='${pal.deep}' stroke-width='2' stroke-linejoin='round'/>
    <polygon points='64,46 82,56 82,72 64,82 46,72 46,56'
      fill='${pal.deep}' stroke='${pal.accent}' stroke-width='1.2'/>
    <circle cx='64' cy='64' r='6' fill='url(#${id}frame)'/>
    ${
      r.cornerStuds
        ? `
      <circle cx='14' cy='14' r='2.5' fill='${pal.accent}'/>
      <circle cx='114' cy='14' r='2.5' fill='${pal.accent}'/>
      <circle cx='14' cy='114' r='2.5' fill='${pal.accent}'/>
      <circle cx='114' cy='114' r='2.5' fill='${pal.accent}'/>
    `
        : ""
    }
    ${sparkles(r.sparkles, id, pal.accent)}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════
// Chat Flair — glowing chat bubble in the slug's color
// ═══════════════════════════════════════════════════════════════════════
function chatFlairSvg(slug: string, rarity: Rarity): string {
  const pal = paletteForSlug(slug);
  const r = RARITY_POLISH[rarity];
  const id = "f" + hashSeed(slug).toString(36);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
    <defs>
      <linearGradient id='${id}bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${pal.primary}'/>
        <stop offset='100%' stop-color='${pal.secondary}'/>
      </linearGradient>
      <filter id='${id}glow' x='-30%' y='-30%' width='160%' height='160%'>
        <feGaussianBlur stdDeviation='${Math.max(1.5, r.glowBlur / 2)}' result='b'/>
        <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
      </filter>
    </defs>
    <rect width='128' height='128' fill='${pal.deep}' rx='14'/>
    <path d='M24 36 Q24 22 38 22 H90 Q104 22 104 36 V74 Q104 88 90 88 H58 L44 104 L46 88 H38 Q24 88 24 74 Z'
      fill='${pal.deep}' stroke='url(#${id}bg)' stroke-width='${r.strokeWidth + 1.5}' stroke-linejoin='round'
      filter='url(#${id}glow)'/>
    <path d='M24 36 Q24 22 38 22 H90 Q104 22 104 36 V74 Q104 88 90 88 H58 L44 104 L46 88 H38 Q24 88 24 74 Z'
      fill='none' stroke='${pal.accent}' stroke-width='1.2' stroke-linejoin='round'/>
    <circle cx='48' cy='55' r='4' fill='${pal.primary}'/>
    <circle cx='64' cy='55' r='4' fill='${pal.accent}'/>
    <circle cx='80' cy='55' r='4' fill='${pal.secondary}'/>
    ${sparkles(r.sparkles, id, pal.accent)}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Deterministic sparkle stars positioned along the corners/edges, count
// driven by rarity. Higher rarity = more.
function sparkles(count: number, id: string, color: string): string {
  if (count <= 0) return "";
  const positions: Array<[number, number, number]> = [
    [20, 20, 3],
    [108, 18, 2.5],
    [16, 108, 2.5],
    [112, 110, 3],
    [64, 16, 2],
    [18, 64, 2],
    [110, 64, 2],
    [64, 112, 2],
  ];
  const picks = positions.slice(0, Math.min(count, positions.length));
  return picks
    .map(
      ([x, y, rad], i) =>
        `<circle cx='${x}' cy='${y}' r='${rad}' fill='${color}' opacity='0.85' filter='url(#${id}spark${i})' />
       <defs><filter id='${id}spark${i}' x='-100%' y='-100%' width='300%' height='300%'>
         <feGaussianBlur stdDeviation='1.2'/>
       </filter></defs>`,
    )
    .join("\n");
}

type Pattern = { defs: string; fill: string };
function patternFor(variant: number, id: string, pal: ItemPalette): Pattern {
  switch (variant) {
    case 0:
      return {
        defs: `<pattern id='${id}p' width='10' height='10' patternUnits='userSpaceOnUse'>
          <circle cx='5' cy='5' r='1.1' fill='${pal.accent}' opacity='0.25'/>
        </pattern>`,
        fill: `url(#${id}p)`,
      };
    case 1:
      return {
        defs: `<pattern id='${id}p' width='12' height='12' patternUnits='userSpaceOnUse' patternTransform='rotate(30)'>
          <line x1='0' y1='0' x2='0' y2='12' stroke='${pal.accent}' stroke-width='1' opacity='0.22'/>
        </pattern>`,
        fill: `url(#${id}p)`,
      };
    case 2:
      return {
        defs: `<pattern id='${id}p' width='14' height='14' patternUnits='userSpaceOnUse'>
          <path d='M14 0 H0 V14' fill='none' stroke='${pal.accent}' stroke-width='0.6' opacity='0.22'/>
        </pattern>`,
        fill: `url(#${id}p)`,
      };
    default:
      return {
        defs: `<pattern id='${id}p' width='128' height='16' patternUnits='userSpaceOnUse'>
          <path d='M0 8 Q16 2 32 8 T64 8 T96 8 T128 8'
            fill='none' stroke='${pal.accent}' stroke-width='1' opacity='0.25'/>
        </pattern>`,
        fill: `url(#${id}p)`,
      };
  }
}

/** Deterministic inline SVG for an item, dispatched on `type` and styled via `slug` palette + `rarity` polish. */
export function generateItemSvg(params: {
  slug: string;
  type: ItemType;
  rarity: Rarity;
}): string {
  const { slug, type, rarity } = params;
  switch (type) {
    case "emote":
      return emoteSvg(slug, rarity);
    case "badge":
      return badgeSvg(slug, rarity);
    case "nameColor":
      return nameColorSvg(slug, rarity);
    case "profileCard":
      return profileCardSvg(slug, rarity);
    case "chatFlair":
      return chatFlairSvg(slug, rarity);
  }
}
