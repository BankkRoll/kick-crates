/** Messages exchanged between the popup / content script and the background service worker via `chrome.runtime.sendMessage`. */
export type InternalMessage =
  | { type: "auth/status" }
  | { type: "auth/start" }
  | { type: "auth/logout" }
  | { type: "session/start"; broadcasterUserId: number; channelSlug: string }
  | { type: "session/end" }
  | { type: "session/heartbeatTick"; signals: HeartbeatSignals }
  | { type: "crate/open"; crateSlug: string };

/** OAuth handoff payload posted from the Convex callback page into the background worker via `externally_connectable`. */
export type ExternalAuthMessage = {
  type: "kickcrates/auth-success";
  token: string;
  expiresAt: number;
  user: { name: string; profilePicture: string };
};

/** Anti-cheat signals sampled by the content script, forwarded to the server on every heartbeat. */
export type HeartbeatSignals = {
  tabVisible: boolean;
  videoPlaying: boolean;
  videoPositionAdvanced: boolean;
  msSinceLastActivity: number;
  volumeNonZero: boolean;
  documentHasFocus: boolean;
};

/** Response shape of the `auth/status` message; also returned by `currentAuthStatus` in the background worker. */
export type AuthStatus =
  | { signedIn: false }
  | {
      signedIn: true;
      user: { name: string; profilePicture: string | null };
      expiresAt: number;
    };
