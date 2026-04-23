import { httpRouter } from "convex/server";
import { httpOauthStart, httpOauthCallback } from "./oauth.js";
import { httpJwks } from "./jwks.js";

const http = httpRouter();

http.route({
  path: "/auth/kick/start",
  method: "POST",
  handler: httpOauthStart,
});

http.route({
  path: "/auth/kick/start",
  method: "OPTIONS",
  handler: httpOauthStart,
});

http.route({
  path: "/auth/kick/callback",
  method: "GET",
  handler: httpOauthCallback,
});

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpJwks,
});

export default http;
