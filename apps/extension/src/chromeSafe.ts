/**
 * `true` when the `chrome.runtime` binding is still alive.
 *
 * Returns `false` after the extension is unloaded or reloaded — in that
 * state the content script keeps running but any `chrome.*` call throws
 * "Extension context invalidated". Every call site in the content-world
 * should guard with this before touching `chrome.*`.
 */
export function isExtensionContextAlive(): boolean {
  try {
    return (
      typeof chrome !== "undefined" &&
      !!chrome.runtime &&
      typeof chrome.runtime.id === "string"
    );
  } catch {
    return false;
  }
}

/**
 * Best-effort `chrome.runtime.sendMessage` wrapper.
 *
 * Swallows the three flavours of "background is gone" errors (context
 * invalidated, port closed, no receiver) so callers can fall back to a
 * sensible UI state instead of bubbling exceptions. Any other error is
 * swallowed too — return `null` and move on.
 *
 * @returns The background worker's response typed as `T`, or `null` on failure.
 */
export async function safeSendMessage<T = unknown>(
  msg: unknown,
): Promise<T | null> {
  if (!isExtensionContextAlive()) return null;
  try {
    return (await chrome.runtime.sendMessage(msg)) as T;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (
      /extension context invalidated|message port closed|receiving end does not exist/i.test(
        m,
      )
    ) {
      return null;
    }
    return null;
  }
}

let teardownCallbacks: Array<() => void> = [];

/**
 * Registers a callback that fires once when the extension context is
 * invalidated. Use it to unmount Preact trees, cancel reactive
 * subscriptions, and clear timers cleanly before the content script
 * becomes a zombie.
 *
 * @returns An `unsubscribe` function to deregister the callback.
 */
export function onExtensionContextLost(cb: () => void): () => void {
  teardownCallbacks.push(cb);
  return () => {
    teardownCallbacks = teardownCallbacks.filter((x) => x !== cb);
  };
}

let invalidated = false;

/**
 * Poll-friendly context check — returns `true` while the extension is
 * alive, `false` once it's gone, flushing every callback registered via
 * {@link onExtensionContextLost} exactly once on the transition.
 */
export function assertContextOrTeardown(): boolean {
  if (invalidated) return false;
  if (isExtensionContextAlive()) return true;
  invalidated = true;
  const cbs = teardownCallbacks.slice();
  teardownCallbacks = [];
  for (const cb of cbs) {
    try {
      cb();
    } catch {}
  }
  return false;
}
