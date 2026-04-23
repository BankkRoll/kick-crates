import { defineBackground } from "wxt/sandbox";
import {
  currentAuthStatus,
  startLoginFlow,
  registerExternalAuthListener,
  logout,
} from "../src/background/auth.js";
import {
  getActiveSession,
  startSession,
  endSession,
  recordSignals,
  onAlarm,
} from "../src/background/heartbeat.js";
import { applyAuthToReactive, authedHttpClient } from "../src/convex.js";
import { api } from "../../../convex/_generated/api.js";
import { installFlushHooks, record as recordTelemetry } from "../src/telemetry.js";
import type { InternalMessage } from "../src/messaging.js";

/**
 * MV3 service worker entrypoint.
 *
 * Boots the telemetry flush hooks, reapplies auth to the reactive Convex
 * client, wires the external OAuth callback listener, and registers
 * handlers for both `chrome.alarms` (heartbeat ticks) and the internal
 * message bus. Message types routed here cover auth
 * (`auth/status` | `auth/start` | `auth/logout`), watch sessions
 * (`session/start` | `session/end` | `session/heartbeatTick`), and the
 * privileged `crate/open` mutation — performing the mutation in the
 * service worker keeps the Convex JWT out of page scripts.
 *
 * Also ends the active session when its owning tab is closed so the
 * heartbeat doesn't keep crediting watch time after the user leaves.
 */
export default defineBackground(() => {
  installFlushHooks();

  applyAuthToReactive().catch((e) => {
    console.warn("[KickCrates] applyAuthToReactive failed:", e);
    recordTelemetry("background.apply_auth_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  });

  registerExternalAuthListener(() => {});

  chrome.alarms.onAlarm.addListener((alarm) => {
    void onAlarm(alarm.name);
  });

  chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const msg = raw as InternalMessage;
    (async () => {
      try {
        switch (msg.type) {
          case "auth/status": {
            const status = await currentAuthStatus();
            sendResponse(status);
            return;
          }
          case "auth/start": {
            const r = await startLoginFlow();
            sendResponse(r);
            return;
          }
          case "auth/logout": {
            await endSession("user_ended").catch(() => {});
            await logout();
            sendResponse({ ok: true });
            return;
          }
          case "session/start": {
            const tabId = _sender.tab?.id ?? -1;
            if (tabId < 0) {
              sendResponse({ ok: false, error: "no tab id" });
              return;
            }
            const status = await currentAuthStatus();
            if (!status.signedIn) {
              sendResponse({ ok: false, error: "not signed in" });
              return;
            }
            const r = await startSession({
              broadcasterUserId: msg.broadcasterUserId,
              channelSlug: msg.channelSlug,
              tabId,
            });
            sendResponse(r);
            return;
          }
          case "session/end": {
            await endSession("user_ended");
            sendResponse({ ok: true });
            return;
          }
          case "session/heartbeatTick": {
            recordSignals(msg.signals);
            sendResponse({ ok: true });
            return;
          }
          case "crate/open": {
            try {
              const client = await authedHttpClient();
              if (!client) {
                sendResponse({ ok: false, error: "Convex not configured" });
                return;
              }
              const r = await client.mutation(api.crates.openCrate, {
                crateSlug: msg.crateSlug,
              });
              sendResponse({ ok: true, result: r });
            } catch (e) {
              sendResponse({
                ok: false,
                error: e instanceof Error ? e.message : String(e),
              });
            }
            return;
          }
          default: {
            sendResponse({ error: "unknown message" });
            return;
          }
        }
      } catch (e) {
        sendResponse({
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })().catch(() => {});
    return true;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    const active = getActiveSession();
    if (active && active.tabId === tabId) {
      endSession("user_ended").catch(() => {});
    }
  });
});
