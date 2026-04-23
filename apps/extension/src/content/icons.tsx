import { h } from "preact";

/** Filled hex-shield crate icon used when the in-page dialog is open. */
export function CrateIconFilled() {
  return (
    <svg
      class="kc-sidebar-icon"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 2 4 7v7c0 7.1 5.2 14 12 17 6.8-3 12-9.9 12-17V7L16 2Z" />
      <path d="m10 13 6-3 6 3v7l-6 3-6-3v-7Z" fill="#06140a" opacity="0.45" />
      <path d="m16 10 6 3-6 3-6-3 6-3Z" fill="#06140a" opacity="0.6" />
    </svg>
  );
}

/** Outline crate icon used as the sidebar button's resting state. */
export function CrateIconOutline() {
  return (
    <svg
      class="kc-sidebar-icon"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 2 4 7v7c0 7.1 5.2 14 12 17 6.8-3 12-9.9 12-17V7L16 2Zm0 2.3 10 4v5.7c0 6.1-4.5 12.2-10 14.8C10.5 26.2 6 20.1 6 14V8.3l10-4Z"
        fill="currentColor"
      />
      <path
        d="m10 13 6-3 6 3v7l-6 3-6-3v-7Zm2 1.7v4.1l4 2 4-2v-4.1l-4-2-4 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Simple 16×16 "X" glyph. */
export function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path
        d="m3.3 3.3 9.4 9.4m0-9.4-9.4 9.4"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>
  );
}

/** Warning triangle glyph used by the fraud-flagged banner. */
export function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
      <path
        d="M8 1.5 1 13.5h14L8 1.5Z"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path
        d="M8 6.5v3.5"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
      <circle cx="8" cy="11.8" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** Category chip glyph for the Emotes tab. */
export function CategoryEmoteIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
      <path
        d="M8.5 14.5c.8 1.4 2.1 2.2 3.5 2.2s2.7-.8 3.5-2.2"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
    </svg>
  );
}

/** Category chip glyph for the Name Colors tab. */
export function CategoryNameColorIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <path d="M5 19h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      <path
        d="m7 16 5-11 5 11"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path d="M9 12h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  );
}

/** Category chip glyph for the Chat Flairs tab. */
export function CategoryChatFlairIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="11"
        rx="2"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <path
        d="m8 16-1.5 3L10 16"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path
        d="M7 9h10M7 12h6"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
    </svg>
  );
}

/** Category chip glyph for the Badges tab. */
export function CategoryBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <path
        d="M12 3 5 6v5c0 4.1 3 7.8 7 9 4-1.2 7-4.9 7-9V6l-7-3Z"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/** Category chip glyph for the Profile Cards tab. */
export function CategoryProfileCardIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <circle cx="9" cy="11" r="2" stroke="currentColor" stroke-width="1.4" />
      <path
        d="M5 17c1-2 3-3 4-3s3 1 4 3"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
      <path
        d="M14 9h5M14 12h5M14 15h3"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
    </svg>
  );
}
