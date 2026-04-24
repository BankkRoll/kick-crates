import { requestItemPreview } from "../dialogState.js";
import { startChatRewriter } from "./chatRewriter.js";
import { startEmoteState, stopEmoteState } from "./emoteState.js";
import { startEmotePickerInjector } from "./picker.js";
import { startQuickEmotesInjector } from "./quickEmotes.js";

/**
 * Boots every emote integration in the right order: the shared
 * {@link startEmoteState} subscription first (so the picker, quick-row,
 * and chat rewriter all read from a warm snapshot), then the three DOM
 * injectors. Returns a single teardown that disposes everything in reverse
 * so the Convex subscription is the last thing to close — this mirrors the
 * {@link mountKickCrates} pattern.
 *
 * Locked-emote clicks in the picker route through
 * {@link requestItemPreview}, which opens the in-page dialog on the
 * Collection tab with the clicked item already selected — no explicit
 * callback wiring required.
 */
export function startEmoteIntegration(): () => void {
  startEmoteState();
  const stopPicker = startEmotePickerInjector((itemId) => {
    requestItemPreview(itemId);
  });
  const stopQuick = startQuickEmotesInjector();
  const stopRewriter = startChatRewriter();
  return () => {
    try {
      stopRewriter();
    } catch {}
    try {
      stopQuick();
    } catch {}
    try {
      stopPicker();
    } catch {}
    stopEmoteState();
  };
}
