#!/usr/bin/env node
import { generateKeyPairSync, randomBytes } from "node:crypto";

function banner(title) {
  const line = "─".repeat(60);
  console.log(`\n${line}\n  ${title}\n${line}`);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const privJwk = privateKey.export({ format: "jwk" });
const pubJwk = publicKey.export({ format: "jwk" });

const kid = `kick-crates-${Date.now().toString(36)}`;
privJwk.kid = kid;
privJwk.alg = "RS256";
privJwk.use = "sig";
pubJwk.kid = kid;
pubJwk.alg = "RS256";
pubJwk.use = "sig";

const jwtSigningKey = randomBytes(64).toString("base64url");
const apiHmacKey = randomBytes(64).toString("base64url");
const tokenEncryptionKey = randomBytes(32).toString("base64url");

banner("Convex env vars (set each with `npx convex env set <NAME> '<value>'`)");
console.log(`JWT_PRIVATE_JWK='${JSON.stringify(privJwk)}'`);
console.log(`JWT_PUBLIC_JWK='${JSON.stringify(pubJwk)}'`);
console.log(`API_HMAC_KEY='${apiHmacKey}'`);
console.log(`TOKEN_ENCRYPTION_KEY='${tokenEncryptionKey}'`);

banner("Extra reserved key (not currently required, for future use)");
console.log(`JWT_SIGNING_KEY='${jwtSigningKey}'`);

banner("Next steps");
console.log(`1. Run \`npx convex env set JWT_PRIVATE_JWK '${JSON.stringify(privJwk)}'\``);
console.log(`2. Run \`npx convex env set JWT_PUBLIC_JWK '${JSON.stringify(pubJwk)}'\``);
console.log(`3. Run \`npx convex env set API_HMAC_KEY '${apiHmacKey}'\``);
console.log(`4. Run \`npx convex env set TOKEN_ENCRYPTION_KEY '${tokenEncryptionKey}'\``);
console.log(
  "5. Set CONVEX_SITE_URL (printed by `npx convex dev` — e.g. https://acme.convex.site)",
);
console.log("6. Set KICK_CLIENT_ID and KICK_CLIENT_SECRET from kick.com/settings/developer");
console.log("");
