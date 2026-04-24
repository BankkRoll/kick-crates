type PreviewListener = (itemId: string) => void;

const previewListeners = new Set<PreviewListener>();

/**
 * Cross-surface bus for "show me this item's details." Used by the
 * emote picker's locked-emote click path so users tapping a gated
 * emote in Kick's chat surface see the item preview on the
 * KickCrates dashboard.
 *
 * The dashboard is always rendered on the page when the user is at
 * `/kickcrates?kc_tab=...`; when not, the listener is un-mounted
 * and this call is a no-op (the user stays where they were). Future
 * work: navigate to the dashboard + pass the item id via URL param
 * so the preview works from anywhere on kick.com.
 */
export function requestItemPreview(itemId: string): void {
  for (const l of previewListeners) {
    try {
      l(itemId);
    } catch (e) {
      console.error("[KickCrates] preview listener threw:", e);
    }
  }
}

/** Subscribes to preview requests. Listener fires every time {@link requestItemPreview} is called. */
export function subscribeItemPreview(fn: PreviewListener): () => void {
  previewListeners.add(fn);
  return () => previewListeners.delete(fn);
}
