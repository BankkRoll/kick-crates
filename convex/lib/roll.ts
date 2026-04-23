// Crate roll mechanics. The PRNG is xorshift128+ seeded from a hex string the
// caller generated with Web Crypto; the seed is surfaced to the client for
// provable-fair UX, so replay yields the same result by design and each open
// must use a fresh seed. Pity/weight adjustment is the caller's job — this
// module treats the passed-in weights as canonical and does not reweight.
import type { Rarity } from "./constants.js";

/** xorshift128+ PRNG; non-cryptographic by design — seed is sent to client for provable-fair UX, so replay is fine but future opens use fresh seeds. */
export function prngFromSeed(seedHex: string): () => number {
  if (seedHex.length < 32) {
    seedHex = (seedHex + "0".repeat(32)).slice(0, 32);
  }
  const mask = 0xffffffffffffffffn;
  let s0 = BigInt("0x" + seedHex.slice(0, 16));
  let s1 = BigInt("0x" + seedHex.slice(16, 32));
  if (s0 === 0n && s1 === 0n) {
    s0 = 0x9e3779b97f4a7c15n;
    s1 = 0xbf58476d1ce4e5b9n;
  }
  return () => {
    let x = s0;
    const y = s1;
    s0 = y;
    x = (x ^ ((x << 23n) & mask)) & mask;
    s1 = (x ^ y ^ (x >> 17n) ^ (y >> 26n)) & mask;
    const sum = (s1 + y) & mask;
    const top32 = Number(sum >> 32n);
    return (top32 >>> 0) / 0x1_0000_0000;
  };
}

/** Weighted rarity roll; falls back to `common` on zero total, `legendary` on float drift. */
export function rollRarity(
  rand: () => number,
  weights: Record<Rarity, number>,
): Rarity {
  const order: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
  const total = order.reduce((s, r) => s + (weights[r] ?? 0), 0);
  if (total <= 0) return "common";
  let pick = rand() * total;
  for (const r of order) {
    pick -= weights[r] ?? 0;
    if (pick <= 0) return r;
  }
  return "legendary";
}

/** Uniform index pick; returns -1 for empty input. */
export function pickIndex(rand: () => number, length: number): number {
  if (length <= 0) return -1;
  return Math.min(length - 1, Math.floor(rand() * length));
}

/** Canonical rarity ordering, low to high. */
export const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

/** Numeric rank of a rarity within `RARITY_ORDER`. */
export function rarityRank(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}
