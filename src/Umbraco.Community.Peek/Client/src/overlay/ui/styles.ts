/**
 * The overlay's entire visual language, in one place.
 *
 * The colour scale is the product, not decoration. Decide once what an outline colour means and the
 * tool teaches itself; leave it arbitrary and every overlay is just a box around some text.
 *
 *   blue    a property on the node that owns this URL
 *   purple  an item inside a Block List or Block Grid
 *   amber   shared content — a Library element or a picked node; edits ripple elsewhere
 *   grey    rendered text Peek could not attribute
 *   badge   matched, but more than one possible source
 *
 * Amber is the important one. It is not a warning that something is wrong, it is a warning that the
 * blast radius is bigger than the page you are looking at.
 */
export const OVERLAY_STYLES = /* css */ `
:host {
  --peek-owned: #3544b1;
  --peek-owned-soft: rgba(53, 68, 177, 0.10);
  --peek-block: #7b3fb5;
  --peek-block-soft: rgba(123, 63, 181, 0.10);
  --peek-shared: #b8730c;
  --peek-shared-soft: rgba(184, 115, 12, 0.12);
  --peek-media: #0f7b6c;
  --peek-media-soft: rgba(15, 123, 108, 0.10);
  --peek-unattributed: #6f6f7d;
  --peek-unattributed-soft: rgba(111, 111, 125, 0.20);
  --peek-active-border: #283a97;
  --peek-stop: #b8320c;

  --peek-surface: #ffffff;
  --peek-surface-2: #f6f6f8;
  --peek-border: #dcdce3;
  --peek-text: #1b1b1f;
  --peek-text-dim: #62626c;
  --peek-shadow: 0 6px 28px rgba(15, 15, 30, 0.18), 0 1px 3px rgba(15, 15, 30, 0.12);

  /* The pill is a fixed white chip in both schemes. It carries the Peek mark, which is drawn for a
     light ground, so a dark-mode surface behind it would leave the mark floating on its own halo. */
  --peek-pill-surface: #ffffff;
  --peek-pill-surface-2: #f4f4f8;
  --peek-pill-border: rgba(20, 20, 40, 0.12);
  --peek-pill-text: #1b1b1f;
  --peek-pill-text-dim: #28395d;
  --peek-pill-hover: #f1f1f5;

  /* The kind scale, pinned to its light-ground values. Everything the pill contains sits on white
     in both schemes, so it cannot use the dark-mode kind colours — those are tuned to be legible
     on a dark surface and go washed out here. The soft fills are rgba and need no twin. */
  --peek-pill-owned: #3544b1;
  --peek-pill-block: #7b3fb5;
  --peek-pill-shared: #b8730c;
  --peek-pill-media: #0f7b6c;
  --peek-pill-unattributed: #6f6f7d;

  --peek-radius: 8px;
  --peek-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --peek-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  all: initial;
  font-family: var(--peek-font);
  color: var(--peek-text);
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
}

@media (prefers-color-scheme: dark) {
  :host {
    --peek-surface: #1e1e24;
    --peek-surface-2: #26262e;
    --peek-border: #3a3a45;
    --peek-text: #f2f2f5;
    --peek-text-dim: #a3a3b0;
    --peek-owned: #283a97;
    --peek-block: #b98ae4;
    --peek-shared: #e5a43c;
    --peek-media: #4ec5b1;

    /* Lighter on a dark page, where the light-ground grey disappears. The panel keeps its own
       fixed one (--peek-pill-unattributed) because it is always on white. */
    --peek-unattributed: #b0b0c0;
    --peek-unattributed-soft: rgba(176, 176, 192, 0.22);
  }
}

* { box-sizing: border-box; }

/* ---------------------------------------------------------------- highlights */

.peek-highlight {
  position: absolute;
  pointer-events: none;
  border-radius: 3px;
  transition: opacity 120ms ease;
}

.peek-highlight[data-kind="OwnedProperty"] { outline: 2px solid var(--peek-owned); background: var(--peek-owned-soft); }
.peek-highlight[data-kind="Block"]         { outline: 2px solid var(--peek-block); background: var(--peek-block-soft); }
.peek-highlight[data-kind="Shared"]        { outline: 2px solid var(--peek-shared); background: var(--peek-shared-soft); }
.peek-highlight[data-kind="Media"]         { outline: 2px solid var(--peek-media); background: var(--peek-media-soft); }
/* Unattributed is the only highlight with no colour of its own to spend — grey is the point, it
   means "Peek cannot say". A 1px dashed hairline on transparent was so faint that turning the
   filter on read as nothing happening, so the region is hatched instead: unmistakably a marked
   area, still obviously not one of the four kinds, and legible on light and dark pages alike. */
.peek-highlight[data-kind="Unattributed"] {
  outline: 2px dashed var(--peek-unattributed);
  outline-offset: -1px;
  background: repeating-linear-gradient(
    45deg,
    var(--peek-unattributed-soft) 0 5px,
    transparent 5px 10px
  );
}

.peek-highlight[data-dimmed="true"] { opacity: 0.12; }

.peek-highlight .peek-ambiguous-badge {
  position: absolute;
  top: -9px;
  right: -9px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--peek-warn);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

/* ---------------------------------------------------------------- pill

   At rest the pill is the Peek mark and nothing else. Pressing it unfurls a tray of actions out of
   whichever side faces into the page, so the mark itself never moves — see #anchorPill. */

.peek-pill {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: var(--peek-pill-surface);
  border: 1px solid var(--peek-pill-border);
  border-radius: 20px;
  box-shadow: var(--peek-shadow);
  color: var(--peek-pill-text);
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

.peek-pill-row {
  display: flex;
  align-items: center;
  flex: none;

  /* The whole row drags, not just the mark, so the browser must not claim a touch here as a
     page scroll. The panel below is outside this row and still scrolls normally. */
  touch-action: none;
}

/* The mark always leads the row and everything else — the tray, the panel underneath it — always
   unfurls to its right, regardless of which edge of the viewport the pill was dropped near. The
   pill's own left edge stays fixed while it grows (see #anchorPill / #openPanel / #fitPill), so
   nothing here should reverse that and have content spill out to the mark's left instead. */
.peek-pill-row { flex-direction: row; }

/* Expanded, the pill is the panel: the same chip, grown downwards. The row end stays fully round so
   it still reads as the pill it was; the foot relaxes to a card corner, because 22px on a 300px-tall
   element reads as a lozenge. The row keeps its own height, so the mark does not move.

   The pill itself must not clip: the mark sits flush in the corner, and a radius across it shaves
   the icon. Only the panel clips, which is all that is needed for its own corners to follow. */
.peek-pill[data-expanded="true"] {
  width: 380px;
  max-width: calc(100vw - 32px);
  border-radius: 22px 22px 14px 14px;
}

.peek-pill[data-expanded="true"] .peek-panel {
  border-bottom-left-radius: 13px;
  border-bottom-right-radius: 13px;
  overflow: hidden;
}

/* Expanding pulls the pill up the page — and, if it has to, left to right its own width so growth
   never runs off the right edge — rather than teleporting there; animate both. A drag writes an
   explicit top/left on every pointermove, so it has to opt out or the pill lags the cursor. */
.peek-pill:not([data-dragging="true"]) { transition: top 200ms cubic-bezier(0.2, 0.8, 0.2, 1), left 200ms cubic-bezier(0.2, 0.8, 0.2, 1); }

/* The panel folding in or out of the row. The pill is pinned to an explicit size for the duration
   (see #fold) because neither an auto width nor an appearing/disappearing child is animatable, and
   it clips for the duration too, so the panel is wiped into and out of view rather than jumping.
   Both go away the moment the fold lands, so the mark is never clipped by the corner radius at
   rest. Same timing as the tray, so opening X-ray feels like the same mechanism as opening
   Inspect rather than a different one. */
.peek-pill[data-folding="true"] { overflow: hidden; }

/* Grabbing the pill mid-fold: the position has to track the cursor exactly, so the fold gives up
   its animation and lands at once rather than trailing behind the drag. */
.peek-pill[data-folding="true"]:not([data-dragging="true"]) {
  transition:
    width 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    height 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    border-radius 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    top 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    left 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.peek-pill[data-state="armed"],
.peek-pill[data-state="locked"] { border-color: var(--peek-owned); }
.peek-pill[data-state="xray"]     { border-color: var(--peek-owned); }
.peek-pill[data-state="degraded"] { border-color: var(--peek-active-border); }
.peek-pill[data-state="error"]    { border-color: var(--peek-stop); }

/* ------------------------------------------------ the mark */

.peek-pill .peek-badge {
  all: unset;
  box-sizing: border-box;
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  cursor: grab;
  touch-action: none;
}

.peek-pill[data-dragging="true"] .peek-badge { cursor: grabbing; }
.peek-pill .peek-badge:focus-visible { outline: 2px solid var(--peek-owned); outline-offset: 2px; }

.peek-pill .peek-mark {
  grid-area: 1 / 1;
  width: 28px;
  height: auto;
  transform: translate(0.7px, -1.1px); /* nudge */
  display: block;
  pointer-events: none;
  transition: opacity 160ms ease;
}

/* Both marks are in the DOM so the swap is a cross-fade, not a network round trip. */
.peek-pill .peek-mark[data-variant="active"] { opacity: 0; }
.peek-pill[data-active="true"] .peek-mark[data-variant="idle"]   { opacity: 0; }
.peek-pill[data-active="true"] .peek-mark[data-variant="active"] { opacity: 1; }

.peek-pill[data-state="loading"] .peek-mark { animation: peek-pulse 900ms ease-in-out infinite; }

@keyframes peek-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

/* ------------------------------------------------ the tray */

.peek-tray {
  width: 0;
  overflow: hidden;
  transition: width 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.peek-tray-inner {
  display: flex;
  align-items: center;
  gap: 4px;

  /* max-content, so the row keeps its natural width no matter what the clipping tray is animating
     to. This is the width #syncTrayWidth measures. */
  width: max-content;
  padding: 0 6px;
  opacity: 0;
  transition: opacity 140ms ease;
}

.peek-pill[data-open="true"] .peek-tray-inner { opacity: 1; transition-delay: 70ms; }

/* A hairline where the tray meets the mark, on whichever side the tray unfurled. */
.peek-tray-inner { border-left: 1px solid var(--peek-pill-border); padding-right: 10px; }

/* Expanded, the row is as wide as the panel, so the tray takes whatever the mark leaves. Inspect
   and X-ray stay where they have always been, next to the mark; only Stop is pushed out to the far
   end of the card — a "leave this mode" control belongs away from the two switches, not beside
   them where the cursor is already working. */
.peek-pill[data-expanded="true"] .peek-tray { flex: 1 1 auto; width: auto; overflow: visible; }
.peek-pill[data-expanded="true"] .peek-tray-inner { width: 100%; }
.peek-pill[data-expanded="true"] .peek-tray button[data-action="stop"] { margin-left: auto; }

.peek-tray .peek-status {
  font-family: var(--peek-font);
  font-size: 11px;
  font-weight: 600;
  color: var(--peek-pill-text-dim);
  white-space: nowrap;
  padding: 0 4px;
}

.peek-tray .peek-status[hidden] { display: none; }

.peek-tray button {
  all: unset;
  cursor: pointer;
  flex: none;
  padding: 5px 11px;
  border-radius: 999px;
  font-family: var(--peek-font);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  color: var(--peek-pill-text-dim);
  transition: background 120ms ease, color 120ms ease;
}

.peek-tray button:hover { background: var(--peek-pill-hover); color: var(--peek-pill-text); }
.peek-tray button:focus-visible { outline: 2px solid var(--peek-owned); outline-offset: 1px; }
.peek-tray button[data-action="toggle"][aria-pressed="true"] { background: var(--peek-owned-soft); color: var(--peek-owned); }
.peek-tray button[data-action="xray"][aria-pressed="true"]   { background: var(--peek-owned-soft); color: var(--peek-owned); }
.peek-tray button[data-action="stop"] { color: var(--peek-stop); }
.peek-tray button[hidden] { display: none; }

/* While a mode runs, both mode buttons stop taking presses — only Stop ends it. The two say so
   differently, because they mean different things:

   The mode that is NOT running is unavailable, and dims to say so.

   The mode that IS running is the answer to "what is Peek doing right now", so it must stay fully
   legible — dimming the one thing the user is looking for to tell them they cannot press it is the
   wrong trade. It keeps its lit fill and takes a ring in the same colour, which reads as a status
   light rather than a button, and drops the pointer cursor so nothing invites a press. */
.peek-tray button:disabled { cursor: default; pointer-events: none; }
.peek-tray button:disabled[aria-pressed="false"] { opacity: 0.35; }
.peek-tray button:disabled[aria-pressed="true"] { box-shadow: inset 0 0 0 1px var(--peek-owned); }

@media (prefers-reduced-motion: reduce) {
  .peek-pill,
  .peek-tray,
  .peek-tray-inner,
  .peek-pill .peek-mark { transition-duration: 0ms; }
  .peek-pill[data-state="loading"] .peek-mark { animation: none; }
}

/* ---------------------------------------------------------------- card */

.peek-card {
  position: absolute;
  width: 340px;
  max-width: calc(100vw - 32px);
  background: var(--peek-surface);
  border: 1px solid var(--peek-border);
  border-radius: var(--peek-radius);
  box-shadow: var(--peek-shadow);
  font-size: 12.5px;
  line-height: 1.45;
  overflow: hidden;
  pointer-events: none;
}

.peek-card[data-pinned="true"] { pointer-events: auto; }

.peek-card .peek-card-accent { height: 3px; }
.peek-card[data-kind="OwnedProperty"] .peek-card-accent { background: var(--peek-owned); }
.peek-card[data-kind="Block"] .peek-card-accent { background: var(--peek-block); }
.peek-card[data-kind="Shared"] .peek-card-accent { background: var(--peek-shared); }
.peek-card[data-kind="Media"] .peek-card-accent { background: var(--peek-media); }

.peek-card-body { padding: 10px 12px 12px; }

.peek-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  font-family: var(--peek-mono);
  font-size: 11px;
  color: var(--peek-text-dim);
  margin-bottom: 6px;
}

.peek-breadcrumb .peek-crumb-sep { opacity: 0.5; }
.peek-breadcrumb .peek-crumb-last { color: var(--peek-text); font-weight: 700; }

.peek-value {
  font-size: 13px;
  margin: 0 0 8px;
  max-height: 4.4em;
  overflow: hidden;
}

.peek-value[data-empty="true"] { color: var(--peek-text-dim); font-style: italic; }

.peek-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 10px;
  font-size: 11.5px;
  padding-top: 8px;
  border-top: 1px solid var(--peek-border);
}

.peek-meta dt { color: var(--peek-text-dim); }
.peek-meta dd { margin: 0; font-family: var(--peek-mono); overflow-wrap: anywhere; }

.peek-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }

.peek-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.peek-tag[data-tone="owned"]  { background: var(--peek-owned-soft); color: var(--peek-owned); }
.peek-tag[data-tone="block"]  { background: var(--peek-block-soft); color: var(--peek-block); }
.peek-tag[data-tone="shared"] { background: var(--peek-shared-soft); color: var(--peek-shared); }
.peek-tag[data-tone="media"]  { background: var(--peek-media-soft); color: var(--peek-media); }
.peek-tag[data-tone="warn"]   { background: rgba(184, 50, 12, 0.12); color: var(--peek-stop); }
.peek-tag[data-tone="quiet"]  { background: var(--peek-surface-2); color: var(--peek-text-dim); }

.peek-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--peek-border);
}

.peek-actions a,
.peek-actions button {
  all: unset;
  cursor: pointer;
  padding: 4px 9px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 600;
  background: var(--peek-surface-2);
  color: var(--peek-text);
  border: 1px solid var(--peek-border);
}

.peek-actions a.peek-primary {
  background: var(--peek-owned);
  border-color: var(--peek-owned);
  color: #fff;
}

.peek-actions a:hover,
.peek-actions button:hover { filter: brightness(0.95); }

.peek-candidates { margin: 0 0 8px; padding: 0; list-style: none; }

.peek-candidates li {
  padding: 5px 7px;
  border: 1px solid var(--peek-border);
  border-radius: 5px;
  margin-bottom: 4px;
  cursor: pointer;
  font-family: var(--peek-mono);
  font-size: 11px;
}

.peek-candidates li[aria-selected="true"] { border-color: var(--peek-owned); background: var(--peek-owned-soft); }

.peek-keyhint {
  margin-top: 8px;
  font-size: 10.5px;
  color: var(--peek-text-dim);
}

.peek-keyhint kbd {
  font-family: var(--peek-mono);
  background: var(--peek-surface-2);
  border: 1px solid var(--peek-border);
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 0 3px;
}

/* ---------------------------------------------------------------- x-ray panel

   The panel is not a window of its own — it is the pill, unfurled. It lives inside .peek-pill, so
   it inherits the pill's position (drag the mark, the panel comes along) and the pill's palette: a
   fixed white ground in both schemes, hairline borders, the mark's own blue. A separate dark
   surface here would read as a second, unrelated tool bolted to the chip. */

.peek-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: min(58vh, 460px);
  background: var(--peek-pill-surface);
  color: var(--peek-pill-text);
  font-size: 12.5px;
  line-height: 1.45;

  /* The seam between the buttons and the panel. It is the whole reason the two read as one object
     with a fold in it rather than as a card that happens to be touching a pill. */
  border-top: 1px solid var(--peek-pill-border);
}

.peek-panel-head {
  flex: none;
  padding: 11px 13px;
  border-bottom: 1px solid var(--peek-pill-border);
}

.peek-panel-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--peek-pill-text);
}

.peek-panel-title small {
  font-weight: 500;
  font-size: 11px;
  color: var(--peek-pill-text-dim);
  font-family: var(--peek-mono);
}

/* Section captions. Small, upper, tracked — the backoffice labels its groups this way, and it is
   what turns a stack of controls into a form rather than a dashboard. */
.peek-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--peek-pill-text-dim);
}

.peek-coverage { margin-top: 10px; }

.peek-coverage-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--peek-pill-surface-2);
  overflow: hidden;
}

.peek-coverage-bar i {
  display: block;
  height: 100%;
  background: var(--peek-pill-owned);
}

.peek-coverage-bar[data-low="true"] i { background: var(--peek-stop); }

.peek-coverage-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--peek-pill-text-dim);
  margin-top: 5px;
}

/* ------------------------------------------------ filters

   Square, bordered, flat-filled when on. The round dot-and-lozenge these replaced said "generic
   dashboard"; the backoffice's own controls are rectangles with a 3px corner and a solid selected
   state, and the kind colour reads better as an edge on one than as a bullet beside it.

   Nothing is selected by default and that means unfiltered, not "everything hidden" — so the
   resting look here has to be plainly interactive rather than switched-off. */
.peek-filters { margin-top: 11px; }
.peek-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

.peek-chip {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  align-items: stretch;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid var(--peek-pill-border);
  border-radius: 3px;
  background: var(--peek-pill-surface);
  font-family: var(--peek-font);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--peek-pill-text);
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.peek-chip:hover { background: var(--peek-pill-hover); }
.peek-chip:focus-visible { outline: 2px solid var(--peek-pill-owned); outline-offset: 1px; }

/* The kind colour as an edge down the leading side of the chip. */
.peek-chip i { width: 3px; border-radius: 1px; flex: none; }
.peek-chip[data-tone="owned"] i  { background: var(--peek-pill-owned); }
.peek-chip[data-tone="block"] i  { background: var(--peek-pill-block); }
.peek-chip[data-tone="shared"] i { background: var(--peek-pill-shared); }
.peek-chip[data-tone="media"] i  { background: var(--peek-pill-media); }
.peek-chip[data-tone="unattributed"] i { background: transparent; border-left: 3px dashed var(--peek-pill-unattributed); }

/* Selected filters fill with the kind they select for, so the chip row keeps working as the
   legend even once it is being used as a filter. */
.peek-chip[aria-pressed="true"] { color: #fff; }
.peek-chip[aria-pressed="true"] i { background: rgba(255, 255, 255, 0.9); border-left-color: rgba(255, 255, 255, 0.9); }
.peek-chip[aria-pressed="true"][data-tone="owned"]  { background: var(--peek-pill-owned); border-color: var(--peek-pill-owned); }
.peek-chip[aria-pressed="true"][data-tone="block"]  { background: var(--peek-pill-block); border-color: var(--peek-pill-block); }
.peek-chip[aria-pressed="true"][data-tone="shared"] { background: var(--peek-pill-shared); border-color: var(--peek-pill-shared); }
.peek-chip[aria-pressed="true"][data-tone="media"]  { background: var(--peek-pill-media); border-color: var(--peek-pill-media); }
.peek-chip[aria-pressed="true"][data-tone="unattributed"] { background: var(--peek-pill-unattributed); border-color: var(--peek-pill-unattributed); }

.peek-panel-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 0 4px;
}

/* A <button>, so it needs the same reset the chips get: left alone it paints the UA's grey
   buttonface, which on the panel's white ground reads as a filled block behind every row.

   Full-bleed and divided rather than a stack of floating rounded cards: this is a list of records,
   which is what the backoffice draws as a plain table with hairlines between. The kind colour is
   the same edge the chips use, so the legend reads straight down into the list. */
.peek-row {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  padding: 7px 13px 7px 0;
  cursor: pointer;
  text-align: left;
  font-family: var(--peek-font);
  color: var(--peek-pill-text);
  border-bottom: 1px solid var(--peek-pill-border);
  transition: background 120ms ease;
}

.peek-row:last-child { border-bottom: none; }
.peek-row:hover { background: var(--peek-pill-hover); }
.peek-row:focus-visible { outline: 2px solid var(--peek-pill-owned); outline-offset: -2px; }

.peek-row i { width: 3px; flex: none; }
.peek-row[data-kind="OwnedProperty"] i { background: var(--peek-pill-owned); }
.peek-row[data-kind="Block"] i { background: var(--peek-pill-block); }
.peek-row[data-kind="Shared"] i { background: var(--peek-pill-shared); }
.peek-row[data-kind="Media"] i { background: var(--peek-pill-media); }
.peek-row[data-rendered="false"] i { background: repeating-linear-gradient(180deg, var(--peek-pill-unattributed) 0 3px, transparent 3px 6px); }

/* Rows for text with no entry behind it at all — hatched down the edge, like the region on the page. */
.peek-row[data-kind="Unattributed"] i {
  background: repeating-linear-gradient(135deg, var(--peek-pill-unattributed) 0 3px, transparent 3px 6px);
}

.peek-row[data-kind="Unattributed"] .peek-row-alias { color: var(--peek-pill-text-dim); }

.peek-row-main { min-width: 0; flex: 1; }

.peek-row-alias {
  font-family: var(--peek-mono);
  font-size: 11.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.peek-row-note {
  font-size: 10.5px;
  color: var(--peek-pill-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.peek-row-note[data-tone="warn"] { color: var(--peek-stop); font-weight: 600; }

.peek-panel-foot {
  flex: none;
  padding: 8px 13px;
  border-top: 1px solid var(--peek-pill-border);
  font-size: 10.5px;
  color: var(--peek-pill-text-dim);
}

.peek-notice {
  margin: 8px 13px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(184, 50, 12, 0.10);
  color: var(--peek-stop);
  font-family: var(--peek-font);
  font-size: 11.5px;
  font-weight: 600;
}

.peek-empty {
  padding: 22px 14px;
  text-align: center;
  color: var(--peek-pill-text-dim);
  font-size: 12px;
}
`;
