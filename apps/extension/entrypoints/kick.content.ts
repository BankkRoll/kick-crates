import { defineContentScript } from "wxt/sandbox";
import { startRouter } from "../src/content/router.js";
import {
  startActivityTracker,
  sampleSignals,
  resetVideoSample,
} from "../src/content/watch.js";
import { mountKickCrates } from "../src/content/mount.js";
import { api } from "../../../convex/_generated/api.js";
import { authedHttpClient } from "../src/convex.js";
import {
  safeSendMessage,
  assertContextOrTeardown,
  onExtensionContextLost,
} from "../src/chromeSafe.js";

/**
 * Content script entrypoint injected into every kick.com page.
 *
 * Mounts the in-page dialog / sidebar UI, starts the activity tracker,
 * and orchestrates watch sessions in response to SPA route changes. On
 * each channel navigation the script:
 *
 *  1. Resolves the channel's broadcaster id via `api.kickChannel.lookupBySlug`
 *     (an authed Convex action), gated by `sessionStartInFlight` so
 *     rapid back-to-back route events can't race two `session/start`
 *     messages for the same tab.
 *  2. Fires `session/start` to the background service worker, which
 *     owns the authoritative heartbeat state.
 *
 * A 5-second interval samples `sampleSignals()` and forwards each tick
 * as `session/heartbeatTick`; a separate 2-second interval probes the
 * MV3 extension context (invalidated on extension reload) and triggers
 * a full teardown when it's gone. `beforeunload` also ends the session
 * so the server doesn't keep a dangling session for a closed tab.
 */
export default defineContentScript({
  matches: ["*://kick.com/*", "*://*.kick.com/*"],
  runAt: "document_idle",
  main() {
    const unmount = mountKickCrates();
    const stopActivity = startActivityTracker();

    let currentSlug: string | null = null;
    let sessionStartInFlight = false;
    let teardownDone = false;

    const stopRouter = startRouter(async (slug) => {
      if (slug === currentSlug) return;
      currentSlug = slug;
      resetVideoSample();
      if (!slug) {
        await safeSendMessage({ type: "session/end" });
        return;
      }
      if (sessionStartInFlight) return;
      sessionStartInFlight = true;
      try {
        let channel;
        try {
          const client = await authedHttpClient();
          if (!client) return;
          channel = await client.action(api.kickChannel.lookupBySlug, { slug });
        } catch {
          channel = null;
        }
        if (!channel) return;
        await safeSendMessage({
          type: "session/start",
          broadcasterUserId: channel.broadcasterUserId,
          channelSlug: slug,
        });
      } finally {
        sessionStartInFlight = false;
      }
    });

    const signalsTicker = window.setInterval(() => {
      if (!assertContextOrTeardown()) return;
      const signals = sampleSignals();
      void safeSendMessage({ type: "session/heartbeatTick", signals });
    }, 5000);

    const contextCheck = window.setInterval(() => {
      assertContextOrTeardown();
    }, 2000);

    function teardown() {
      if (teardownDone) return;
      teardownDone = true;
      stopRouter();
      stopActivity();
      unmount();
      window.clearInterval(signalsTicker);
      window.clearInterval(contextCheck);
    }

    onExtensionContextLost(() => {
      teardown();
    });

    window.addEventListener("beforeunload", () => {
      void safeSendMessage({ type: "session/end" });
      teardown();
    });
  },
});
