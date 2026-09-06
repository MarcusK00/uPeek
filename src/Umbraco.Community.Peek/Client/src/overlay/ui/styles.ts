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
  --peek-unattributed: #8a8a8a;
  --peek-warn: #b8320c;

  --peek-surface: #ffffff;
  --peek-surface-2: #f6f6f8;
  --peek-border: #dcdce3;
  --peek-text: #1b1b1f;
  --peek-text-dim: #62626c;
  --peek-shadow: 0 6px 28px rgba(15, 15, 30, 0.18), 0 1px 3px rgba(15, 15, 30, 0.12);

  /* The pill is a fixed white chip in both schemes. It carries the Peek mark, which is drawn for a
     light ground, so a dark-mode surface behind it would leave the mark floating on its own halo. */
  --peek-pill-surface: #ffffff;
  --peek-pill-border: rgba(20, 20, 40, 0.12);
  --peek-pill-text: #1b1b1f;
  --peek-pill-text-dim: #62626c;
  --peek-pill-hover: #f1f1f5;

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
    --peek-owned: #7d8cf0;
    --peek-block: #b98ae4;
    --peek-shared: #e5a43c;
    --peek-media: #4ec5b1;
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
.peek-highlight[data-kind="Unattributed"]  { outline: 1px dashed var(--peek-unattributed); background: transparent; }

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
  align-items: center;
  background: var(--peek-pill-surface);
  border: 1px solid var(--peek-pill-border);
  border-radius: 20px;
  box-shadow: var(--peek-shadow);
  color: var(--peek-pill-text);
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

/* Dropped on the right of the viewport, the tray has to unfurl to the left of the mark. */
.peek-pill[data-side="right"] { flex-direction: row-reverse; }
.peek-pill[data-side="left"]  { flex-direction: row; }

.peek-pill[data-state="armed"],
.peek-pill[data-state="locked"] { border-color: var(--peek-owned); }
.peek-pill[data-state="xray"]     { border-color: var(--peek-block); }
.peek-pill[data-state="degraded"] { border-color: var(--peek-warn); }
.peek-pill[data-state="error"]    { border-color: var(--peek-warn); }

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
  width: 32px;
  height: auto;
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
.peek-pill[data-side="right"] .peek-tray-inner { border-right: 1px solid var(--peek-pill-border); padding-left: 10px; }
.peek-pill[data-side="left"]  .peek-tray-inner { border-left: 1px solid var(--peek-pill-border); padding-right: 10px; }

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
.peek-tray button[data-action="xray"][aria-pressed="true"]   { background: var(--peek-block-soft); color: var(--peek-block); }
.peek-tray button[data-action="stop"] { color: var(--peek-warn); }
.peek-tray button[hidden] { display: none; }

@media (prefers-reduced-motion: reduce) {
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
.peek-tag[data-tone="warn"]   { background: rgba(184, 50, 12, 0.12); color: var(--peek-warn); }
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

/* ---------------------------------------------------------------- x-ray panel */

.peek-panel {
  position: absolute;
  right: 20px;
  bottom: 74px;
  width: 380px;
  max-height: min(70vh, 620px);
  display: flex;
  flex-direction: column;
  background: var(--peek-surface);
  border: 1px solid var(--peek-border);
  border-radius: var(--peek-radius);
  box-shadow: var(--peek-shadow);
  pointer-events: auto;
  overflow: hidden;
}

.peek-panel-head {
  padding: 11px 13px;
  border-bottom: 1px solid var(--peek-border);
}

.peek-panel-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.peek-panel-title small {
  font-weight: 500;
  font-size: 11px;
  color: var(--peek-text-dim);
  font-family: var(--peek-mono);
}

.peek-coverage { margin-top: 8px; }

.peek-coverage-bar {
  height: 5px;
  border-radius: 3px;
  background: var(--peek-surface-2);
  overflow: hidden;
}

.peek-coverage-bar i {
  display: block;
  height: 100%;
  background: var(--peek-owned);
}

.peek-coverage-bar[data-low="true"] i { background: var(--peek-warn); }

.peek-coverage-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--peek-text-dim);
  margin-top: 4px;
}

.peek-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }

.peek-chip {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--peek-border);
  font-size: 11px;
  font-weight: 600;
}

.peek-chip[aria-pressed="false"] { opacity: 0.45; }
.peek-chip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.peek-chip[data-tone="owned"] i  { background: var(--peek-owned); }
.peek-chip[data-tone="block"] i  { background: var(--peek-block); }
.peek-chip[data-tone="shared"] i { background: var(--peek-shared); }
.peek-chip[data-tone="media"] i  { background: var(--peek-media); }
.peek-chip[data-tone="unattributed"] i { background: transparent; border: 1px dashed var(--peek-unattributed); }

.peek-panel-list {
  overflow-y: auto;
  padding: 6px 6px 10px;
}

.peek-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 6px 7px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid transparent;
  text-align: left;
}

.peek-row:hover { background: var(--peek-surface-2); }
.peek-row i { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex: none; }
.peek-row[data-kind="OwnedProperty"] i { background: var(--peek-owned); }
.peek-row[data-kind="Block"] i { background: var(--peek-block); }
.peek-row[data-kind="Shared"] i { background: var(--peek-shared); }
.peek-row[data-kind="Media"] i { background: var(--peek-media); }
.peek-row[data-rendered="false"] i { background: transparent; border: 1px dashed var(--peek-unattributed); }

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
  color: var(--peek-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.peek-row-note[data-tone="warn"] { color: var(--peek-warn); font-weight: 600; }

.peek-panel-foot {
  padding: 8px 13px;
  border-top: 1px solid var(--peek-border);
  font-size: 10.5px;
  color: var(--peek-text-dim);
}

.peek-notice {
  margin: 8px 13px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(184, 50, 12, 0.10);
  color: var(--peek-warn);
  font-size: 11.5px;
  font-weight: 600;
}

.peek-empty {
  padding: 22px 14px;
  text-align: center;
  color: var(--peek-text-dim);
  font-size: 12px;
}
`;
