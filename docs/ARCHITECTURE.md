# Architecture

The decisions in here are the ones that took thought. Each section says what was chosen, what was
rejected, and what it costs — because several of them are trades rather than wins, and a future
reader deserves to know which.

---

## 1. Graph walk, not an instrumented read log

**Chosen:** for each request, walk the published content graph outward from the routed page and
collect every property value that could plausibly appear in the output.

**Rejected:** instrumenting property reads — wrapping value converters, or decorating
`IPublishedModelFactory` — so that the request records exactly what the template asked for.

The read-log idea is genuinely attractive: it gives an exact manifest of what a page consumed, and
"read but not rendered" is a sharper orphan signal than "has a value and not rendered".

It does not survive contact with Umbraco's caching. Converted property values are cached by
`PropertyCacheLevel`, so a converter-level hook records a read on a cold cache and **nothing at all**
on a warm one. "Never read" would then mean "somebody else's request already warmed this", which is
not a fact about your content model. Wrapping the returned value instead of recording the read is
worse still: it changes what `Model.Title` *is*, and the first `Substring`, `IsNullOrEmpty` or
serialisation call breaks.

There is also a plain DI-ordering obstacle. Umbraco's `AddComposers()` runs after `AddBackOffice()`
and `AddWebsite()`, so a composer can replace ordinary services — but collections such as
`PropertyValueConverterCollection` are registered in `IUmbracoBuilder.Build()`, which runs *after*
composers. A package cannot decorate them from a composer at all.

**What it costs:** the walk includes values a template never asked for. A property that the template
reads and deliberately drops looks the same as one the template never touched. Peek therefore never
claims "unused" — it reports **"0 observed renders"**, which is exactly what it measured.

**Bounds:** the walk is limited three ways — `MaxDepth`, `MaxCandidates`, and a visited-key set. A
content graph with a picker cycle in it must not be able to hang a page render.

---

## 2. Two matchers, on purpose

There are two independent matching paths, and they answer different questions.

| | Server matcher (`PeekMatcher`) | Overlay matcher (`dom-matcher.ts`) |
| --- | --- | --- |
| Runs | on sampled requests, server-side | in the browser, when inspect is armed |
| Input | the HTML the server emitted | the live DOM |
| Feeds | the usage report | outlines and the coverage number |
| Sees client-rendered content | no | yes |

That difference is deliberate. An **audit** should only count what the server actually emitted; an
**inspector** should describe the page the user is actually looking at. Their coverage numbers can
therefore differ slightly, and that is correct rather than a bug.

What they must agree on is normalisation. `PeekText.Normalise` and `text.ts#normalise` are the same
algorithm in two languages, pinned by tests on both sides
(`PeekTextTests.cs`, `dom-matcher.test.ts`). If they drift, the tool starts contradicting itself,
which is worse than either answer alone.

### Matching rules

- Whitespace collapsed, comparison case-insensitive (CSS `text-transform` is common enough that a
  case-sensitive match would report ordinary headings as unrendered).
- Rich text is split **per block-level element**. An RTE value never appears in the DOM as one
  contiguous run of text; matching it whole would report every multi-paragraph body field as an
  orphan.
- Exact match on a text node is strong; a substring hit inside a longer run is weaker but still
  counts as rendering.
- The same text claimed by several candidates is **ambiguous** — every candidate is listed and none
  is chosen. "Read more" eight times on a page is not evidence about which node it came from.
- Values below `MinimumValueLength`, or purely numeric, are marked **unmatchable**. They still appear
  in the UI, flagged as "not looked for" rather than "not found", and they never count as orphan
  evidence.
- Values found only in `href`, `src`, `content` and friends **count as rendering but not as visible
  text**. They are on the page; they are not prose; counting them towards coverage would flatter the
  number. (This one came from running the demo site and finding a false positive.)

---

## 3. Two API surfaces

This looks redundant and is not.

**Management API** (`/umbraco/peek/api/v1/…`) — the backoffice UI. Authenticated the way every
Management API endpoint is: a bearer token issued to the backoffice SPA. Registers its own OpenAPI
document so `npm run generate-client` works.

**Inspector endpoints** (`/umbraco/peek/inspect/…`) — the overlay. The overlay runs on the *public*
site, where the backoffice bearer token does not exist. What does exist is the backoffice auth
cookie: Umbraco issues `UMB_UCONTEXT` with `Path=/`, so it is sent on front-end requests too. These
endpoints therefore authorise through `IPeekAuthorizer`, which validates that cookie and then checks
real section access.

They are **minimal-API endpoints**, not MVC controllers. Umbraco never calls `MapControllers()`, so
an attribute-routed controller shipped by a package is simply never reachable — and a package must
not call `MapControllers()` on the host's behalf, because that would double-map every attribute-routed
controller in the application. They are mapped from the pipeline filter's `PostMapEndpoints` hook.

### A trap worth writing down

Umbraco puts the **integer user id** in `ClaimTypes.NameIdentifier` and the **Guid key** in the
OpenIddict `sub` claim — the opposite way round from what the claim names suggest. Reading
`NameIdentifier` as a Guid silently fails to authorise anyone, with no error anywhere.
`PeekAuthorizer.ResolveUserAsync` reads both.

---

## 4. Request pipeline

`PeekOverlayMiddleware` is registered on the pipeline filter's **`PostPipeline`** hook. That position
matters:

- after `UseUmbracoCore`, so `IUmbracoContext` is alive;
- after `UseRouting` and `UseAuthentication`, so cookie authentication has a handler to call;
- still outside the endpoint middleware, so wrapping `next()` captures the rendered response.

The routed page is read from `HttpContext.Features.Get<UmbracoRouteValues>()` rather than from
`IUmbracoContext`. Both are populated at that point, but the feature is set by the route value
transformer and lives exactly as long as the `HttpContext`, which makes it the safer of the two to
read after the endpoint has finished.

### Cost on an anonymous request

Three checks, then `next()`:

1. Is it a GET for an extensionless, non-`/umbraco` path?
2. Is the backoffice auth cookie present? (a dictionary lookup — deliberately before any ticket
   decryption)
3. Is this request being sampled?

If all three miss, the response stream is never wrapped and the bytes are untouched. Installing Peek
costs an anonymous visitor nothing measurable.

### What gets injected

Only for an authorised viewer, and only a **bootstrap** — the page key, culture and template alias.
Not the manifest. Arming inspect mode is a separate authenticated call, so opening a page as an
editor does not ship a dump of your content model to the browser.

The response is only ever **appended to**, just before `</body>`. Peek never rewrites existing
markup. An earlier design injected `data-peek-*` attributes into the HTML; that was dropped because
it means reserialising somebody else's document, and the same information travels perfectly well in
a JSON payload the client matches for itself.

---

## 5. Sampling and storage

Never write per request. A site doing 12,000 views a month must not produce 12,000 database writes
to answer a question about which properties are dead.

```
sampled request ──► PeekObservationRecorder ──► in-memory buffer (bounded)
                                                      │  every 30s
                                                      ▼
                          PeekObservationFlushService ──► daily rollups
```

Three tables, created by a standard Umbraco migration plan:

- `peekPropertyObservation` — daily rollup per (contentType, property, culture) with observed /
  rendered / empty / unmatchable counters.
- `peekRenderLocation` — where a property was last seen rendering. This is what makes reverse lookup
  possible.
- `peekSampleDay` — the denominator. Without it "0 renders" is meaningless.

Observations are telemetry, not transactional data: losing the last few seconds on a recycle is fine
and far preferable to a row per page view. A full buffer **drops** rather than growing without bound,
and the dropped count is logged and surfaced in the sampling status so it cannot fail silently.

A failed Peek migration logs an error and lets the site boot. The reporting tier degrades to
unavailable; the inspector does not use these tables at all.

---

## 6. What the report is allowed to say

The whole product rests on the report being trustworthy once. Ship one confidently wrong orphan row
and every other row becomes worthless.

- **Below the thresholds** (`MinimumWindowDays`, `MinimumObservedPageViews`) the report renders
  progress, not verdicts.
- **One confirmed render clears a property**, regardless of sample size. Absence of evidence is the
  weak direction; presence is not.
- **Unmatchable beats orphan.** If every observation with a value was one Peek was not allowed to
  search for, the absence of a match says nothing, and the verdict is `NotMeasurable`.
- **Per-culture always.** On a Danish multilingual site "renders on da-DK but never on en-GB" is a
  real and common finding, and a collapsed count would hide exactly the thing worth knowing.
- **`RendersOutsidePageRequests`** exists because email templates, sitemaps, feeds, structured data
  and scheduled jobs are invisible to page-view sampling *by construction*. Without this escape
  hatch the report is dangerous.

Media usage is different, and deliberately so: it is answered from Umbraco's own relation tracking,
not from sampling. That makes it **exact** — if nothing references the item, nothing in the content
tree points at it. The remaining caveat is stated in the UI: a reference hard-coded in a template or
a stylesheet was never recorded as a relation.

---

## 7. Umbraco Cloud / CDN

Untested, and the one place a deployment could go wrong.

Peek sets `no-store` and `Vary: Cookie` on any response it modifies, which is correct for a
well-behaved shared cache. A CDN configured to ignore `Vary`, or to strip cookies before deciding
cacheability, could still serve an instrumented page to an anonymous visitor. Before running this on
a Cloud site, confirm the proxy layer honours `Vary: Cookie` — or set `Peek:Inspector:Enabled` to
false in the environments fronted by a cache and use it in staging only.

---

## 8. If this were to go further

The read-log half is essentially content telemetry, and HQ has an obvious reason to want that in
core. That is not a reason not to build it, but it does argue for shipping the overlay free and open
to establish the ground, and monetising the reporting and audit workflow around it, rather than
betting on a primitive that could be absorbed. Anything that instruments the converter layer for
real is RFC territory, not a package decision.

The number that decides whether the overlay is a product or a demo toy is **coverage on a real
inherited client site**. If it is 80%+, the whole thing works. If it is 45%, the reporting tier is
the actual product and the overlay is the thing that gets applause at Codegarden.
