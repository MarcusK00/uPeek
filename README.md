# uPeek: Content Inspector for Umbraco

**View Source, but for content.**

Open your site, arm uPeek, hover over anything. It tells you which node the text came from, which property
alias, which doctype, which culture, who last edited it and when, then deep links you straight to
that field in the backoffice, with the right variant open and the property pulsing.

It is like the browser devtools, except the tree it inspects is your content, not your DOM.

Then it runs the question backwards: **which properties on this site never reach a page at all?**

---

## Status

A working sketch, built against Umbraco 18.1.1 / .NET 10. Everything described below runs, there is
a test site in this repository that builds a demo content model on first boot and exercises every
path. It is not a released package: see [Known gaps](#known-gaps).

## Why

Do you often ask yourself "where does this text come from?".
Normally you would guess the node, grep the templates, or ask the developer who built it three years ago and left.
Block-based content made it worse, the text you are looking at may live four levels below the page that owns the URL, and Umbraco 18's reusable Elements make it worse again, because now the answer might be "on forty other pages too".

The closest thing in the ecosystem is a page-level edit link. That is node granularity. uPeek is property granularity, plus the inverse lookup.

## Features

### On the front end

A floating pill, visible only to signed-in backoffice users with content access. Arm it with the
pill or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd>, then hover.

| Outline     | Meaning                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| Blue        | A property on the node that owns this URL                                   |
| Purple      | An item inside a Block List or Block Grid                                   |
| Amber       | Shared content, a Library element or a picked node. Edits ripple elsewhere. |
| Grey dashed | Rendered text uPeek could not attribute                                      |
| `?` badge   | Matched, but more than one possible source                                  |

Amber is the important one. It is not a warning that something is wrong; it is a warning that the
blast radius is bigger than the page you are looking at.

The hover card shows the **breadcrumb**, `Home › contentBlocks[2] › blockTitle`, which is the
answer people are actually asking for. Plus culture, publish state (`draft pending` answers half the
"why isn't my change showing" questions on its own), last editor, and one-click copy of the alias,
the node GUID, or the Razor accessor.

**Advanced mode** opens a panel with filter chips, the honest coverage
number, and, the interesting part, the list of properties that have a value and did not make it
into the page.

### In the backoffice

uPeek does not add a section. The reports live where the question is already being asked:

- **Document Type workspace → "Usage"** — per-property render counts with a per-culture breakdown.
  This is the placement that sells it: you are staring at `seoKeywords` in the doctype editor and the
  tab next to Design tells you it has never rendered.
- **Media workspace → "Used on"** — every node referencing this item, or a plain "not referenced
  anywhere". Closes the "can I delete this?" ticket that currently has no answer.
- **Settings → uPeek dashboard** — the site-wide report, with reverse lookup as its centrepiece: pick
  a property, get every URL where it was observed rendering.
- **Content tree → "Inspect on site"** — opens the front end with uPeek already armed.

## Safety

These are properties of the design, not aspirations:

- **Anonymous visitors get byte-identical HTML.** The middleware checks for the backoffice auth
  cookie and, on a miss, calls the next delegate without wrapping the response stream at all.
- **Real authorisation, not "has a session".** The map leaks content structure, so access is gated on
  actual Content-section access, checked per request.
- **Cache-safe.** When uPeek changes the bytes, it sets `no-store` and `Vary: Cookie`, so an editor's
  page view cannot poison a shared cache with instrumented markup.
- **404, not 401.** The inspector endpoints do not reveal that uPeek is installed.
- **The report never says "delete this."** It says "0 observed renders", refuses to draw conclusions
  below a minimum sample size, and lets you exclude properties that render outside page requests.

## Getting started

```bash
git clone https://github.com/MarcusK00/uPeek.git
cd uPeek
dotnet build
dotnet test

cd testsite/uPeek.TestSite
dotnet run
```

Then open <https://localhost:44348>, sign in as `admin@peek.local` / `1234567890`, and visit
[`/en`](https://localhost:44348/en) or [`/da`](https://localhost:44348/da).

The test site builds its own demo content on first boot: two cultures, a Block List with nested
elements, a shared node rendered as a footer, and a `seoKeywords` property that every page fills in
and no template renders. That last one is the demo.

To rebuild the client bundles:

```bash
cd src/Umbraco.Community.uPeek/Client
npm install
npm run build     # or: npm run watch
npm test
```

## Using it in your own site

```xml
<ProjectReference Include="..\Umbraco.Community.uPeek\Umbraco.Community.uPeek.csproj" />
```

Nothing else. The composer wires itself up. Configuration is optional:

```json
{
  "uPeek": {
    "Enabled": true,
    "Inspector": {
      "Enabled": true,
      "RequiredSections": ["content"],
      "MaxDepth": 4,
      "MaxCandidates": 2500
    },
    "Matching": {
      "MinimumValueLength": 4,
      "MatchNumericValues": false
    },
    "Sampling": {
      "Enabled": false,
      "SampleRate": 0.05,
      "FlushInterval": "00:00:30",
      "RetentionDays": 60,
      "MinimumWindowDays": 14,
      "MinimumObservedPageViews": 500,
      "RendersOutsidePageRequests": ["*.seoKeywords", "blogPost.emailIntro"]
    }
  }
}
```

Sampling is **off by default**, the inspector works without it, and it is only meaningful once
somebody has decided to run an audit.

`RendersOutsidePageRequests` is the safety valve that makes the report trustworthy. A property that
only renders in an order-confirmation email, a sitemap, an RSS feed or a scheduled job is invisible
to page-view sampling by construction. Listing it here means uPeek reports it as "excluded" rather
than as a dead property.

## Repository layout

```
src/Umbraco.Community.uPeek/     the package (RCL)
  Inspection/                   candidate collection, matching, the overlay middleware
  Observations/                 sampling buffer, flush service, migrations, repository
  Reporting/                    the usage report and reverse lookup
  Api/                          Management API for the backoffice UI
  Client/                       TypeScript: backoffice extensions + the front-end overlay
tests/                          NUnit suite for the server matcher and URL builder
testsite/uPeek.TestSite/         a runnable Umbraco 18 site with generated demo content
docs/                           architecture, UI spec, roadmap
```

## Known gaps

Being honest about these is the point, because the whole product rests on trust in what it reports.

- **Coverage is real, and it is not 100%.** Values transformed in the view, composed from several
  properties, or produced by client-side code will not be attributed. The overlay shows the number
  rather than hiding it.
- **Rich text blocks** (blocks embedded inside an RTE value) are not walked. Their surrounding prose
  is matched; the block content is not.
- **Block Grid areas** are walked, but the demo site only exercises Block List. The code path is
  shared and covered by the same collector.
- **No visual regression tests**, no localisation, and the backoffice deep-link selector for pulsing
  a property is a best guess at the current workspace DOM.
- **Not tested against Umbraco Cloud.** In particular the CDN/proxy layer in front of a Cloud site
  needs deliberate handling; see `docs/ARCHITECTURE.md`.

## Licence

MIT.
