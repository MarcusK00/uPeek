/**
 * Text normalisation for the overlay.
 *
 * This is the TypeScript half of `Inspection/Matching/PeekText.cs`. The two MUST agree: the server
 * uses its copy to decide what the usage report counts as "rendered", and the overlay uses this one
 * to decide what it highlights and what coverage number it shows. If they drift, the tool starts
 * contradicting itself, which is worse than either answer alone.
 *
 * There is a unit test pinning the shared cases in `tests/Umbraco.Community.uPeek.Tests`.
 */

/**
 * Collapse whitespace runs to a single space and trim. Casing is preserved — comparison is done
 * case-insensitively instead, because CSS `text-transform` is common enough that a case-sensitive
 * match would report perfectly ordinary headings as unrendered.
 */
export function normalise(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  let out = '';
  let pendingSpace = false;

  for (const ch of value) {
    if (/\s/.test(ch) || ch === ' ' || ch === '​') {
      pendingSpace = out.length > 0;
      continue;
    }

    if (pendingSpace) {
      out += ' ';
      pendingSpace = false;
    }

    out += ch;
  }

  return out;
}

export function equals(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalise(a).toLowerCase() === normalise(b).toLowerCase();
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max).trimEnd()}…`;
}

/** Elements whose text is never user-visible content. */
const INVISIBLE = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'HEAD',
  'TITLE',
  'META',
  'LINK',
]);

export function isInvisible(element: Element): boolean {
  return INVISIBLE.has(element.tagName);
}
