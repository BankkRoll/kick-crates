const siteUrl = process.env.CONVEX_SITE_URL;
if (!siteUrl) {
  throw new Error(
    "CONVEX_SITE_URL must be set. After `npx convex dev` starts, copy the .convex.site URL and set it via `npx convex env set CONVEX_SITE_URL <url>`.",
  );
}

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "kick-crates-extension",
      issuer: siteUrl,
      jwks: `${siteUrl}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ],
};
