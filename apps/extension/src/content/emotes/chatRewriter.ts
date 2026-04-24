import {
  getEmoteSnapshot,
  subscribeEmotes,
  type EmoteSnapshot,
} from "./emoteState.js";
import { EMOTE_TOKEN_REGEX } from "./insertToken.js";

const REWRITTEN_ATTR = "data-kc-rewritten";
const EMOTE_CLASS = "kc-chat-emote";

/**
 * Rewrites `:kc:<slug>:` tokens in rendered chat messages to inline SVG so
 * other extension-wearers see the KickCrates emote art instead of the raw
 * token.
 *
 * Architecture note: Kick's chat can fire hundreds of DOM mutations per
 * second on a busy stream. To keep up, we do three things — (1) observe
 * `document.body` once but filter mutations to added element subtrees only
 * (never walk the whole document), (2) short-circuit any node whose
 * `textContent` doesn't contain the literal substring `:kc:`, and (3) use a
 * single cached regex + `Map<slug, svg>` lookup keyed off the reactive
 * emote snapshot so every rewrite is O(1) on slug resolution. Edits to
 * user-authored input (`[contenteditable="true"]` subtrees) are skipped so
 * typing a token into the chat box doesn't prematurely render it. The
 * snapshot subscription also runs a full re-scan when the emote asset map
 * changes — e.g., after the user opens a crate — so tokens in messages
 * received before the asset loaded still render once the SVG arrives.
 *
 * @returns Teardown that disconnects the observer and the emote subscription.
 */
export function startChatRewriter(): () => void {
  let assetBySlug = snapshotAssets(getEmoteSnapshot());

  function scan(root: Element): void {
    if (!root.textContent || !root.textContent.includes(":kc:")) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node: Node): number {
        if (!node.nodeValue || !node.nodeValue.includes(":kc:")) {
          return NodeFilter.FILTER_REJECT;
        }
        let anc: Node | null = node.parentNode;
        while (anc) {
          if (anc instanceof Element) {
            if (anc.getAttribute(REWRITTEN_ATTR) === "true")
              return NodeFilter.FILTER_REJECT;
            if (anc.getAttribute("contenteditable") === "true")
              return NodeFilter.FILTER_REJECT;
            const tag = anc.tagName;
            if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA")
              return NodeFilter.FILTER_REJECT;
          }
          anc = anc.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const targets: Text[] = [];
    let cur = walker.nextNode();
    while (cur) {
      targets.push(cur as Text);
      cur = walker.nextNode();
    }
    for (const t of targets) rewriteTextNode(t);
  }

  function rewriteTextNode(textNode: Text): void {
    const source = textNode.nodeValue ?? "";
    EMOTE_TOKEN_REGEX.lastIndex = 0;
    if (!EMOTE_TOKEN_REGEX.test(source)) return;
    EMOTE_TOKEN_REGEX.lastIndex = 0;

    const parent = textNode.parentNode;
    if (!parent) return;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    let match: RegExpExecArray | null;
    let consumedAny = false;

    while ((match = EMOTE_TOKEN_REGEX.exec(source)) !== null) {
      const slug = match[1]!.toLowerCase();
      const svg = assetBySlug.get(slug);
      if (!svg) continue;
      consumedAny = true;
      if (match.index > cursor) {
        frag.appendChild(
          document.createTextNode(source.slice(cursor, match.index)),
        );
      }
      frag.appendChild(buildEmoteSpan(slug, svg));
      cursor = match.index + match[0].length;
    }
    if (!consumedAny) return;
    if (cursor < source.length) {
      frag.appendChild(document.createTextNode(source.slice(cursor)));
    }
    parent.replaceChild(frag, textNode);
  }

  function scanAll(): void {
    if (!document.body) return;
    scan(document.body);
  }

  const observer = new MutationObserver((records) => {
    for (const rec of records) {
      for (const added of rec.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE) {
          scan(added as Element);
        } else if (added.nodeType === Node.TEXT_NODE) {
          const parent = added.parentElement;
          if (parent) scan(parent);
        }
      }
      if (rec.type === "characterData" && rec.target instanceof Text) {
        const parent = rec.target.parentElement;
        if (parent) scan(parent);
      }
    }
  });
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  const unsub = subscribeEmotes((snap: EmoteSnapshot) => {
    assetBySlug = snapshotAssets(snap);
    scanAll();
  });

  scanAll();

  return () => {
    observer.disconnect();
    unsub();
  };
}

function snapshotAssets(snap: EmoteSnapshot): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of snap.all) m.set(e.slug.toLowerCase(), e.assetSvg);
  return m;
}

function buildEmoteSpan(slug: string, svg: string): HTMLElement {
  const span = document.createElement("span");
  span.className = EMOTE_CLASS;
  span.setAttribute(REWRITTEN_ATTR, "true");
  span.setAttribute("data-kc-slug", slug);
  span.title = slug;
  span.innerHTML = svg;
  return span;
}
