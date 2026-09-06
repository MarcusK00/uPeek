function S(o) {
  if (!o)
    return "";
  let e = "", t = !1;
  for (const a of o) {
    if (/\s/.test(a) || a === " " || a === "​") {
      t = e.length > 0;
      continue;
    }
    t && (e += " ", t = !1), e += a;
  }
  return e;
}
const T = /* @__PURE__ */ new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "HEAD",
  "TITLE",
  "META",
  "LINK"
]);
function A(o) {
  return T.has(o.tagName);
}
function L(o) {
  const e = /* @__PURE__ */ new Map(), t = [];
  for (const p of o.entries)
    for (const h of p.matchTexts) {
      const c = h.toLowerCase(), u = e.get(c);
      u ? u.push(p) : e.set(c, [p]), t.push({ entry: p, fragment: c });
    }
  t.sort((p, h) => h.fragment.length - p.fragment.length);
  const a = /* @__PURE__ */ new Map(), i = [], r = /* @__PURE__ */ new Set(), s = o.matching.minimumValueLength;
  let d = 0, l = 0;
  for (const p of I(document.body, s)) {
    d++;
    const h = S(p.text).toLowerCase();
    let c = e.get(h), u = "exact";
    if (!c) {
      const k = t.find(
        (b) => h.includes(b.fragment) || b.fragment.includes(h)
      );
      k && (c = [k.entry], u = "partial");
    }
    if (!c || c.length === 0) {
      i.push(p.element);
      continue;
    }
    l++, g(a, p.element, c, u);
    for (const k of c)
      r.add(k.id);
  }
  return C(o, a, r), $(o, a, r, s), {
    regions: [...a.values()],
    unattributed: i,
    coverage: d === 0 ? 0 : l / d,
    matchedEntryIds: r
  };
}
function g(o, e, t, a) {
  const i = o.get(e);
  if (!i) {
    o.set(e, { element: e, entries: [...t], confidence: a });
    return;
  }
  for (const r of t)
    i.entries.some((s) => s.id === r.id) || i.entries.push(r);
}
function C(o, e, t) {
  const a = o.entries.filter((r) => r.mediaUrl);
  if (a.length === 0)
    return;
  const i = document.querySelectorAll('img, picture source, video, [style*="url("]');
  for (const r of i) {
    const s = [
      r.getAttribute("src"),
      r.getAttribute("srcset"),
      r.getAttribute("poster"),
      r.getAttribute("style")
    ].filter(Boolean).join(" ").toLowerCase();
    if (s) {
      for (const d of a)
        if (s.includes(d.mediaUrl.toLowerCase())) {
          const l = r.tagName === "SOURCE" ? r.parentElement ?? r : r;
          g(e, l, [d], "media"), t.add(d.id);
        }
    }
  }
}
const m = ["href", "src", "srcset", "action", "poster", "content", "value"];
function $(o, e, t, a) {
  const i = o.entries.filter(
    (s) => !t.has(s.id) && s.matchTexts.length > 0
  );
  if (i.length === 0)
    return;
  const r = m.map((s) => `[${s}]`).join(",");
  for (const s of document.querySelectorAll(r)) {
    if (s.closest("[data-peek-ui]"))
      continue;
    const d = m.map((l) => s.getAttribute(l)).filter((l) => !!l && l.length >= a).join(" ").toLowerCase();
    if (d)
      for (const l of i)
        l.matchTexts.some((p) => d.includes(p.toLowerCase())) && (g(e, s, [l], "attribute"), t.add(l.id));
  }
}
function I(o, e) {
  const t = [];
  if (!o)
    return t;
  const a = document.createTreeWalker(o, NodeFilter.SHOW_TEXT, {
    acceptNode(r) {
      const s = r.parentElement;
      return !s || A(s) || s.closest("[data-peek-ui]") ? NodeFilter.FILTER_REJECT : S(r.nodeValue).length >= e ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let i = a.nextNode();
  for (; i; ) {
    const r = i.parentElement;
    r && t.push({ element: r, text: i.nodeValue ?? "" }), i = a.nextNode();
  }
  return t;
}
function n(o, e = {}, ...t) {
  const a = document.createElement(o);
  for (const [i, r] of Object.entries(e))
    r != null && (i === "class" ? a.className = r : i === "text" ? a.textContent = r : a.setAttribute(i, r));
  for (const i of t)
    i != null && a.append(i);
  return a;
}
function x(o) {
  for (; o.firstChild; )
    o.firstChild.remove();
}
async function M(o) {
  try {
    return await navigator.clipboard.writeText(o), !0;
  } catch {
    return !1;
  }
}
function N(o) {
  if (!o)
    return "—";
  const e = new Date(o);
  if (Number.isNaN(e.getTime()))
    return "—";
  const t = (a) => String(a).padStart(2, "0");
  return `${t(e.getDate())}-${t(e.getMonth() + 1)}-${e.getFullYear()} ${t(e.getHours())}:${t(e.getMinutes())}`;
}
function R(o) {
  if (!o)
    return "";
  const e = new Date(o);
  if (Number.isNaN(e.getTime()))
    return "";
  const t = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }), a = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"]
  ];
  let i = (e.getTime() - Date.now()) / 1e3;
  for (const [r, s] of a) {
    if (Math.abs(i) < r)
      return t.format(Math.round(i), s);
    i /= r;
  }
  return "";
}
const D = (
  /* css */
  `
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
`
), f = 0.6, B = 4;
function v(o) {
  return new URL(o, import.meta.url).href;
}
const w = {
  idle: v("icons/PeekIconUnactive.png"),
  active: v("icons/PeekIconActive.png")
}, U = {
  OwnedProperty: "owned",
  Block: "block",
  Shared: "shared",
  Media: "media"
}, O = {
  OwnedProperty: "This page",
  Block: "Block",
  Shared: "Shared",
  Media: "Media"
};
class z {
  #k;
  #I;
  #n;
  #i = "dormant";
  #r = null;
  #e = null;
  #f;
  #t;
  #l;
  #w;
  #M;
  #y;
  #E;
  #P;
  #S;
  /** The tray only exists once asked for: at rest the pill is the icon and nothing else. */
  #T = !1;
  /** Set while a press on the pill turned into a drag, so the release does not also toggle it. */
  #A = !1;
  /**
   * Inspect and X-ray are independent switches the user can combine, even though X-ray always needs
   * the same hover engine Inspect turns on. These track which of the two the user actually pressed,
   * so turning one off only disarms the engine when the other isn't still asking for it — and the
   * two buttons never light up together just because the engine happens to be running for one of
   * them.
   */
  #c = !1;
  #g = !1;
  #h = null;
  #b = null;
  #a = null;
  #o = !1;
  #s = 0;
  #d = /* @__PURE__ */ new Set();
  #L = !1;
  /** Usage counts are fetched lazily per node — the manifest should not pay for them. */
  #v = /* @__PURE__ */ new Map();
  constructor(e) {
    this.#n = e, this.#I = n("div", { "data-peek-ui": "root" }), this.#k = this.#I.attachShadow({ mode: "open" }), this.#k.append(n("style", { text: D })), document.body.append(this.#I), this.#K(), this.#W();
  }
  // ------------------------------------------------------------------ chrome
  #K() {
    this.#f = n("div", { class: "peek-layer" }), this.#l = n(
      "button",
      {
        type: "button",
        class: "peek-badge",
        "aria-expanded": "false",
        "aria-label": "Peek content inspector",
        title: "Peek"
      },
      n("img", { class: "peek-mark", "data-variant": "idle", src: w.idle, alt: "", draggable: "false" }),
      n("img", { class: "peek-mark", "data-variant": "active", src: w.active, alt: "", draggable: "false" })
    ), this.#y = n("span", { class: "peek-status", hidden: "" }), this.#E = n("button", {
      type: "button",
      "data-action": "toggle",
      "aria-pressed": "false",
      text: "Inspect"
    }), this.#P = n("button", {
      type: "button",
      "data-action": "xray",
      "aria-pressed": "false",
      text: "X-ray"
    }), this.#S = n("button", { type: "button", "data-action": "stop", hidden: "", text: "Stop" }), this.#M = n(
      "div",
      { class: "peek-tray-inner" },
      this.#y,
      this.#E,
      this.#P,
      this.#S
    ), this.#w = n("div", { class: "peek-tray", "aria-hidden": "true" }, this.#M), this.#t = n(
      "div",
      {
        class: "peek-pill",
        "data-state": "dormant",
        "data-active": "false",
        "data-open": "false",
        "data-side": "right",
        role: "group",
        "aria-label": "Peek content inspector"
      },
      this.#l,
      this.#w
    ), this.#l.addEventListener("click", (e) => {
      if (e.stopPropagation(), this.#A) {
        this.#A = !1;
        return;
      }
      this.#N(!this.#T);
    }), this.#E.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggle();
    }), this.#P.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggleXray();
    }), this.#S.addEventListener("click", (e) => {
      e.stopPropagation(), this.disarm();
    }), this.#_(this.#t), this.#k.append(this.#f, this.#t);
  }
  // ------------------------------------------------------------------ tray
  /**
   * The tray animates on an explicit pixel width because `auto` is not an animatable value. It is
   * measured from the laid-out content rather than guessed, so a longer status line still unfurls
   * to exactly the width it needs.
   */
  #N(e) {
    this.#T = e, this.#t.dataset.open = String(e), this.#l.setAttribute("aria-expanded", String(e)), this.#w.setAttribute("aria-hidden", String(!e)), this.#U();
  }
  #U() {
    this.#w.style.width = this.#T ? `${this.#M.offsetWidth}px` : "0px";
  }
  /**
   * Keep the pill anchored to whichever edge it was dropped nearest, and unfurl the tray away from
   * that edge. Anchoring by `right` on the right-hand side is what keeps the icon still while the
   * tray grows: anchored by `left`, opening the tray would push the icon sideways instead.
   */
  #F() {
    const e = this.#t.getBoundingClientRect(), t = e.left + e.width / 2 > window.innerWidth / 2;
    this.#t.dataset.side = t ? "right" : "left", t ? (this.#t.style.right = `${Math.round(window.innerWidth - e.right)}px`, this.#t.style.left = "auto") : (this.#t.style.left = `${Math.round(e.left)}px`, this.#t.style.right = "auto"), this.#t.style.top = `${Math.round(e.top)}px`, this.#t.style.bottom = "auto";
  }
  /**
   * The pill will end up on top of somebody's chat widget. It has to be movable.
   *
   * The icon is now both the drag handle and the tray toggle, so a press only becomes a drag once
   * the pointer has travelled past `DRAG_SLOP`. Below that it stays a click and the tray toggles.
   */
  #_(e) {
    let t = !1, a = !1, i = 0, r = 0, s = 0, d = 0;
    e.addEventListener("pointerdown", (p) => {
      const h = p.target;
      if (h.closest?.(".peek-tray"))
        return;
      t = !0, a = !1, this.#A = !1, i = p.clientX, r = p.clientY;
      const c = e.getBoundingClientRect();
      s = p.clientX - c.left, d = p.clientY - c.top, h.setPointerCapture(p.pointerId);
    }), e.addEventListener("pointermove", (p) => {
      if (!t)
        return;
      if (!a) {
        if (Math.hypot(p.clientX - i, p.clientY - r) < B)
          return;
        if (a = !0, this.#A = !0, e.dataset.dragging = "true", this.#T) {
          this.#N(!1);
          const u = e.getBoundingClientRect();
          s = Math.min(p.clientX - u.left, this.#l.offsetWidth);
        }
      }
      const h = Math.min(Math.max(0, p.clientX - s), window.innerWidth - e.offsetWidth), c = Math.min(Math.max(0, p.clientY - d), window.innerHeight - e.offsetHeight);
      e.style.left = `${h}px`, e.style.top = `${c}px`, e.style.right = "auto", e.style.bottom = "auto";
    });
    const l = (p) => {
      t && (t = !1, p.target.releasePointerCapture?.(p.pointerId), a && (a = !1, delete e.dataset.dragging, this.#F()));
    };
    e.addEventListener("pointerup", l), e.addEventListener("pointercancel", l);
  }
  #W() {
    document.addEventListener("keydown", (a) => this.#G(a), !0), document.addEventListener("mousemove", (a) => this.#j(a), { passive: !0 }), document.addEventListener("click", (a) => this.#q(a), !0);
    let e = 0;
    const t = () => {
      cancelAnimationFrame(e), e = requestAnimationFrame(() => this.#Y());
    };
    window.addEventListener("resize", t, { passive: !0 }), window.addEventListener("scroll", t, { passive: !0, capture: !0 });
  }
  // ------------------------------------------------------------------ state
  get #m() {
    return this.#i === "armed" || this.#i === "locked" || this.#i === "xray" || this.#i === "degraded";
  }
  #p(e) {
    this.#i = e, this.#t.dataset.state = e;
    const t = {
      dormant: "Peek",
      loading: "Reading page…",
      armed: "Hover anything",
      locked: "Pinned",
      xray: "X-ray on",
      degraded: "Partial coverage",
      error: "Peek unavailable"
    }, a = this.#m;
    this.#t.dataset.active = String(a), this.#l.title = t[e], this.#l.setAttribute("aria-label", `Peek content inspector — ${t[e]}`), this.#y.textContent = t[e], this.#y.hidden = e === "dormant" || e === "armed" || e === "xray" || e === "degraded", this.#C(), this.#S.hidden = !a, e === "loading" || e === "degraded" || e === "error" ? this.#N(!0) : this.#U();
  }
  /** Reflects Inspect and X-ray's own on/off state onto their buttons — independent of each other. */
  #C() {
    this.#E.setAttribute("aria-pressed", String(this.#c)), this.#P.setAttribute("aria-pressed", String(this.#g));
  }
  async toggle() {
    if (this.#c) {
      this.#c = !1, this.#g ? this.#C() : this.disarm();
      return;
    }
    if (this.#m) {
      this.#c = !0, this.#C();
      return;
    }
    await this.arm(), this.#i !== "error" && (this.#c = !0, this.#C());
  }
  async arm() {
    if (!this.#r && (this.#p("loading"), !await this.#H())) {
      this.#p("error"), this.#de("Peek could not read this page. It may not be an Umbraco-routed document.");
      return;
    }
    this.#e = L(this.#r), this.#p(this.#e.coverage < f ? "degraded" : "armed"), this.#x();
  }
  disarm() {
    this.#o = !1, this.#a = null, this.#c = !1, this.#g = !1, this.#p("dormant"), x(this.#f), this.#$(), this.#D();
  }
  async toggleXray() {
    if (this.#g) {
      this.#g = !1, this.#D(), this.#c ? this.#p(this.#e && this.#e.coverage < f ? "degraded" : "armed") : this.disarm(), this.#x();
      return;
    }
    !this.#m && (await this.arm(), this.#i === "error") || (this.#g = !0, this.#p("xray"), this.#x(), this.#B());
  }
  // ------------------------------------------------------------------ data
  async #H() {
    if (!this.#n.pageKey)
      return !1;
    const e = new URL(this.#n.manifestUrl, window.location.origin);
    e.searchParams.set("key", this.#n.pageKey), this.#n.culture && e.searchParams.set("culture", this.#n.culture), this.#n.segment && e.searchParams.set("segment", this.#n.segment), this.#n.preview && e.searchParams.set("preview", "true");
    try {
      const t = await fetch(e, { credentials: "same-origin", headers: { accept: "application/json" } });
      return t.ok ? (this.#r = await t.json(), !0) : !1;
    } catch {
      return !1;
    }
  }
  async #V(e) {
    if (this.#v.has(e))
      return;
    this.#v.set(e, "pending");
    const t = new URL(this.#n.usageUrl, window.location.origin);
    t.searchParams.set("key", e);
    try {
      const a = await fetch(t, { credentials: "same-origin", headers: { accept: "application/json" } });
      this.#v.set(
        e,
        a.ok ? await a.json() : "error"
      );
    } catch {
      this.#v.set(e, "error");
    }
    this.#a && this.#u(this.#a);
  }
  #R(e) {
    return this.#r?.nodes.find((t) => t.key === e);
  }
  // ------------------------------------------------------------------ highlights
  #x() {
    if (x(this.#f), !!this.#e) {
      for (const e of this.#e.regions) {
        const t = e.entries[0];
        this.#d.has(t.sourceKind) || this.#f.append(this.#X(e));
      }
      if (this.#i === "xray" && this.#L)
        for (const e of this.#e.unattributed) {
          const t = e.getBoundingClientRect();
          t.width === 0 && t.height === 0 || this.#f.append(
            n("div", {
              class: "peek-highlight",
              "data-kind": "Unattributed",
              style: y(t)
            })
          );
        }
    }
  }
  #X(e) {
    const t = e.element.getBoundingClientRect(), a = e.entries[0], i = n("div", {
      class: "peek-highlight",
      "data-kind": a.sourceKind,
      "data-entry": a.id,
      style: y(t)
    });
    return e.entries.length > 1 && i.append(n("span", { class: "peek-ambiguous-badge", text: "?", title: `${e.entries.length} possible sources` })), i;
  }
  #Y() {
    this.#m && (this.#x(), this.#a && this.#z(this.#a));
  }
  // ------------------------------------------------------------------ interaction
  #j(e) {
    if (this.#i !== "armed" && this.#i !== "degraded" && this.#i !== "xray" || this.#o || !this.#e)
      return;
    const t = this.#O(e.clientX, e.clientY);
    t !== this.#a && (this.#a = t, this.#s = 0, t ? this.#u(t) : this.#$());
  }
  #q(e) {
    if (!this.#m)
      return;
    const t = e.composedPath();
    if (t.includes(this.#t) || this.#h && t.includes(this.#h) || this.#b && t.includes(this.#b))
      return;
    const a = this.#O(e.clientX, e.clientY);
    a && (e.preventDefault(), e.stopPropagation(), this.#o = !0, this.#a = a, this.#s = 0, this.#p("locked"), this.#u(a));
  }
  #G(e) {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyU") {
      e.preventDefault(), this.toggle();
      return;
    }
    if (!this.#m)
      return;
    if (e.key === "Escape") {
      e.preventDefault(), this.#o ? (this.#o = !1, this.#p(this.#b ? "xray" : "armed"), this.#$()) : this.disarm();
      return;
    }
    if (!this.#o || !this.#a)
      return;
    const t = this.#a.entries;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (t.length < 2)
          return;
        e.preventDefault();
        const a = e.key === "ArrowDown" ? 1 : -1;
        this.#s = (this.#s + a + t.length) % t.length, this.#u(this.#a);
        return;
      }
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault(), this.#J(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      case "Enter": {
        e.preventDefault();
        const a = t[this.#s]?.editUrl;
        a && window.open(a, "_blank", "noopener");
        return;
      }
    }
  }
  /** Walk to the next or previous region in document order, so the page can be traversed. */
  #J(e) {
    if (!this.#e || !this.#a)
      return;
    const t = this.#e.regions.filter((r) => !this.#d.has(r.entries[0].sourceKind)), a = t.indexOf(this.#a);
    if (a < 0)
      return;
    const i = t[(a + e + t.length) % t.length];
    this.#a = i, this.#s = 0, i.element.scrollIntoView({ block: "center", behavior: "smooth" }), this.#u(i);
  }
  #O(e, t) {
    if (!this.#e)
      return null;
    let a = null, i = Number.POSITIVE_INFINITY;
    for (const r of this.#e.regions) {
      if (this.#d.has(r.entries[0].sourceKind))
        continue;
      const s = r.element.getBoundingClientRect();
      if (e < s.left || e > s.right || t < s.top || t > s.bottom)
        continue;
      const d = s.width * s.height;
      d < i && (a = r, i = d);
    }
    return a;
  }
  // ------------------------------------------------------------------ card
  #$() {
    this.#h?.remove(), this.#h = null;
  }
  #u(e) {
    this.#$();
    const t = e.entries[this.#s] ?? e.entries[0], a = this.#R(t.nodeKey), i = n("div", {
      class: "peek-card",
      "data-kind": t.sourceKind,
      "data-pinned": String(this.#o),
      "data-peek-ui": "card"
    });
    i.append(n("div", { class: "peek-card-accent" }));
    const r = n("div", { class: "peek-card-body" });
    if (r.append(this.#Q(t, a)), r.append(this.#Z(t, a)), e.entries.length > 1 && r.append(this.#ee(e)), r.append(
      n("p", {
        class: "peek-value",
        "data-empty": String(!t.valuePreview),
        text: t.valuePreview || "(empty)"
      })
    ), r.append(this.#te(t, a)), r.append(this.#ae(t, a)), this.#o) {
      const s = n("div", { class: "peek-keyhint" });
      s.innerHTML = "<kbd>←</kbd><kbd>→</kbd> next region · <kbd>↑</kbd><kbd>↓</kbd> candidates · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close", r.append(s);
    }
    i.append(r), this.#h = i, this.#k.append(i), this.#z(e), t.sourceKind === "Shared" && a && this.#V(a.key);
  }
  #Q(e, t) {
    const a = n("div", { class: "peek-tags" });
    if (a.append(
      n("span", {
        class: "peek-tag",
        "data-tone": U[e.sourceKind] ?? "quiet",
        text: O[e.sourceKind] ?? e.sourceKind
      })
    ), e.culture ? a.append(n("span", { class: "peek-tag", "data-tone": "quiet", text: e.culture })) : e.invariantAcrossCultures && a.append(
      n("span", {
        class: "peek-tag",
        "data-tone": "quiet",
        title: "This property does not vary by culture — editing it changes every language.",
        text: "all languages"
      })
    ), t?.publishState === "DraftChangesPending" ? a.append(
      n("span", {
        class: "peek-tag",
        "data-tone": "warn",
        title: `Published, with unpublished changes. This is usually the answer to "why isn't my change showing".`,
        text: "draft pending"
      })
    ) : t?.publishState === "Unpublished" && a.append(n("span", { class: "peek-tag", "data-tone": "warn", text: "unpublished" })), e.sourceKind === "Shared" && t) {
      const i = this.#v.get(t.key), r = i === "pending" || i === void 0 ? "checking usage…" : i === "error" ? "usage unknown" : `used on ${i.length}`;
      a.append(
        n("span", {
          class: "peek-tag",
          "data-tone": "shared",
          title: "Editing this changes every place it is used, not just this page.",
          text: r
        })
      );
    }
    return a;
  }
  #Z(e, t) {
    const a = n("div", { class: "peek-breadcrumb" }), i = [this.#r?.page?.name ?? t?.name ?? "Page", ...e.breadcrumb.map((r) => r.label)];
    return i.forEach((r, s) => {
      s > 0 && a.append(n("span", { class: "peek-crumb-sep", text: "›" })), a.append(
        n("span", {
          class: s === i.length - 1 ? "peek-crumb-last" : "",
          text: r
        })
      );
    }), a;
  }
  #ee(e) {
    const t = n("ul", { class: "peek-candidates", role: "listbox" });
    e.entries.forEach((i, r) => {
      const s = this.#R(i.nodeKey), d = n("li", {
        role: "option",
        "aria-selected": String(r === this.#s),
        text: `${s?.contentTypeAlias ?? "?"}.${i.propertyAlias}`
      });
      d.addEventListener("click", (l) => {
        l.stopPropagation(), this.#s = r, this.#u(e);
      }), t.append(d);
    });
    const a = n("div", {
      class: "peek-row-note",
      "data-tone": "warn",
      text: `${e.entries.length} possible sources — Peek will not guess`
    });
    return n("div", {}, a, t);
  }
  #te(e, t) {
    const a = n("dl", { class: "peek-meta" }), i = [
      ["Node", t?.name ?? "—"],
      ["Doc type", t?.contentTypeAlias ?? "—"],
      ["Property", e.propertyAlias],
      ["Editor", e.editorAlias ?? "—"],
      ["Edited", t?.updateDate ? `${N(t.updateDate)} (${R(t.updateDate)})` : "—"],
      ["By", t?.lastEditedBy ?? "—"]
    ];
    for (const [r, s] of i)
      a.append(n("dt", { text: r }), n("dd", { text: s }));
    return a;
  }
  #ae(e, t) {
    const a = n("div", { class: "peek-actions" });
    e.editUrl && a.append(
      n("a", {
        class: "peek-primary",
        href: e.editUrl,
        target: "_blank",
        rel: "noopener",
        text: "Edit this field"
      })
    );
    const i = t?.isElement ? `@item.Content.Value<string>("${e.propertyAlias}")` : `@Model.Value<string>("${e.propertyAlias}")`, r = [
      ["Alias", e.propertyAlias],
      ["GUID", e.nodeKey],
      ["Razor", i],
      ["Bug report", this.#ie(e, t)]
    ];
    for (const [s, d] of r) {
      const l = n("button", { type: "button", text: s });
      l.addEventListener("click", async (p) => {
        p.stopPropagation();
        const h = await M(d);
        l.textContent = h ? "Copied" : "Copy failed", setTimeout(() => {
          l.textContent = s;
        }, 1200);
      }), a.append(l);
    }
    return a;
  }
  #ie(e, t) {
    return [
      `URL: ${window.location.href}`,
      `Node: ${t?.name ?? "—"} (${e.nodeKey})`,
      `Doc type: ${t?.contentTypeAlias ?? "—"}`,
      `Property: ${e.propertyAlias}`,
      `Culture: ${e.culture ?? "invariant"}`,
      `Viewport: ${window.innerWidth}×${window.innerHeight}`,
      `Backoffice: ${t?.editUrl ?? "—"}`
    ].join(`
`);
  }
  #z(e) {
    if (!this.#h)
      return;
    const t = e.element.getBoundingClientRect(), a = this.#h, i = a.offsetWidth || 340, r = a.offsetHeight || 220;
    let s = t.left, d = t.bottom + 8;
    s + i > window.innerWidth - 12 && (s = window.innerWidth - i - 12), d + r > window.innerHeight - 12 && (d = Math.max(12, t.top - r - 8)), a.style.left = `${Math.max(12, s)}px`, a.style.top = `${d}px`;
  }
  // ------------------------------------------------------------------ x-ray panel
  #D() {
    this.#b?.remove(), this.#b = null;
  }
  #B() {
    if (this.#D(), !this.#r || !this.#e)
      return;
    const e = n("div", { class: "peek-panel", "data-peek-ui": "panel" });
    e.append(this.#re());
    for (const t of this.#r.warnings)
      e.append(n("div", { class: "peek-notice", text: t }));
    e.append(this.#se()), e.append(
      n("div", {
        class: "peek-panel-foot",
        text: `${this.#r.entries.length} values considered · built in ${this.#r.buildDurationMs} ms`
      })
    ), this.#b = e, this.#k.append(e);
  }
  #re() {
    const e = this.#r, t = this.#e, a = Math.round(t.coverage * 100), i = n("div", { class: "peek-panel-head" });
    i.append(
      n(
        "div",
        { class: "peek-panel-title" },
        n("span", { text: e.page?.name ?? "This page" }),
        n("small", { text: e.page?.contentTypeAlias ?? "" })
      )
    );
    const r = n("div", { class: "peek-coverage-bar", "data-low": String(t.coverage < f) });
    return r.append(n("i", { style: `width:${a}%` })), i.append(
      n(
        "div",
        { class: "peek-coverage" },
        r,
        n(
          "div",
          { class: "peek-coverage-label" },
          n("span", { text: `${a}% of visible text attributed` }),
          n("span", { text: `${t.unattributed.length} unattributed` })
        )
      )
    ), i.append(this.#ne()), i;
  }
  #ne() {
    const e = n("div", { class: "peek-chips" }), t = [
      ["OwnedProperty", "owned", "This page"],
      ["Block", "block", "Blocks"],
      ["Shared", "shared", "Shared"],
      ["Media", "media", "Media"]
    ];
    for (const [i, r, s] of t) {
      const d = n(
        "button",
        {
          class: "peek-chip",
          type: "button",
          "data-tone": r,
          "aria-pressed": String(!this.#d.has(i))
        },
        n("i", {}),
        document.createTextNode(s)
      );
      d.addEventListener("click", () => {
        this.#d.has(i) ? this.#d.delete(i) : this.#d.add(i), this.#x(), this.#B();
      }), e.append(d);
    }
    const a = n(
      "button",
      {
        class: "peek-chip",
        type: "button",
        "data-tone": "unattributed",
        "aria-pressed": String(this.#L),
        title: "Text Peek could not trace back to a content property."
      },
      n("i", {}),
      document.createTextNode("Unattributed")
    );
    return a.addEventListener("click", () => {
      this.#L = !this.#L, this.#x(), this.#B();
    }), e.append(a), e;
  }
  #se() {
    const e = n("div", { class: "peek-panel-list" }), t = this.#r, a = this.#e, i = t.entries.filter(
      (s) => !this.#d.has(s.sourceKind) && s.state !== "Empty"
    );
    if (i.length === 0)
      return e.append(n("div", { class: "peek-empty", text: "Nothing to show with these filters." })), e;
    const r = [...i].sort((s, d) => {
      const l = (p) => a.matchedEntryIds.has(p.id) ? 0 : p.state === "Unmatchable" ? 2 : 1;
      return l(s) - l(d);
    });
    for (const s of r)
      e.append(this.#oe(s, a.matchedEntryIds.has(s.id)));
    return e;
  }
  #oe(e, t) {
    const a = this.#R(e.nodeKey), i = t ? e.valuePreview ?? "" : e.state === "Unmatchable" ? `has a value Peek can't search for (${e.unmatchable})` : "read, not rendered", r = n(
      "button",
      {
        class: "peek-row",
        type: "button",
        "data-kind": e.sourceKind,
        "data-rendered": String(t)
      },
      n("i", {}),
      n(
        "div",
        { class: "peek-row-main" },
        n("div", { class: "peek-row-alias", text: `${a?.contentTypeAlias ?? "?"}.${e.propertyAlias}` }),
        n("div", {
          class: "peek-row-note",
          "data-tone": t ? "quiet" : "warn",
          text: i
        })
      )
    );
    return r.addEventListener("click", () => {
      const s = this.#e?.regions.find(
        (d) => d.entries.some((l) => l.id === e.id)
      );
      s ? (this.#o = !0, this.#a = s, this.#s = s.entries.findIndex((d) => d.id === e.id), s.element.scrollIntoView({ block: "center", behavior: "smooth" }), this.#u(s)) : e.editUrl && window.open(e.editUrl, "_blank", "noopener");
    }), r;
  }
  #de(e) {
    const t = n("div", { class: "peek-notice", "data-peek-ui": "notice", text: e });
    t.style.position = "absolute", t.style.right = "20px", t.style.bottom = "74px", t.style.maxWidth = "320px", t.style.pointerEvents = "auto", this.#k.append(t), setTimeout(() => t.remove(), 6e3);
  }
}
function y(o) {
  return `left:${o.left}px;top:${o.top}px;width:${o.width}px;height:${o.height}px`;
}
const K = "peek-bootstrap", E = 1;
function F() {
  const o = document.getElementById(K);
  if (!o?.textContent)
    return null;
  try {
    const e = JSON.parse(o.textContent);
    return e.version !== E ? (console.warn(
      `[Peek] bootstrap version ${e.version} is not supported by this overlay (expected ${E}). Hard-refresh to pick up the current build.`
    ), null) : e;
  } catch (e) {
    return console.warn("[Peek] could not parse the bootstrap payload.", e), null;
  }
}
function P() {
  const o = F();
  if (!o)
    return;
  const e = new z(o);
  new URLSearchParams(window.location.search).get("peek") !== null && e.arm();
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", P, { once: !0 }) : P();
//# sourceMappingURL=peek.overlay.js.map
