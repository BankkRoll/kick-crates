# Security Policy

KickCrates handles Kick auth tokens, an XP economy, and anti-cheat paths. We take vulnerability reports seriously and appreciate responsible disclosure.

## Supported versions

Only the `main` branch and the latest published extension build receive security fixes. Older snapshots of the extension are not patched — update before reporting.

## Reporting a vulnerability

**Do not open a public GitHub issue for security bugs.**

Email disclosures to **bankkroll.eth@gmail.com** with the subject line `[KickCrates security] <short summary>`. If you prefer encrypted mail, ask for a PGP key in your first message and we'll reply with one.

Your report should include:

- A description of the vulnerability and its impact.
- Reproduction steps (minimal PoC, network captures, or a patched build — whatever you have).
- Affected component: extension, Convex backend, auth flow, rate limiter, XP/scrap economy, or anti-cheat.
- Your suggested severity and any mitigations you've considered.
- Whether you'd like credit in the fix commit / release notes, and under what name.

## What to expect

| Stage | Target |
| --- | --- |
| First human reply | within **72 hours** |
| Triage and severity assessment | within **7 days** |
| Fix or mitigation in `main` | depends on severity — critical issues are prioritized over everything else |
| Public disclosure | coordinated with the reporter after a fix ships |

We will not take legal action against researchers who:

- Act in good faith and avoid privacy violations, data destruction, and service degradation.
- Do not exploit the issue beyond what is necessary to prove it.
- Do not disclose the issue publicly until a fix has shipped or 90 days have passed, whichever is sooner.

## Scope

In scope:

- The extension (`apps/extension/`) — content script, background, popup, storage, messaging.
- The Convex backend (`convex/`) — auth, mutations, queries, rate limiting, session token handling.
- Anti-cheat and XP/scrap economy paths (`convex/scrap.ts`, `convex/crates.ts`, `convex/seasons.ts`, XP helpers).

Out of scope:

- Vulnerabilities in Kick.com itself — report those to Kick.
- Vulnerabilities in third-party dependencies with no KickCrates-specific impact — report those upstream (we'll pick up the fix via dependabot).
- Self-XSS, social engineering, or physical attacks against a user's own machine.
- Rate-limit tuning complaints or UX issues — those are regular issues.

## Credit

With your permission, fixed reports are credited in the release notes and (if you want) the commit trailer.
