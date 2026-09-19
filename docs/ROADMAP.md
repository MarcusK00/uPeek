# Roadmap

## Where this build stands

Tier 1 is done and Tier 2 is largely done, which is not the order the original plan assumed.

That happened because of one architectural choice: the manifest is produced by a graph walk that
feeds *both* the overlay and the sampler. Once the walk and the matcher existed, the usage report was
a rollup table and a background service rather than a second system. The reporting tier turned out to
be the easy half, not the hard half.

| | Feature | State |
| --- | --- | --- |
| **1** | Inspect mode toggle, hotkey, draggable pill | done |
| **1** | Hover highlight and card (node, alias, doctype, culture, editor, publish state) | done |
| **1** | Nested block awareness with breadcrumbs | done |
| **1** | Deep link into the backoffice, right variant, pulsed property | done |
| **1** | Safe by default: anonymous HTML untouched, section-gated, cache-safe | done |
| **1** | Pinning, keyboard traversal, ambiguity handling, copy actions | done |
| **1** | Advanced mode with coverage and filter chips | done |
| **2** | Render sampling with buffered flush and retention | done |
| **2** | Orphan report with thresholds, exclusions and per-culture verdicts | done |
| **2** | Doctype "Usage" view | done |
| **2** | Reverse lookup (property → URLs) | done |
| **2** | Media "Used on" via relation tracking | done |
| **2** | Coverage map per page | done (the Advanced panel is this) |
| **2** | Observed render counts on the media view | partial — references are exact, the sampled count is stubbed at 0 |

---

## Next, in order of what each buys

### 1. A coverage number from a real site

Not a feature. The measurement that decides what this is.

Instrument the read log on one inherited client site, run the matcher, and count what percentage of
visible text can be attributed. **If it is 80%+, the overlay is the product. If it is 45%, the
reporting tier is the product and the overlay is a conference demo.** Every prioritisation below this
line is guesswork until that number exists.

Expect the failure set to be: values transformed in the view, values composed from several
properties, values inside minified or bundled output, short and numeric values, and RTE that gets
post-processed.

### 2. Rich text blocks

Blocks embedded inside an RTE value are currently not walked — their surrounding prose is matched,
their own content is not. On sites that lean on RTE blocks this is a visible hole in coverage, and it
is a bounded piece of work: the same collector, one more value shape.

### 3. Umbraco 18 Elements, first-class

The collector already treats a picked element as `Shared` and the overlay already colours it amber
and fetches its usage count. What is missing is the Library-specific framing: saying "this is a
Library element, used on 12 pages" rather than the generic shared badge, and an "Elements" lens in
the report.

This is the differentiator against anyone who clones the MVP. Every Elements feature Umbraco ships
increases the distance between "text on a page" and "the node it lives on".

### 4. A tag helper escape hatch

`<peek-track property="…">` as an **override**, never the primary mechanism. For the cases matching
structurally cannot reach: values built in the view, output that goes through a bundler, anything
composed from several properties. Explicit, opt-in, and it makes the coverage number improvable
rather than merely reportable.

### 5. Sampled render counts for media

The media view answers "what references this" exactly. It does not yet answer "what actually appeared
on a page". The observation pipeline already records media matches; this is wiring, not design.

### 6. Audit export

The reporting tier's actual buyer is an agency inheriting an undocumented site, and what they need on
day one is a document to hand the client — not a CSV. Same data, ordered as a narrative: what the
content model claims, what the site actually renders, what nobody has ever seen.

---

## Tier 3 — where it could go

**Headless mode.** Instrument the Delivery API the same way and attach the manifest to the response;
the same overlay bundle does the matching client-side. This is close to free given the current shape
— the overlay already matches against a live DOM using a manifest fetched separately, which is
exactly the headless flow. It widens the addressable market considerably, since a lot of newer
Umbraco work is decoupled.

**Diff overlay.** Tint regions by age of last edit, with a scrubber for the window. Answers "what
changed on the site this week?" visually. The manifest already carries `updateDate` per node; this is
mostly a rendering mode.

**Handoff / tour mode.** Swap the inspector card for authored annotations and a "next" button, so an
agency can record a walkthrough of a client's own site as onboarding. Editors learn their content
model from the actual thing they manage.

**Ticket generator.** The copy-a-bug-report action already produces the block. The remaining work is
pushing it to GitHub, Jira or Slack — which is integration surface, not product thinking.

---

## Positioning

Worth restating, because it changes what gets built next.

**The buyer is not the editor.** Editors have no budget. The buyer is an agency inheriting a site
with no documentation and a developer who left three years ago. For them this is a discovery tool
that collapses days of grep-and-guess into an afternoon, and the pricing conversation is "what is a
day of a senior developer's time worth".

Sell it as an agency onboarding and audit tool, not as an editor nicety. Orphan detection then
belongs to the same story — "here is the audit report you hand the client in week one" — rather than
being a separate paid feature that has to justify itself.

**On naming.** Nobody searches the Marketplace for "uPeek". Keep the codename for the brand and put
the descriptive term in the listing: *uPeek — Content Inspector for Umbraco*. Unglamorous, findable.

**On core.** The read-log half is essentially content telemetry, and HQ has an obvious reason to want
that in core. Ship the overlay free and open to establish the ground; monetise the reporting and
audit workflow around it. Do not bet the business on a primitive that could be absorbed. Anything
that instruments the converter layer for real is RFC territory rather than a package decision.
