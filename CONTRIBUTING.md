# Contributing to KickCrates

Thanks for your interest in improving KickCrates! This document covers how to get a working dev environment, the code conventions the project expects, and how to submit changes.

## Prerequisites

- **Node** ≥ 20.11 (see `engines` in [package.json](package.json))
- **pnpm** ≥ 9.15.0 (the repo pins `packageManager`; install via `corepack enable`)
- A free [Convex](https://convex.dev) account for local backend work

## Initial setup

```bash
git clone https://github.com/<your-fork>/kick-crates.git
cd kick-crates
pnpm install
cp .env.example .env.local
# fill in VITE_CONVEX_URL and VITE_CONVEX_SITE_URL from your Convex dashboard
```

Seed a local season and run the stack:

```bash
pnpm dev                 # runs convex dev + extension dev concurrently
```

Load the built extension (`apps/extension/.output/chrome-mv3`) as an unpacked extension in Chrome. WXT keeps it live-reloading while `pnpm dev` is running.

## Project layout

```
convex/                Convex backend (schema, auth, mutations, queries, seed)
apps/extension/        Browser extension (WXT + Preact)
├── entrypoints/       MV3 background, content script, popup entrypoints
├── src/content/       In-page dialog, sidebar, and panel components
└── src/background/    Auth flow and heartbeat orchestration
scripts/               Maintenance scripts
```

Read [convex/README.md](convex/README.md) for backend-specific conventions before touching mutations.

## Code style

- **TypeScript throughout.** No JS files outside of build output.
- **TSDoc on every exported symbol.** Main exports (mutations, queries, major components, core helpers) get a detailed block with `@param` / `@returns` where helpful; smaller exports (constants, trivial utilities, simple types) get a terse one-liner. Non-exported helpers should generally not get TSDoc — they're read in context.
- **No implementation comments for what the code already says.** Only add comments where the *why* is non-obvious: a hidden invariant, a workaround for a specific bug, a constraint that would surprise a reader.
- **Prefer editing existing files** over creating new ones. No new modules unless the split is genuinely useful.
- **Security mutations must route through `requireUser`** (ban + session-token revocation check) and `rateLimiter.limit`. Never patch `users.scrap`, `users.totalXp`, or `users.seasonXp` outside of a named mutation in `convex/scrap.ts`, `convex/crates.ts`, `convex/seasons.ts`, or the XP helpers.
- **Error throwing goes through `err(code, message?)`** in [convex/lib/errors.ts](convex/lib/errors.ts). Add a new code to `KickCratesErrorCode` before throwing it.
- **No emojis in code or docs** unless explicitly asked.

## Running checks

```bash
pnpm typecheck           # tsc across root + extension
pnpm --filter @kick-crates/extension build
```

A typecheck must pass before a PR can be merged.

## Submitting a pull request

1. Fork and create a feature branch off `main`.
2. Keep the diff focused — one PR, one concern. Prefer smaller PRs over sprawling ones.
3. Update docs (README, TSDoc on affected exports, `.env.example` if a new env var was added) in the same PR as the behavior change.
4. Fill in the PR template checklist. The test plan is not optional — even for docs-only changes, say *how you verified the change renders*.
5. If the change touches anti-cheat, auth, or scrap/XP economy paths, call it out explicitly in the PR description so reviewers know to look harder.

## Reporting bugs and proposing features

Use [GitHub Issues](../../issues). Pick the appropriate template and fill it out — "it doesn't work" reports get closed. For security-sensitive bugs, see [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
