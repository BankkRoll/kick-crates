// Crypto primitives for the Convex backend. Algorithms are pinned: AES-256-GCM
// for symmetric encryption (fresh 96-bit IV per call — reuse is catastrophic),
// HMAC-SHA256 for MACs, RS256 for the extension session JWT (public JWKS can
// be served without exposing signing key; algorithms list on verify blocks
// alg-confusion). All randomness comes from Web Crypto; equality checks on
// secrets use the constant-time helpers to avoid timing oracles. Secret keys
// are passed as base64url strings loaded from env.
import { SignJWT, jwtVerify, importJWK, type JWK, exportJWK } from "jose";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Base64url encode (RFC 4648 §5), stripped padding. */
export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url decode, tolerant of missing padding. */
export function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/** Standard base64 encode. */
export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return btoa(bin);
}

/** Standard base64 decode. */
export function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/** CSPRNG bytes via Web Crypto; never Math.random. */
export function randomBytes(len: number): Uint8Array {
  const u8 = new Uint8Array(len);
  crypto.getRandomValues(u8);
  return u8;
}

/** CSPRNG hex string of `byteLen` bytes. */
export function randomHex(byteLen: number): string {
  const u8 = randomBytes(byteLen);
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** CSPRNG base64url token; default 32 bytes = 256 bits of entropy. */
export function randomToken(byteLen = 32): string {
  return toBase64Url(randomBytes(byteLen));
}

/** SHA-256 digest of string or bytes. */
export async function sha256(data: string | Uint8Array): Promise<Uint8Array> {
  const input = typeof data === "string" ? encoder.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", input as BufferSource);
  return new Uint8Array(digest);
}

/** PKCE S256 pair; 64-byte verifier exceeds RFC 7636 minimum for full 256-bit strength. */
export async function generatePkce(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = toBase64Url(randomBytes(64));
  const challenge = toBase64Url(await sha256(verifier));
  return { verifier, challenge };
}

/** Constant-time byte compare; prevents timing-oracle attacks on secrets. */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i]! ^ b[i]!) & 0xff;
  return diff === 0;
}

/** Constant-time string compare via UTF-8 bytes. */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const ae = encoder.encode(a);
  const be = encoder.encode(b);
  return timingSafeEqualBytes(ae, be);
}

async function hmacKey(secretBase64Url: string): Promise<CryptoKey> {
  const raw = fromBase64Url(secretBase64Url);
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** HMAC-SHA256 sign, signature as base64url. */
export async function hmacSignBase64Url(
  secretBase64Url: string,
  message: string,
): Promise<string> {
  const key = await hmacKey(secretBase64Url);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(sig);
}

/** HMAC-SHA256 verify; returns false (not throws) on malformed signature. */
export async function hmacVerifyBase64Url(
  secretBase64Url: string,
  message: string,
  signatureBase64Url: string,
): Promise<boolean> {
  const key = await hmacKey(secretBase64Url);
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64Url(signatureBase64Url);
  } catch {
    return false;
  }
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as BufferSource,
    encoder.encode(message),
  );
}

async function aesGcmKey(secretBase64Url: string): Promise<CryptoKey> {
  const keyBytes = fromBase64Url(secretBase64Url);
  if (keyBytes.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM (got ${keyBytes.length}). Generate with: openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`,
    );
  }
  return crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/** AES-256-GCM encrypt; fresh random 96-bit IV per call (GCM IV reuse catastrophically breaks confidentiality). */
export async function aesGcmEncrypt(
  secretBase64Url: string,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await aesGcmKey(secretBase64Url);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(plaintext),
  );
  return { ciphertext: toBase64Url(ct), iv: toBase64Url(iv) };
}

/** AES-256-GCM decrypt; throws on auth-tag mismatch (tampered ciphertext). */
export async function aesGcmDecrypt(
  secretBase64Url: string,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const key = await aesGcmKey(secretBase64Url);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(iv) as BufferSource },
    key,
    fromBase64Url(ciphertext) as BufferSource,
  );
  return decoder.decode(pt);
}

/** Claims embedded in the extension session JWT. */
export type JwtClaims = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  kick_user_id: number;
  ext_version?: string;
};

function requireJwtPrivateJwk(): JWK {
  const raw = process.env.JWT_PRIVATE_JWK;
  if (!raw) {
    throw new Error(
      "JWT_PRIVATE_JWK not set. Generate with scripts/generate-jwt-keys.mjs and set via `npx convex env set JWT_PRIVATE_JWK <json>`.",
    );
  }
  return JSON.parse(raw) as JWK;
}

function requireJwtPublicJwk(): JWK {
  const raw = process.env.JWT_PUBLIC_JWK;
  if (!raw) {
    throw new Error(
      "JWT_PUBLIC_JWK not set. Generate with scripts/generate-jwt-keys.mjs and set via `npx convex env set JWT_PUBLIC_JWK <json>`.",
    );
  }
  return JSON.parse(raw) as JWK;
}

function requireSiteUrl(): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error(
      "CONVEX_SITE_URL not set. Run `npx convex env set CONVEX_SITE_URL <your-deployment>.convex.site`.",
    );
  }
  return siteUrl;
}

/** Sign an RS256 session JWT for the browser extension; RSA chosen so the public JWKS can be served without exposing signing key. */
export async function signExtensionJwt(params: {
  userId: string;
  jti: string;
  kickUserId: number;
  ttlSeconds: number;
  extensionVersion?: string;
}): Promise<{ token: string; iat: number; exp: number }> {
  const jwk = requireJwtPrivateJwk();
  const iss = requireSiteUrl();
  const privateKey = await importJWK(jwk, "RS256");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + params.ttlSeconds;
  const builder = new SignJWT({
    kick_user_id: params.kickUserId,
    ...(params.extensionVersion
      ? { ext_version: params.extensionVersion }
      : {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid ?? "kick-crates-1" })
    .setSubject(params.userId)
    .setAudience("kick-crates-extension")
    .setIssuer(iss)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setJti(params.jti);
  const token = await builder.sign(privateKey);
  return { token, iat, exp };
}

/** Verify extension JWT and assert required claim shape; algorithm pinned to RS256 to block alg-confusion attacks. */
export async function verifyExtensionJwt(token: string): Promise<JwtClaims> {
  const jwk = requireJwtPublicJwk();
  const iss = requireSiteUrl();
  const key = await importJWK(jwk, "RS256");
  const { payload } = await jwtVerify(token, key, {
    issuer: iss,
    audience: "kick-crates-extension",
    algorithms: ["RS256"],
  });
  if (typeof payload.sub !== "string") throw new Error("jwt: missing sub");
  if (typeof payload.jti !== "string") throw new Error("jwt: missing jti");
  if (typeof payload.iat !== "number") throw new Error("jwt: missing iat");
  if (typeof payload.exp !== "number") throw new Error("jwt: missing exp");
  if (typeof payload.kick_user_id !== "number")
    throw new Error("jwt: missing kick_user_id");
  return {
    sub: payload.sub,
    jti: payload.jti,
    iat: payload.iat,
    exp: payload.exp,
    aud: "kick-crates-extension",
    iss,
    kick_user_id: payload.kick_user_id,
    ext_version:
      typeof payload.ext_version === "string" ? payload.ext_version : undefined,
  };
}

/** JWKS payload for the `/.well-known/jwks.json` endpoint. */
export async function publicJwks(): Promise<{ keys: JWK[] }> {
  const jwk = requireJwtPublicJwk();
  return {
    keys: [
      {
        ...jwk,
        alg: "RS256",
        use: "sig",
        kid: jwk.kid ?? "kick-crates-1",
      },
    ],
  };
}

/** Derive the public JWK from the private one, stripping RSA private components (d, p, q, dp, dq, qi). */
export async function exportPublicJwkFromPrivate(): Promise<JWK> {
  const priv = requireJwtPrivateJwk();
  const key = await importJWK(priv, "RS256");
  if (!("type" in key) || key.type !== "private") {
    throw new Error("JWT_PRIVATE_JWK is not a private key");
  }
  const pub = await exportJWK(key);
  const {
    d: _d,
    p: _p,
    q: _q,
    dp: _dp,
    dq: _dq,
    qi: _qi,
    ...publicOnly
  } = pub as Record<string, unknown>;
  return publicOnly as JWK;
}
