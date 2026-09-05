import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { JSDOM } from 'jsdom';

import type { PeekEntry, PeekPageManifest } from '../types.js';

/**
 * Headless tests for the browser half of the matcher.
 *
 * The C# suite (`tests/Umbraco.Community.Peek.Tests/PeekMatcherTests.cs`) covers the server matcher
 * that feeds the usage report. This one covers the overlay matcher that decides what gets outlined
 * and what coverage number the user is shown. The two answer slightly different questions on
 * purpose — the overlay works against the live DOM, so it attributes content that client-side code
 * produced — but they must agree on normalisation, on what counts as visible text, and on the fact
 * that attribute-only matches never inflate coverage.
 *
 * Run with: npm test
 */

// The module reads `document` at call time, so the global has to exist before it is imported.
let matchDocument: typeof import('./dom-matcher.js').matchDocument;

function setBody(html: string): void {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);

  const globals = globalThis as Record<string, unknown>;
  globals.window = dom.window;
  globals.document = dom.window.document;
  globals.NodeFilter = dom.window.NodeFilter;
  globals.HTMLElement = dom.window.HTMLElement;
}

function entry(id: string, matchTexts: string[], overrides: Partial<PeekEntry> = {}): PeekEntry {
  return {
    id,
    nodeKey: '00000000-0000-0000-0000-000000000001',
    propertyAlias: 'alias',
    propertyName: 'Alias',
    editorAlias: 'Umbraco.TextBox',
    culture: 'en-US',
    segment: null,
    sourceKind: 'OwnedProperty',
    breadcrumb: [],
    valuePreview: matchTexts[0] ?? null,
    matchTexts,
    mediaUrl: null,
    state: 'Candidate',
    unmatchable: null,
    invariantAcrossCultures: false,
    editUrl: null,
    ...overrides,
  };
}

function manifest(entries: PeekEntry[]): PeekPageManifest {
  return {
    version: 1,
    url: '/en',
    culture: 'en-US',
    segment: null,
    preview: false,
    generatedAt: new Date().toISOString(),
    buildDurationMs: 1,
    page: null,
    nodes: [],
    entries,
    warnings: [],
    matching: { minimumValueLength: 4, matchNumericValues: false, previewLength: 180 },
    truncated: false,
  };
}

before(async () => {
  setBody('');
  ({ matchDocument } = await import('./dom-matcher.js'));
});

describe('overlay matcher', () => {
  it('attributes an exact text match to the innermost element', () => {
    setBody('<main><h1>Devtools for your content</h1></main>');

    const result = matchDocument(manifest([entry('e1', ['Devtools for your content'])]));

    assert.equal(result.regions.length, 1);
    assert.equal(result.regions[0].element.tagName, 'H1');
    assert.equal(result.regions[0].confidence, 'exact');
    assert.ok(result.matchedEntryIds.has('e1'));
  });

  it('matches case-insensitively and tolerates whitespace', () => {
    // A heading with text-transform: uppercase is still the same content.
    setBody('<h1>KONTAKT   OS\n I DAG</h1>');

    const result = matchDocument(manifest([entry('e1', ['Kontakt os i dag'])]));

    assert.ok(result.matchedEntryIds.has('e1'));
  });

  it('prefers the longest candidate when two could claim the same run of text', () => {
    setBody('<p>Kontakt os i dag</p>');

    const result = matchDocument(
      manifest([entry('short', ['Kontakt']), entry('long', ['Kontakt os i dag'])]),
    );

    assert.equal(result.regions[0].entries[0].id, 'long');
  });

  it('lists every candidate rather than guessing when the text is ambiguous', () => {
    setBody('<a>Read more here</a>');

    const result = matchDocument(
      manifest([entry('e1', ['Read more here']), entry('e2', ['Read more here'])]),
    );

    assert.equal(result.regions.length, 1);
    assert.equal(result.regions[0].entries.length, 2);
  });

  it('reports text it cannot attribute', () => {
    setBody('<p>From the content</p><p>Hard coded in the template</p>');

    const result = matchDocument(manifest([entry('e1', ['From the content'])]));

    assert.equal(result.unattributed.length, 1);
    assert.equal(result.coverage, 0.5);
  });

  it('matches a value that only reached the page as a link target', () => {
    setBody('<a href="/docs/architecture">Read the notes</a>');

    const result = matchDocument(manifest([entry('e1', ['/docs/architecture'])]));

    assert.ok(result.matchedEntryIds.has('e1'));
    assert.equal(result.regions.some((r) => r.confidence === 'attribute'), true);
  });

  it('does not let an attribute-only match inflate coverage', () => {
    setBody('<a href="/docs/architecture">Link text from the template</a>');

    const result = matchDocument(manifest([entry('e1', ['/docs/architecture'])]));

    // Rendering, yes. Visible text, no. Counting it would flatter the number.
    assert.equal(result.coverage, 0);
    assert.equal(result.unattributed.length, 1);
  });

  it('matches media on its URL, ignoring crop parameters', () => {
    setBody('<img src="/media/abc/hero.jpg?width=800&height=400" />');

    const result = matchDocument(
      manifest([entry('e1', [], { sourceKind: 'Media', mediaUrl: '/media/abc/hero.jpg' })]),
    );

    assert.ok(result.matchedEntryIds.has('e1'));
    assert.equal(result.regions[0].confidence, 'media');
  });

  it('ignores text inside script and style elements', () => {
    setBody("<script>var a = 'not really content';</script><p>Real body copy.</p>");

    const result = matchDocument(manifest([entry('e1', ['not really content'])]));

    assert.equal(result.matchedEntryIds.has('e1'), false);
  });

  it('never attributes its own chrome', () => {
    // The overlay lives in a shadow root, but its host element carries data-peek-ui and any
    // fallback markup must be excluded, or Peek would start inspecting itself.
    setBody('<div data-peek-ui="root"><span>Hover anything</span></div><p>Real body copy.</p>');

    const result = matchDocument(manifest([entry('e1', ['Hover anything'])]));

    assert.equal(result.matchedEntryIds.has('e1'), false);
    assert.equal(result.unattributed.length, 1);
  });

  it('matches rich text on any one of its fragments', () => {
    setBody('<div><p>First paragraph here.</p><p>Second paragraph here.</p></div>');

    const result = matchDocument(
      manifest([entry('e1', ['First paragraph here.', 'Second paragraph here.'])]),
    );

    assert.equal(result.coverage, 1);
    assert.equal(result.regions.length, 2);
  });

  it('ignores values shorter than the configured minimum', () => {
    setBody('<p>ok</p><p>A long enough value</p>');

    const result = matchDocument(manifest([entry('e1', ['A long enough value'])]));

    // The two-character paragraph is below minimumValueLength, so it is not counted as text the
    // matcher failed to attribute.
    assert.equal(result.coverage, 1);
    assert.equal(result.unattributed.length, 0);
  });
});
