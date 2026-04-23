import { httpAction } from "./_generated/server.js";
import { publicJwks } from "./lib/crypto.js";

/** Serves the public JWKS at `/.well-known/jwks.json` with a 5-minute CDN cache. */
export const httpJwks = httpAction(async () => {
  const keys = await publicJwks();
  return new Response(JSON.stringify(keys), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
});
