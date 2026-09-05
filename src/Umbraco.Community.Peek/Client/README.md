# Peek client

Two bundles out of one source tree.

| Output | Loaded by | Notes |
| --- | --- | --- |
| `peek.backoffice.js` | `umbraco-package.json`, inside the backoffice | Lit + UUI, with everything under `@umbraco-cms` treated as external |
| `peek.overlay.js` | `PeekOverlayMiddleware`, injected into the public site | Zero dependencies — not even Lit |

The overlay has no framework on purpose. It is injected into somebody else's page, where a framework
is a collision waiting to happen, so it is plain DOM inside a shadow root.

## Requirements

Node 22+ (the test runner relies on Node's built-in TypeScript support).

## Commands

```bash
npm install
npm run build     # tsc && vite build -> ../wwwroot/App_Plugins/Peek
npm run watch     # rebuild on change; pairs with dotnet watch on the test site
npm run check     # typecheck only
npm test          # headless tests for the overlay matcher (jsdom)
```

The built bundles in `../wwwroot/App_Plugins/Peek` are committed, so the package runs without a Node
toolchain. Rebuild and commit them alongside any change in here.

## Layout

```
src/
  bundle.manifests.ts        backoffice bundle entry — collates every manifest
  constants.ts               names shared with PeekConstants.cs
  api/                       typed client for the Peek Management API
  entrypoints/               token wiring + the workspace deep-link pulse
  dashboards/                Settings -> Peek reports hub
  workspace-views/           doctype "Usage", media "Used on"
  entity-actions/            "Inspect on site"
  shared/                    verdict presentation, the sampling notice
  overlay/                   front-end inspector entry — no Umbraco imports
    matching/                normalisation + DOM matching (mirrors PeekText.cs / PeekMatcher.cs)
    ui/                      styles, DOM helpers
test/register.mjs            resolves ./thing.js -> ./thing.ts so node --test can run the sources
```

## A rule worth keeping

`src/overlay/matching/text.ts` is the TypeScript half of `Inspection/Matching/PeekText.cs`. The two
must normalise text identically: the server's copy decides what the usage report counts as
"rendered", and this one decides what the overlay highlights and what coverage number the user sees.
Both sides have tests pinning the shared cases. If they drift, the tool starts contradicting itself.

## Regenerating the API client

`src/api/types.ts` is hand-written so the repository builds from a clean checkout without first
needing a running site to scrape an OpenAPI document from. To derive it instead, run the site and:

```bash
npx @hey-api/openapi-ts -i https://localhost:44348/umbraco/openapi/peek.json -o src/api/generated
```
