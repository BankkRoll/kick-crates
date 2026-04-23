# KickCrates

Third-party battle pass, crates, and XP progression for [Kick.com](https://kick.com), delivered as a Chrome extension (WXT + Preact) backed by [Convex](https://convex.dev).

All cosmetic art is generated inline at seed time (via [DiceBear](https://dicebear.com) + hand-crafted SVG templates).

<div style="display: flex; gap: 12px;">

  <img src="https://github.com/user-attachments/assets/d5a3dcbf-f217-44b7-b5c7-f7c8bc82703a" width="33%" />

  <img src="https://github.com/user-attachments/assets/0148dc68-07d4-47df-8850-3591a64969be" width="33%" />

  <img src="https://github.com/user-attachments/assets/23975b0f-de57-4c53-8a0c-8c9ca74f4964" width="33%" />

</div>

## Features

- **Watch-to-earn XP** with server-issued heartbeat nonces + daily caps (240 min/day total, 60 min/channel/day) so the client can't forge progress.
- **Battle pass** with separate Season XP (resets each season) and Total XP (lifetime, drives character level). Every 5th tier awards a season crate token.
- **Crates** (daily / weekly / monthly / season) rolled server-side; each open writes an auditable `crateOpens` row. Non-token crates have per-kind cooldowns; season crates are token-gated via the pass.
- **Quests** on daily, weekly, and season cadences. Only quest types our own write paths emit: `watch_minutes`, `watch_distinct_channels`, `open_crate`. No webhook-dependent quests.
- **5 cosmetic types** — emotes, badges, name colors, profile cards, chat flairs. All rendered as inline SVG generated from the item slug + rarity at seed time.
- **Loadout** — 4 equippable slots (badge, name color, profile card, chat flair). Only owned items can be equipped.
- **Dupes → scrap** — rolling a card you already own awards scrap at rarity value (common 3 → legendary 1500). Dupes are the sole scrap source.
- **Welcome kit** on first sign-in: starter emote, bronze watcher badge, 100 XP, 50 scrap; announced via a pre-auth welcome dialog.
- **Fullscreen CSGO-style crate opening** (buildup → lid-open flash → wheel spin → per-card unlock) with per-card dupe → scrap overlay.
- **Claim reveal screen** for quest + tier claims — staged intro → walkthrough → summary with keyboard advance.
- **Shared item preview dialog** for Battle Pass tier clicks + Collection tile clicks (locked or unlocked).
- **Collection view** — category filter, rarity progress bars, dupe counts on owned items, recent-drops feed tagged by source (crate / quest / pass / promo / admin).
- **Injected into Kick's native sidebar** + the mobile profile drawer; SPA navigation picked up via `pushState`/`popstate` with a 250 ms settle before commit.
- **Popup** for sign-in / sign-out and an "Open on Kick" shortcut.
- **Admin feature gates** via `configFlags` — `minExtensionVersion` and `enabledFeatures` can disable features or force an upgrade without shipping a new build.

## Project structure

```
kick-crates/
├── convex/                  # Convex backend (schema, auth, sessions, crates, crons, seed)
│   ├── lib/                 # svgGen, welcome constants, rateLimiter, seasonXp helper, tiers
│   └── _generated/          # Convex codegen (git-ignored)
├── apps/extension/          # WXT + Preact browser extension
│   ├── entrypoints/         # kick.content.ts, background.ts, popup
│   └── src/content/dialog/  # Root + panels + screens + shared dialogs
├── scripts/generate-keys.mjs
└── package.json
```

## How it works

```
Extension (WXT + Preact)                    Convex (functions + DB + HTTP)
──────────────────────────                  ──────────────────────────────
service worker                              /auth/kick/start      (httpAction)
  ├── OAuth handoff via                     /auth/kick/callback   (httpAction)
  │    externally_connectable               /.well-known/jwks.json (httpAction)
  ├── chrome.alarms heartbeat tick
  └── ConvexHttpClient mutations             mutations:
content script (kick.com/*)                    sessions.start / heartbeat / endByUser
  ├── Sidebar + mobile nav injection           crates.openCrate
  ├── SPA route detection (pushState)          quests.claim
  ├── Video + activity sampling                seasons.claimTier
  └── Preact dialog + screens:                 users.setLoadout / acknowledgeWelcome
      - Root (5 tabs)                          oauth.* (internal)
      - CrateOpening screen
      - ClaimRevealScreen                    queries (reactive):
      - ItemPreviewDialog                      users.me / myInventory / myWelcomeKit
      - WelcomeDialog (pre-auth toast)         quests.listActive
popup (Preact)                                 crates.listCrates / myCrateStates
  ├── sign-in / sign-out                       seasons.listItems / listTierRewards / listMyTierClaims
  └── open-on-Kick                             dashboard.bootstrap (single-RTT hydrate)
                                               config.clientConfig

                                             crons:
                                               reap stale watch sessions (2 min)
                                               rotate Kick user tokens (1 h)
                                               reap pendingOauth (1 h)
                                               reap old sessionTokens (6 h)
                                               reap dailyUsage / telemetry (24 h)
```

**XP model:** every XP grant bumps both `totalXp` (never resets, drives level) and `seasonXp` (resets on season rollover, drives Battle Pass tier). When a user's `currentSeasonId` doesn't match the active season, `seasonXp` is auto-reset to 0 before the new XP is added. See [convex/lib/seasonXp.ts](convex/lib/seasonXp.ts).

**Item art:** at seed time, each item's slug + rarity feeds [convex/lib/svgGen.ts](convex/lib/svgGen.ts). Emotes map to specific DiceBear fun-emoji eye/mouth combos (so `smile` is a smile, `starstruck` has stars), badges render shield SVGs with rarity gradients, name colors render gradient nameplates, profile cards render framed trading cards, chat flairs render glowing chat bubbles. Result is stored in `items.assetSvg` and rendered inline via `dangerouslySetInnerHTML`.

## Prerequisites

- **Node 20+**
- **pnpm 9+**
- **Kick developer app** from <https://kick.com/settings/developer>
  - Scopes: `user:read`, `channel:read`
  - Redirect URI: `https://<YOUR-DEPLOYMENT>.convex.site/auth/kick/callback` (filled after first `convex dev`)

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Start Convex

```bash
npx convex dev
```

First run prompts you to create / select a deployment, then prints:

```
Convex URL:      https://<deployment>.convex.cloud
Convex site URL: https://<deployment>.convex.site
```

Keep this running — it watches `convex/` and regenerates `convex/_generated/*` on save.

### 3. Generate crypto keys

```bash
node scripts/generate-keys.mjs
```

Prints four `npx convex env set` commands. Run all four — they populate `JWT_PRIVATE_JWK`, `JWT_PUBLIC_JWK`, and `TOKEN_ENCRYPTION_KEY` on the deployment.

### 4. Set the remaining Convex env vars

```bash
npx convex env set CONVEX_SITE_URL     https://<YOUR-DEPLOYMENT>.convex.site
npx convex env set KICK_CLIENT_ID      <kick client id>
npx convex env set KICK_CLIENT_SECRET  <kick client secret>
# ALLOWED_EXTENSION_IDS is filled in step 7 once you know the unpacked ID.
```

Full list of Convex env vars (all required except the last):

| Var                     | Source                 | Purpose                                                                |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `CONVEX_SITE_URL`       | `convex dev` output    | Builds the OAuth redirect URI                                          |
| `KICK_CLIENT_ID`        | Kick developer portal  | OAuth client ID                                                        |
| `KICK_CLIENT_SECRET`    | Kick developer portal  | OAuth token exchange                                                   |
| `JWT_PRIVATE_JWK`       | `generate-keys.mjs`    | Signs our extension session JWTs                                       |
| `JWT_PUBLIC_JWK`        | `generate-keys.mjs`    | Published at `/.well-known/jwks.json`, used by Convex `customJwt` auth |
| `TOKEN_ENCRYPTION_KEY`  | `generate-keys.mjs`    | AES-GCM key for `kickTokens.*Cipher` fields                            |
| `ALLOWED_EXTENSION_IDS` | Chrome extensions page | Comma-separated allowlist of extension IDs permitted to start OAuth    |

### 5. Configure the Kick OAuth app

In the Kick developer portal, set the app's redirect URI to:

```
https://<YOUR-DEPLOYMENT>.convex.site/auth/kick/callback
```

### 6. Seed Season 1

```bash
npx convex run seed:seedSeason1
# Force regenerate all item SVGs after a svgGen.ts change:
npx convex run seed:seedSeason1 '{"force":true}'
```

Seeds: 1 season, 38 cosmetic items (20 emotes / 5 badges / 5 name colors / 5 profile cards / 3 chat flairs), 4 crate definitions, 5 quest definitions.

### 7. Extension env

```bash
cp apps/extension/.env.example apps/extension/.env.local
# paste the two URLs from step 2
```

Extension env vars (Vite-style, consumed at build time):

| Var                    | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `VITE_CONVEX_URL`      | Reactive client WebSocket endpoint      |
| `VITE_CONVEX_SITE_URL` | HTTP endpoint for OAuth + JWKS          |
| `VITE_EXT_VERSION`     | Reported to the server on session start |

### 8. Build + load the extension

```bash
pnpm --filter @kick-crates/extension dev
```

WXT launches Chrome with the extension loaded. Note the unpacked extension ID from `chrome://extensions`, then back in your terminal:

```bash
npx convex env set ALLOWED_EXTENSION_IDS <that-id>
```

Reload the extension once after this so the background service worker picks up the new allowlist.

## Development

| Command           | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `pnpm dev`        | Runs Convex + extension in parallel (recommended) |
| `pnpm dev:convex` | `convex dev` only                                 |
| `pnpm dev:ext`    | Extension only                                    |
| `pnpm build`      | Production extension build + `convex deploy`      |
| `pnpm typecheck`  | Typechecks both workspaces                        |

Useful one-shot Convex commands:

```bash
npx convex run seed:seedSeason1 '{"force":true}'          # re-seed / regenerate SVGs
npx convex env list                                        # show all env vars
npx convex env set <KEY> <VALUE>                           # set a single var
npx convex logs                                            # tail function logs
npx convex dashboard                                       # open the web dashboard
npx convex run config:setFlag '{"key":"minExtensionVersion","value":"0.2.0"}'
```

## Security

- **Kick client secret** lives only in Convex env, never shipped to the extension.
- **Session tokens** are RS256 JWTs signed server-side. Each has a `jti` tracked in `sessionTokens` for revocation; Convex's `customJwt` provider validates them via `/.well-known/jwks.json`.
- **Kick access/refresh tokens** are AES-GCM encrypted at rest in `kickTokens`. The refresh cron rotates them before the Kick-issued expiry.
- **Heartbeats** rotate a server-issued nonce on every tick. The client can't forge intervals, XP, or resurrect an ended session — secondary singleton check in `sessions.heartbeat` rejects zombie tabs even with a valid nonce.
- **Daily caps** enforced in `dailyUsage`: 240 active minutes/day total, 60 minutes/channel/day.
- **Rate limits** on every mutation via `@convex-dev/rate-limiter`.
- **Extension allowlist** — `ALLOWED_EXTENSION_IDS` restricts which installed extensions can invoke the OAuth start endpoint.
- **PKCE** — OAuth uses S256 code challenge; `pendingOauth` rows are one-shot and expire after 10 minutes.

## Troubleshooting

- **"VITE_CONVEX_URL is not configured"** — missing `apps/extension/.env.local`. Copy `.env.example` and fill in the two URLs from `convex dev`.
- **OAuth callback "Login session expired or invalid"** — PKCE row expired (10 min). Restart the sign-in.
- **"Extension did not respond within 6 seconds"** on the handoff page — extension was reloaded after the OAuth tab opened, or its ID isn't in `ALLOWED_EXTENSION_IDS`. Reload the extension, hard-refresh kick.com, retry.
- **Heartbeat rejected `NONCE_MISMATCH`** — two tabs heartbeating the same session. Only the most recent wins; close the older tab.
- **Items render as blank tiles** — you haven't re-seeded after a `svgGen.ts` change. Run `npx convex run seed:seedSeason1 '{"force":true}'`.

## License

MIT (code). Cosmetic art is generated with [DiceBear](https://dicebear.com) — the `fun-emoji` style used for emotes is licensed CC BY 4.0 by Davis Uche (attribution is preserved in each generated SVG's metadata).
