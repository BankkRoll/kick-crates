import { findVideoElement } from "./kick.js";
import type { HeartbeatSignals } from "../messaging.js";

let lastActivityAt = Date.now();
let lastVideoTime = 0;
let lastVideoTimeSampledAt = 0;

/**
 * Wires passive listeners that bump a "last user activity" timestamp.
 *
 * All handlers are `passive: true, capture: true` so they never block
 * the page's own listeners and fire even when Kick stops propagation in
 * its own tree. The timestamp feeds {@link sampleSignals} which the
 * server uses to reject heartbeats from idle / AFK tabs.
 *
 * @returns Teardown function that removes every listener it attached.
 */
export function startActivityTracker(): () => void {
  const bump = () => {
    lastActivityAt = Date.now();
  };
  const opts = { passive: true, capture: true } as const;
  const events: Array<keyof WindowEventMap> = [
    "mousemove",
    "mousedown",
    "keydown",
    "wheel",
    "scroll",
    "touchstart",
    "focus",
  ];
  for (const ev of events) {
    window.addEventListener(ev, bump, opts);
  }
  document.addEventListener("visibilitychange", bump);
  return () => {
    for (const ev of events) {
      window.removeEventListener(ev, bump, opts);
    }
    document.removeEventListener("visibilitychange", bump);
  };
}

/**
 * Snapshot of the signals we ship on each heartbeat.
 *
 * `videoPositionAdvanced` is the primary anti-cheat signal: it checks
 * whether the `<video>` element's `currentTime` has moved forward since
 * the last sample, which catches paused / scrubbed / spoofed streams.
 * Everything else is supporting evidence the server combines with its
 * own nonce + interval checks.
 */
export function sampleSignals(): HeartbeatSignals {
  const video = findVideoElement();
  const now = Date.now();
  const tabVisible = document.visibilityState === "visible";
  const documentHasFocus = typeof document.hasFocus === "function" ? document.hasFocus() : tabVisible;

  let videoPlaying = false;
  let videoPositionAdvanced = false;
  let volumeNonZero = false;

  if (video) {
    videoPlaying = !video.paused && !video.ended && video.readyState >= 3;
    volumeNonZero = !video.muted && video.volume > 0;
    const currentTime = video.currentTime;
    if (lastVideoTimeSampledAt === 0) {
      videoPositionAdvanced = videoPlaying;
    } else {
      videoPositionAdvanced = currentTime > lastVideoTime + 0.25;
    }
    lastVideoTime = currentTime;
    lastVideoTimeSampledAt = now;
  }

  const msSinceLastActivity = now - lastActivityAt;

  return {
    tabVisible,
    videoPlaying,
    videoPositionAdvanced,
    msSinceLastActivity,
    volumeNonZero,
    documentHasFocus,
  };
}

/** Clears the cached `currentTime` sample so the next heartbeat doesn't false-positive on a channel change. */
export function resetVideoSample(): void {
  lastVideoTime = 0;
  lastVideoTimeSampledAt = 0;
  lastActivityAt = Date.now();
}
