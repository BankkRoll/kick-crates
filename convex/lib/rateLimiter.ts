import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api.js";

/** Named token-bucket rate limits per endpoint; capacity allows short bursts, rate bounds sustained load. */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  authStart: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 10 },
  heartbeat: { kind: "token bucket", rate: 240, period: HOUR, capacity: 20 },
  startSession: { kind: "token bucket", rate: 30, period: HOUR, capacity: 5 },
  openCrate: { kind: "token bucket", rate: 40, period: HOUR, capacity: 5 },
  claimQuest: { kind: "token bucket", rate: 60, period: HOUR, capacity: 10 },
  claimTier: { kind: "token bucket", rate: 40, period: HOUR, capacity: 5 },
  setLoadout: { kind: "token bucket", rate: 60, period: HOUR, capacity: 10 },
  refreshToken: { kind: "token bucket", rate: 30, period: HOUR, capacity: 5 },
  buyCrateToken: { kind: "token bucket", rate: 30, period: HOUR, capacity: 5 },
  telemetry: { kind: "token bucket", rate: 120, period: HOUR, capacity: 30 },
});
