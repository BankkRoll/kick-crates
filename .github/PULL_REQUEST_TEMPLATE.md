<!--
Thanks for the PR. Fill out every section — the test plan is not optional.
Security-sensitive changes (auth, anti-cheat, scrap/XP economy) must be called out below.
-->

## Summary

<!-- What does this PR change and why? One or two short paragraphs. -->

## Area

<!-- Delete the ones that don't apply. -->
- [ ] Extension UI (dialog / sidebar / panel)
- [ ] Extension background / messaging
- [ ] Auth flow
- [ ] Convex backend (mutations / queries / schema)
- [ ] XP / scrap / crates economy
- [ ] Battle pass / seasons
- [ ] Anti-cheat / rate limiting
- [ ] Build / CI / tooling
- [ ] Docs

## Linked issues

<!-- "Closes #123", "Refs #456". If none, say "N/A" and briefly explain why this is worth merging without an issue. -->

## Test plan

<!--
Required. Describe exactly how you verified the change.
Docs-only PRs must still say how you checked rendering.
UI changes should list the golden path + at least one edge case actually exercised in the browser.
-->

- [ ] `pnpm typecheck` passes locally
- [ ] `pnpm --filter @kick-crates/extension build` passes locally
- [ ] Manually exercised the changed surface in Chrome with the unpacked extension
- [ ] (if touching Convex) tested against a live `convex dev` instance

**What I did to verify:**

<!-- Walk through the scenario(s) you clicked through. Screenshots or a short clip for UI changes. -->

## Security-sensitive?

<!-- Check the box if this PR touches auth, session tokens, rate limits, requireUser, scrap/XP writes, crate odds, or anti-cheat. -->
- [ ] This PR touches a security-sensitive path — reviewers should look harder.

## Docs / env updates

- [ ] README / `convex/README.md` updated if behavior changed
- [ ] TSDoc updated on affected exports
- [ ] `.env.example` updated if a new env var was added
- [ ] N/A

## Breaking changes

<!-- Does this change schema, public APIs, storage keys, or the messaging protocol between background and content? If yes, describe the migration. Otherwise write "None." -->
