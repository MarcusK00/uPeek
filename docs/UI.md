# UI specification

Every surface Peek adds, what it is for, and — for the ones that matter most — why it is shaped the
way it is. Implemented surfaces are marked; the rest are in [ROADMAP.md](ROADMAP.md).

---

## The visual language

Decide once what an outline colour means and the tool teaches itself. Leave it arbitrary and every
overlay is just a box around some text.

| Treatment | Meaning | Token |
| --- | --- | --- |
| Blue solid | Property on the node that owns this URL | `--peek-owned` |
| Purple solid | Item inside a Block List or Block Grid | `--peek-block` |
| Amber solid | Shared content — Library element or picked node | `--peek-shared` |
| Teal solid | Media | `--peek-media` |
| Grey hatched | Rendered text the matcher could not attribute | `--peek-unattributed` |
| `?` badge | Matched, but more than one possible source | `--peek-warn` |

**Amber is the one that earns its keep.** It is not a warning that something is wrong, it is a
warning that the blast radius is bigger than the page you are looking at. On an Umbraco 18+ site with
reusable Elements in play, "edit this and you change 12 pages" is the single most expensive
misunderstanding available, and the overlay says it at the point of confusion rather than burying it
in a report.

The palette is defined once, in `Client/src/overlay/ui/styles.ts`, and adapts to
`prefers-color-scheme`. The backoffice surfaces use UUI tokens instead, so they follow the
backoffice theme rather than importing a second design system.

---

## Front end

### The pill — implemented

Bottom-right, draggable (it *will* end up on top of somebody's chat widget), six states. The mark
always leads and everything else — the tray, the X-ray panel — always unfurls to its right, never
its left, regardless of which edge of the viewport it was dropped near; the pill's own left edge is
the fixed point everything grows from, and it slides left as needed to keep the growth on screen.

| State | Label | Meaning |
| --- | --- | --- |
| hidden | — | Anonymous visitor. The script is never even served. |
| dormant | "Peek" | Signed in, inspect off |
| loading | "Reading page…" | Fetching the manifest |
| armed | "Hover anything" | Live |
| locked | "Pinned" | A card is pinned |
| xray | "X-ray" | Everything outlined, the pill expanded into its panel |
| degraded | "Partial coverage" | Armed, but coverage is below 60% |

<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd> arms it. Not <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>
— that belongs to the browser's own devtools, and fighting it would be both rude and futile.
<kbd>Esc</kbd> unpins, then disarms.

The **degraded** state is deliberate. A tool that silently hides its own gaps gets caught out once
and then abandoned.

### The hover card — implemented

Top to bottom: source-kind tag, culture (or "all languages" for an invariant property), publish
state, shared-usage count; then the breadcrumb; then the value; then metadata; then actions.

**The breadcrumb is the feature, not decoration.** `Home › contentBlocks[2] › blockTitle` is the
answer to the question people are actually asking. Node name alone does not help when everything
lives in a Block Grid.

**The state pill matters more than it looks.** Half the "where does this text come from" questions
are really "why isn't my change showing", and `draft pending` answers those instantly.

**Ambiguity is honest.** When several candidates claim the same text the card lists them all with a
"Peek will not guess" note, and arrow keys cycle between them. Confidently pointing at the wrong node
once is worse than saying "8 possible sources".

Pinning is non-negotiable: an unpinnable tooltip with buttons in it is unusable. Click to pin, then
the mouse can move into the card.

**Keyboard traversal**, with a card pinned:

| Key | Action |
| --- | --- |
| <kbd>←</kbd> <kbd>→</kbd> | Previous / next region in document order, scrolling it into view |
| <kbd>↑</kbd> <kbd>↓</kbd> | Cycle candidates when the match is ambiguous |
| <kbd>Enter</kbd> | Open this field in the backoffice |
| <kbd>Esc</kbd> | Unpin, then disarm |

**Copy actions** cost almost nothing and get used constantly: alias, node GUID, the Razor accessor
(element-aware — `@item.Content.Value<string>(…)` inside a block), and a pre-filled bug report with
URL, node, doctype, property, culture, viewport and backoffice link.

### X-ray mode — implemented

Outlines everything at once and **expands the pill itself into a panel** — the panel is a child of
`.peek-pill`, below the button row and separated from it by a single hairline.

It was a card floating at the right of the viewport first, and that was wrong twice over: it left the
user with two objects to keep track of when they had asked one question, and it broke the pill's own
promise that Peek is a thing you can pick up and move out of the way. Nested, the panel inherits the
pill's position for free — drag the mark and the panel goes with it — and it inherits the pill's
palette, so it stays a white chip in both schemes rather than a dark card bolted to a light one.
Everything inside it is drawn from the `--peek-pill-*` tokens for that reason, including a
light-ground copy of the kind scale: the dark-mode kind colours are tuned for a dark surface and go
washed out on white.

The row keeps its shape as the panel's header. **Inspect and X-ray stay beside the mark**, where they
were before anything expanded, and the mark itself does not move. Only **Stop** relocates, to the far
end of the row — a "leave this mode" control belongs away from the two switches, not under the cursor
that is working them.

Expanding pulls the pill up the page far enough for the panel to fit, and collapsing puts it back
where the user left it. A drag in between cancels that: wherever they put it is where it lives now.

The panel contains:

- **Coverage bar**, always shown, honest. "84% of visible text attributed · 6 unattributed."
- **Filter chips** double as the legend and as filters. Clicking "Shared" outlines what is shared —
  which is exactly how you answer "show me everything on this page I'd be changing for other pages
  too." Selected chips fill with the kind they select for, so the row keeps working as the legend
  while it is being used as a filter.

  **Nothing is selected to begin with, and nothing selected means nothing outlined.** X-ray opens on
  a bare page and an empty list, and every outline from there is one the user asked for by name.
  Opening straight into a page covered in boxes answers a question nobody asked yet, and it is
  picking the filters that makes X-ray a question you ask rather than a light you switch on.

  The filters belong to X-ray. **Inspect shares the same highlight layer but has no filter UI**, so
  an empty filter set means "nothing selected yet" there and "not applicable" in Inspect — which is
  why `#kindShown` checks the mode and not just the set. Miss that and Inspect silently stops
  outlining anything at all.
- **Unattributed** is the odd one out and has to be built differently: it is what is left over once
  every entry has been matched, so it is DOM elements rather than manifest entries. It gets rows of
  its own — the element (`footer#site-footer`) and the text it holds — because a filter that
  outlines the page but leaves the list empty reads as having found nothing. On the page it is
  **hatched**, not hairlined: grey is the right colour (it means "Peek cannot say", and it must not
  borrow one of the four kinds), but a 1px dashed outline on transparent was invisible enough that
  turning the filter on looked like nothing happening.
- **Entry list**, rendered first, then the interesting ones: values that exist and did not make it
  into the page, labelled `read, not rendered`. Clicking a row scrolls to and pins it; clicking one
  with nowhere to scroll opens it in the backoffice.
- **Warnings** from the manifest (truncated walk, unreadable property) appear above the list.

The "read, not rendered" line is where the whole thesis becomes visible in one page view rather than
after a 30-day sample.

---

## Backoffice

No new section. The reports belong where the question is already being asked, and an extra icon in
the left rail is a permanent tax on everyone's attention for something most people open twice a year.

### Document Type workspace → "Usage" — implemented

Per-property table: alias, editor, observed, rendered, verdict. Rows with content and zero renders
are tinted. Clicking a row expands the **per-culture breakdown**, which is not optional — on a Danish
multilingual site "renders on da-DK but never on en-GB" is a real and common finding.

Above the table sits the sampling notice, which **replaces every verdict with progress** until the
window and volume thresholds are met.

This is the killer placement: you are already staring at `seoKeywords` in the doctype editor.

### Media workspace → "Used on" — implemented

Either a reference list, or a hard "not referenced anywhere" state. Answered from Umbraco's relation
tracking rather than sampling, so it is exact. The empty state states the one remaining caveat
plainly: a reference hard-coded in a template, stylesheet or email layout was never recorded as a
relation.

Cheapest surface to build, easiest to demo to a non-technical client, and it closes a support ticket
that currently has no answer at all.

### Settings → Peek dashboard — implemented

Four stat tiles, then every observed property ranked by how dead it looks, then **reverse lookup**:
pick a property, get every URL where it was observed rendering, with a link to edit and a link to
inspect the live page with Peek armed.

The language is never "delete this". It is "0 observed renders", "always empty", "not measurable",
"excluded". Each verdict carries a tooltip explaining what it does and does not prove.

### Content tree → "Inspect on site" — implemented

Opens the front end with `?peek=1`, which arms inspect on arrival. A convenience, not a security
boundary — the overlay is only served to an authorised backoffice user in the first place.

### Deep links — implemented

`PeekBackofficeUrls` appends `?peekProperty=…&peekCulture=…`. The backoffice entry point watches for
the parameter, waits for the workspace to hydrate, then scrolls the property into view and pulses it.

Highlighting the field is the point. Getting a user to the *node* is what an edit link already does;
getting their eye to the right field on a doctype with forty properties is what saves the time.

---

## The states nobody designs

These are where tools like this usually fall down, and all of them are built:

| State | Behaviour |
| --- | --- |
| **Not enough data yet** | Report refuses verdicts, shows progress: days collected, page views seen, buffer depth |
| **Sampling switched off** | Says so, and how to switch it on — rather than showing an empty report |
| **Ambiguous match** | Every candidate listed and ranked; nothing guessed |
| **Zero coverage** | Pill goes to `degraded`, panel says how little was attributed |
| **Not an Umbraco page** | Bootstrap is omitted entirely; arming shows "Peek could not read this page" |
| **Unreadable property** | Logged, added to manifest warnings, page still renders |
| **Truncated walk** | Warning naming the limit that was hit |
| **Insufficient permission** | 404 from the endpoints; the overlay is never injected |

---

## Deliberately not built

- **Inline click-to-edit.** The obvious next step and a trap. It turns an inspection tool into a
  content-editing tool: validation, variants, permissions, concurrency, and a support burden an order
  of magnitude larger. Inspect and edit are different products. AEM's overlay is the cautionary tale
  — it went to click-to-edit and never delivered the inspection layer.
- **A dedicated backoffice section.** See above.
- **Badges and counts scattered through the backoffice.** Each one is a small permanent tax on
  everyone's attention, and most of the time the answer is boring.
