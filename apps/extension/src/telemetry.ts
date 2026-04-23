import { api } from "../../../convex/_generated/api.js";
import { authedHttpClient, getHttpClient } from "./convex.js";
import { EXTENSION_VERSION } from "./env.js";

type Event = {
  kind: string;
  at: number;
  detail?: Record<string, unknown>;
};

const FLUSH_SIZE = 20;
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER = 200;

let buffer: Event[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

/**
 * Records a telemetry event.
 *
 * Events are buffered in memory and flushed when the buffer hits
 * `FLUSH_SIZE` (20), when the tab is hidden, or every 30 s. The buffer
 * is capped at 200 — older events are evicted rather than letting the
 * queue grow unbounded when the backend is unreachable. Telemetry is
 * deliberately best-effort: a failed flush drops the batch.
 *
 * @param kind  Stable event name, typically `subsystem.event`.
 * @param detail Optional structured payload; avoid PII, avoid large blobs.
 */
export function record(kind: string, detail?: Record<string, unknown>): void {
  if (buffer.length >= MAX_BUFFER) {
    buffer.shift();
  }
  buffer.push({ kind, at: Date.now(), detail });
  if (buffer.length >= FLUSH_SIZE) {
    void flush();
  } else {
    scheduleFlush();
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Sends the current buffer in one POST. Prefers the authed client so the
 * server can associate events with a user; falls back to an unauthed
 * client so boot-time failures (before sign-in) are still captured.
 * Drops the batch on failure — no retry queue.
 */
export async function flush(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (buffer.length === 0) return;
  const events = buffer.splice(0, buffer.length);
  try {
    const client = (await authedHttpClient()) ?? getHttpClient();
    if (!client) return;
    await client.mutation(api.telemetry.log, {
      events,
      extensionVersion: EXTENSION_VERSION,
    });
  } catch {}
}

/** Registers `visibilitychange` / `pagehide` listeners that flush on tab hide. Idempotent. */
export function installFlushHooks(): void {
  if (installed) return;
  installed = true;
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });
  }
  if (typeof self !== "undefined" && "addEventListener" in self) {
    self.addEventListener("pagehide", () => {
      void flush();
    });
  }
}
