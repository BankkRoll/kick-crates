type Listener = (open: boolean) => void;

let open = false;
const listeners = new Set<Listener>();

/** Opens the in-page dialog, locks the host page scroll, and notifies subscribers. No-op when already open. */
export function openDialog(): void {
  if (open) return;
  open = true;
  document.documentElement.classList.add("kc-no-scroll");
  for (const l of listeners) {
    try {
      l(true);
    } catch (e) {
      console.error("[KickCrates] listener threw:", e);
    }
  }
}

/** Closes the dialog, restores host page scroll, and notifies subscribers. No-op when already closed. */
export function closeDialog(): void {
  if (!open) return;
  open = false;
  document.documentElement.classList.remove("kc-no-scroll");
  for (const l of listeners) {
    try {
      l(false);
    } catch (e) {
      console.error("[KickCrates] listener threw:", e);
    }
  }
}

/** Flips the dialog between open and closed. */
export function toggleDialog(): void {
  if (open) closeDialog();
  else openDialog();
}

/**
 * Subscribes to open/close transitions.
 *
 * The listener is invoked once synchronously with the current state so
 * consumers don't need a separate initial read.
 *
 * @returns An `unsubscribe` function.
 */
export function subscribeDialog(fn: Listener): () => void {
  listeners.add(fn);
  fn(open);
  return () => listeners.delete(fn);
}

/** Synchronous snapshot of whether the dialog is currently open. */
export function isOpen(): boolean {
  return open;
}
