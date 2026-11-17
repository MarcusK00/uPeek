# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

uPeek is an Umbraco 18.1.1 / .NET 10 package — "View Source, but for content". A front-end overlay
attributes rendered text back to the node and property alias it came from; backoffice reports answer
the inverse question, which properties never reach a page.

It is two halves that must stay in step: a C# Razor Class Library (`src/Umbraco.Community.uPeek`) and
a TypeScript client (`.../Client`) that builds into that project's `wwwroot/App_Plugins/uPeek`.

`docs/ARCHITECTURE.md` is the authoritative record of *why* the load-bearing decisions were made
(including what was rejected and what it costs). Read it before changing the matching, pipeline or
sampling design. `docs/UI.md` is the same for every user-facing surface.

## Commands

```bash
# .NET (solution is Umbraco.uPeek.slnx; covers package, tests, test site)
dotnet build
dotnet test
dotnet test --filter "FullyQualifiedName~PeekTextTests"          # single fixture

# Test site: builds its own demo content on first boot
cd testsite/uPeek.TestSite && dotnet run
# https://localhost:44348 — admin@peek.local / 1234567890 — content at /en and /da

# Client (Node 22+; the test runner uses Node's built-in TypeScript support)
cd src/Umbraco.Community.uPeek/Client
npm install
npm run build      # tsc && vite build -> ../wwwroot/App_Plugins/uPeek
npm run watch      # pairs with `dotnet watch` on the test site
npm run check      # typecheck only
npm test           # overlay matcher tests (jsdom)
node --import ./test/register.mjs --test --test-name-pattern "rich text" \
  src/overlay/matching/dom-matcher.test.ts                        # single test
```

**The built bundles in `wwwroot/App_Plugins/uPeek` are committed** so the package runs without a Node
toolchain, and `.gitignore` carries an explicit exception for them. Any change under `Client/src`
must be rebuilt and the output committed alongside it, or the running site keeps the old behaviour.

## Architecture

### Front-end request flow

```
request ─► PeekOverlayMiddleware (PostPipeline)
             ├─ anonymous / not a page ─► next(), response stream never wrapped
             └─ authorised backoffice user ─► appends bootstrap JSON + <script> before </body>
                                                        │
overlay boots ─► GET /umbraco/upeek/inspect/manifest ─────┘
             └─► dom-matcher.ts matches manifest values against the live DOM ─► outlines, cards, Advanced
```

The injected payload is a **bootstrap** (page key, culture, template alias), never the manifest —
arming inspect is a separate authenticated call, so opening a page as an editor does not ship the
content model to the browser. The response is only ever *appended to*; uPeek never rewrites existing
markup.

`PeekComposer` is the single registration point for everything the package adds, including the
pipeline filter that installs the middleware (`PostPipeline`) and the inspector endpoints
(`PostMapEndpoints`). The middleware's position is load-bearing — see ARCHITECTURE.md §4.

### Two API surfaces, deliberately

| | Route | Auth | Consumer |
| --- | --- | --- | --- |
| Management API | `/umbraco/upeek/api/v1/…` | backoffice bearer token | backoffice extensions |
| Inspector | `/umbraco/upeek/inspect/…` | backoffice **cookie** via `IPeekAuthorizer` | the overlay, on the public site |

The overlay runs on the public site where the bearer token does not exist, but the backoffice auth
cookie does (issued with `Path=/`). Inspector endpoints are **minimal APIs** mapped from the pipeline
filter — Umbraco never calls `MapControllers()`, so an attribute-routed controller shipped by a
package is unreachable, and a package must not call it on the host's behalf. They return **404, not
401**, so an anonymous visitor cannot learn uPeek is installed.

### Two matchers that must not drift

`Inspection/Matching/PeekText.cs` and `Client/src/overlay/matching/text.ts` are the same
normalisation algorithm in two languages, pinned by tests on both sides (`PeekTextTests.cs`,
`dom-matcher.test.ts`). The server's copy decides what the usage report counts as "rendered"; the
client's decides what the overlay highlights and the coverage number the user sees. **Change one,
change the other, and update both test suites.**

The two *matchers* on top of them (`PeekMatcher.cs` over emitted HTML, `dom-matcher.ts` over the live
DOM) answer different questions on purpose, so their coverage numbers can legitimately differ.

Likewise `PeekConstants.cs` ↔ `Client/src/constants.ts` mirror route bases, query parameters and view
aliases by hand. The bootstrap/manifest `Version` fields (`PeekOverlayMiddleware`, `PeekPageManifest`,
both `1`) are checked against `SUPPORTED_VERSION` in `overlay/index.ts` — bump them together.

### Sampling and reporting

Off by default. Sampled requests feed a bounded in-memory buffer, drained every 30s by
`PeekObservationFlushService` into three tables (daily rollups, render locations, sample-day
denominator) created by a standard Umbraco migration. Observations are telemetry: a full buffer drops
rather than growing, and a failed migration logs and lets the site boot.

What the report is *allowed to say* is a design constraint, not a detail — thresholds, per-culture
verdicts, "0 observed renders" instead of "unused", and the `RendersOutsidePageRequests` escape
hatch. ARCHITECTURE.md §6 has the rules; don't loosen them casually. Media usage is different: it
comes from Umbraco's relation tracking, so it is exact.

### Client bundles

One source tree, two outputs (`Client/vite.config.ts`):

- `upeek.backoffice.js` — Lit + UUI, everything under `@umbraco-cms` external. Surfaces are collated
  in `bundle.manifests.ts` and loaded via `public/umbraco-package.json`.
- `upeek.overlay.js` — **zero dependencies, not even Lit**, plain DOM in a shadow root. It is injected
  into somebody else's page, where a framework is a collision waiting to happen. Nothing under
  `Client/src/overlay/` may import `@umbraco-cms` or add a runtime dependency.

## Conventions and traps

- **Relative imports are written `./thing.js` but the file on disk is `./thing.ts`.** Vite rewrites
  this at build time; `test/register.mjs` installs a resolve hook so `node --test` can too.
- **Umbraco puts the integer user id in `ClaimTypes.NameIdentifier` and the Guid key in the
  OpenIddict `sub` claim** — the opposite of what the names suggest. Reading `NameIdentifier` as a
  Guid silently authorises nobody, with no error. `PeekAuthorizer.ResolveUserAsync` reads both.
- **Anonymous responses must stay byte-identical.** Any change to the middleware's early-exit path
  needs to preserve that, and responses uPeek does modify set `no-store` + `Vary: Cookie`.
- **Files are CRLF** (`.editorconfig`). Scripted edits that normalise to LF will rewrite whole files
  in the diff.
- Overlay styling lives entirely in `Client/src/overlay/ui/styles.ts`; backoffice surfaces use UUI
  tokens instead so they follow the backoffice theme.
- Central package management via `Directory.Packages.props`; the Umbraco version is a single
  `$(UmbracoVersion)` property with floating versions enabled.
- `Client/src/api/types.ts` is hand-written on purpose so a clean checkout builds without first
  running a site to scrape OpenAPI from.
- Instrumenting Umbraco's converter layer for real is RFC territory, not a package decision
  (ARCHITECTURE.md §1 explains why the graph walk exists instead).

## Testing reality

`tests/` is an NUnit suite covering the server matcher, text normalisation and URL building;
`npm test` covers the overlay matcher. There are **no visual regression tests and no browser
automation in the repo** — overlay interaction behaviour (pointer capture, drag, tray, state
toggles) is not covered by any automated test and needs manual verification against the test site,
or a throwaway CDP/headless harness, when changed.
