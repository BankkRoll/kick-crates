/**
 * Wraps raw SVG markup for use with Preact's `dangerouslySetInnerHTML`.
 *
 * Inline SVG is the primary rendering path for item art (`items.assetSvg`):
 * the browser parses the SVG once, CSS can style the resulting DOM
 * (including `currentColor`), and there's no data-URI encoding overhead.
 *
 * @param svg Raw SVG markup, or `null`/`undefined` for an empty fallback.
 * @returns   A `{ __html }` prop object.
 */
export function inlineSvg(svg: string | undefined | null): { __html: string } {
  return { __html: svg ?? "" };
}

/**
 * Encodes raw SVG markup into a `data:` URI suitable for CSS `url(...)`.
 *
 * Uses `encodeURIComponent` so UTF-8 characters (e.g. DiceBear's
 * attribution glyphs in the SVG's `<metadata>`) survive without
 * breaking the URI. Prefer {@link inlineSvg} — this variant is only
 * useful for pseudo-elements and shadow roots where `innerHTML`
 * injection isn't available.
 */
export function svgToDataUri(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/** Produces a CSS `background-image` value from raw SVG; returns `"none"` when no markup is provided. */
export function svgBackgroundImage(svg: string | undefined | null): string {
  if (!svg) return "none";
  return "url(" + svgToDataUri(svg) + ")";
}
