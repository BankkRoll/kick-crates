const EMOTE_TOKEN_PREFIX = ":kc:";
const EMOTE_TOKEN_SUFFIX = ":";

/** Canonical wire format for a KickCrates emote reference in chat text. */
export function emoteToken(slug: string): string {
  return EMOTE_TOKEN_PREFIX + slug + EMOTE_TOKEN_SUFFIX;
}

/** Case-insensitive regex that captures the slug from any `:kc:<slug>:` occurrence in message text. */
export const EMOTE_TOKEN_REGEX = /:kc:([a-z0-9_-]{1,64}):/gi;

/**
 * Inserts an emote token (plus a trailing space) into Kick's Lexical-backed
 * chat input.
 *
 * Uses `document.execCommand("insertText")` because Lexical listens to the
 * synthesized `beforeinput` event and updates its editor state; direct
 * `textContent` / `value` mutation is swallowed on the next reconcile. If
 * execCommand is unavailable (very old runtimes) we fall back to dispatching
 * a `beforeinput` event by hand. A leading space is prepended when the
 * existing content doesn't already end with whitespace so the token never
 * glues onto the previous word.
 *
 * @returns `true` when the editor was found and focused; `false` if no
 *          editor is currently mounted on the page.
 */
export function insertEmoteToken(slug: string): boolean {
  const editor = document.querySelector<HTMLElement>(
    '[data-lexical-editor="true"]',
  );
  if (!editor) return false;
  editor.focus();

  const existingText = editor.textContent ?? "";
  const needsLeadingSpace =
    existingText.length > 0 && !/\s$/.test(existingText);
  const payload = (needsLeadingSpace ? " " : "") + emoteToken(slug) + " ";

  const ok = document.execCommand("insertText", false, payload);
  if (ok) return true;

  try {
    editor.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "insertText",
        data: payload,
        bubbles: true,
        cancelable: true,
      }),
    );
  } catch {}
  return true;
}
