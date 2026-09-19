import type { PeekEntry, PeekPageManifest, PeekRegion } from '../types.js';
import { isInvisible, normalise } from './text.js';

export interface PeekMatchSummary {
  regions: PeekRegion[];
  /** Elements holding visible text that could not be attributed to any content property. */
  unattributed: HTMLElement[];
  coverage: number;
  matchedEntryIds: Set<string>;
}

/**
 * Attributes elements in the live DOM to content properties.
 *
 * Deliberately runs against the live DOM rather than the server's copy of the HTML, so that content
 * rendered or rearranged by client-side code is still attributable. The cost is that the overlay's
 * coverage number can differ slightly from the one in the usage report — the report only counts what
 * the server emitted, which is the right basis for an audit, while the overlay should describe the
 * page the user is actually looking at.
 */
export function matchDocument(manifest: PeekPageManifest): PeekMatchSummary {
  const byExactText = new Map<string, PeekEntry[]>();
  const partialCandidates: Array<{ entry: PeekEntry; fragment: string }> = [];

  for (const entry of manifest.entries) {
    for (const fragment of entry.matchTexts) {
      const key = fragment.toLowerCase();
      const bucket = byExactText.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        byExactText.set(key, [entry]);
      }

      partialCandidates.push({ entry, fragment: key });
    }
  }

  // Longest first: when "Kontakt os i dag" and "Kontakt" are both candidates for the same run of
  // text, the longer one is the better attribution.
  partialCandidates.sort((a, b) => b.fragment.length - a.fragment.length);

  const regions = new Map<HTMLElement, PeekRegion>();
  const unattributed: HTMLElement[] = [];
  const matchedEntryIds = new Set<string>();
  const minimum = manifest.matching.minimumValueLength;

  let visibleLeafCount = 0;
  let attributedLeafCount = 0;

  for (const leaf of collectTextLeaves(document.body, minimum)) {
    visibleLeafCount++;

    const text = normalise(leaf.text).toLowerCase();
    let entries = byExactText.get(text);
    let confidence: PeekRegion['confidence'] = 'exact';

    if (!entries) {
      // The value is wrapped in, or split by, inline markup. Still rendered, just not cleanly.
      const partial = partialCandidates.find(
        (candidate) => text.includes(candidate.fragment) || candidate.fragment.includes(text),
      );

      if (partial) {
        entries = [partial.entry];
        confidence = 'partial';
      }
    }

    if (!entries || entries.length === 0) {
      unattributed.push(leaf.element);
      continue;
    }

    attributedLeafCount++;
    addRegion(regions, leaf.element, entries, confidence);
    for (const entry of entries) {
      matchedEntryIds.add(entry.id);
    }
  }

  matchMedia(manifest, regions, matchedEntryIds);
  matchAttributes(manifest, regions, matchedEntryIds, minimum);

  return {
    regions: [...regions.values()],
    unattributed,
    coverage: visibleLeafCount === 0 ? 0 : attributedLeafCount / visibleLeafCount,
    matchedEntryIds,
  };
}

function addRegion(
  regions: Map<HTMLElement, PeekRegion>,
  element: HTMLElement,
  entries: PeekEntry[],
  confidence: PeekRegion['confidence'],
): void {
  const existing = regions.get(element);
  if (!existing) {
    regions.set(element, { element, entries: [...entries], confidence });
    return;
  }

  for (const entry of entries) {
    if (!existing.entries.some((candidate) => candidate.id === entry.id)) {
      existing.entries.push(entry);
    }
  }
}

function matchMedia(
  manifest: PeekPageManifest,
  regions: Map<HTMLElement, PeekRegion>,
  matchedEntryIds: Set<string>,
): void {
  const mediaEntries = manifest.entries.filter((entry) => entry.mediaUrl);
  if (mediaEntries.length === 0) {
    return;
  }

  const elements = document.querySelectorAll<HTMLElement>('img, picture source, video, [style*="url("]');

  for (const element of elements) {
    const haystack = [
      element.getAttribute('src'),
      element.getAttribute('srcset'),
      element.getAttribute('poster'),
      element.getAttribute('style'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack) {
      continue;
    }

    for (const entry of mediaEntries) {
      // Crop and resize parameters hang off the same base path, so containment is both sufficient
      // and resistant to querystring rewriting by an image CDN.
      if (haystack.includes(entry.mediaUrl!.toLowerCase())) {
        const target = element.tagName === 'SOURCE' ? (element.parentElement ?? element) : element;
        addRegion(regions, target, [entry], 'media');
        matchedEntryIds.add(entry.id);
      }
    }
  }
}

/**
 * Attributes that carry content the reader never sees as prose: link targets, form actions, meta
 * tags. A value found only here IS rendering — reporting it as an orphan would be wrong — but it is
 * not visible text, so these matches deliberately do not move the coverage number.
 */
const HIDDEN_ATTRIBUTES = ['href', 'src', 'srcset', 'action', 'poster', 'content', 'value'];

function matchAttributes(
  manifest: PeekPageManifest,
  regions: Map<HTMLElement, PeekRegion>,
  matchedEntryIds: Set<string>,
  minimumLength: number,
): void {
  const pending = manifest.entries.filter(
    (entry) => !matchedEntryIds.has(entry.id) && entry.matchTexts.length > 0,
  );

  if (pending.length === 0) {
    return;
  }

  const selector = HIDDEN_ATTRIBUTES.map((name) => `[${name}]`).join(',');

  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    if (element.closest('[data-peek-ui]')) {
      continue;
    }

    const haystack = HIDDEN_ATTRIBUTES.map((name) => element.getAttribute(name))
      .filter((value): value is string => Boolean(value) && value!.length >= minimumLength)
      .join(' ')
      .toLowerCase();

    if (!haystack) {
      continue;
    }

    for (const entry of pending) {
      if (entry.matchTexts.some((fragment) => haystack.includes(fragment.toLowerCase()))) {
        addRegion(regions, element, [entry], 'attribute');
        matchedEntryIds.add(entry.id);
      }
    }
  }
}

interface TextLeaf {
  element: HTMLElement;
  text: string;
}

/**
 * Collects the innermost element holding each run of visible text. Attribution is per element
 * rather than per text node, because an outline has to be drawn around something.
 */
function collectTextLeaves(root: HTMLElement | null, minimumLength: number): TextLeaf[] {
  const leaves: TextLeaf[] = [];
  if (!root) {
    return leaves;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || isInvisible(parent) || parent.closest('[data-peek-ui]')) {
        return NodeFilter.FILTER_REJECT;
      }

      return normalise(node.nodeValue).length >= minimumLength
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    const parent = current.parentElement;
    if (parent) {
      leaves.push({ element: parent, text: current.nodeValue ?? '' });
    }

    current = walker.nextNode();
  }

  return leaves;
}
