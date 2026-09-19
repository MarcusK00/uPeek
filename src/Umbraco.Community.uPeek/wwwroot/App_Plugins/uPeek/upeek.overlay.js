function S(s) {
  if (!s)
    return "";
  let e = "", t = !1;
  for (const i of s) {
    if (/\s/.test(i) || i === " " || i === "​") {
      t = e.length > 0;
      continue;
    }
    t && (e += " ", t = !1), e += i;
  }
  return e;
}
const C = /* @__PURE__ */ new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "HEAD",
  "TITLE",
  "META",
  "LINK"
]);
function A(s) {
  return C.has(s.tagName);
}
function L(s) {
  const e = /* @__PURE__ */ new Map(), t = [];
  for (const p of s.entries)
    for (const h of p.matchTexts) {
      const c = h.toLowerCase(), u = e.get(c);
      u ? u.push(p) : e.set(c, [p]), t.push({ entry: p, fragment: c });
    }
  t.sort((p, h) => h.fragment.length - p.fragment.length);
  const i = /* @__PURE__ */ new Map(), n = [], a = /* @__PURE__ */ new Set(), o = s.matching.minimumValueLength;
  let d = 0, l = 0;
  for (const p of $(document.body, o)) {
    d++;
    const h = S(p.text).toLowerCase();
    let c = e.get(h), u = "exact";
    if (!c) {
      const f = t.find(
        (m) => h.includes(m.fragment) || m.fragment.includes(h)
      );
      f && (c = [f.entry], u = "partial");
    }
    if (!c || c.length === 0) {
      n.push(p.element);
      continue;
    }
    l++, b(i, p.element, c, u);
    for (const f of c)
      a.add(f.id);
  }
  return I(s, i, a), M(s, i, a, o), {
    regions: [...i.values()],
    unattributed: n,
    coverage: d === 0 ? 0 : l / d,
    matchedEntryIds: a
  };
}
function b(s, e, t, i) {
  const n = s.get(e);
  if (!n) {
    s.set(e, { element: e, entries: [...t], confidence: i });
    return;
  }
  for (const a of t)
    n.entries.some((o) => o.id === a.id) || n.entries.push(a);
}
function I(s, e, t) {
  const i = s.entries.filter((a) => a.mediaUrl);
  if (i.length === 0)
    return;
  const n = document.querySelectorAll('img, picture source, video, [style*="url("]');
  for (const a of n) {
    const o = [
      a.getAttribute("src"),
      a.getAttribute("srcset"),
      a.getAttribute("poster"),
      a.getAttribute("style")
    ].filter(Boolean).join(" ").toLowerCase();
    if (o) {
      for (const d of i)
        if (o.includes(d.mediaUrl.toLowerCase())) {
          const l = a.tagName === "SOURCE" ? a.parentElement ?? a : a;
          b(e, l, [d], "media"), t.add(d.id);
        }
    }
  }
}
const w = ["href", "src", "srcset", "action", "poster", "content", "value"];
function M(s, e, t, i) {
  const n = s.entries.filter(
    (o) => !t.has(o.id) && o.matchTexts.length > 0
  );
  if (n.length === 0)
    return;
  const a = w.map((o) => `[${o}]`).join(",");
  for (const o of document.querySelectorAll(a)) {
    if (o.closest("[data-peek-ui]"))
      continue;
    const d = w.map((l) => o.getAttribute(l)).filter((l) => !!l && l.length >= i).join(" ").toLowerCase();
    if (d)
      for (const l of n)
        l.matchTexts.some((p) => d.includes(p.toLowerCase())) && (b(e, o, [l], "attribute"), t.add(l.id));
  }
}
function $(s, e) {
  const t = [];
  if (!s)
    return t;
  const i = document.createTreeWalker(s, NodeFilter.SHOW_TEXT, {
    acceptNode(a) {
      const o = a.parentElement;
      return !o || A(o) || o.closest("[data-peek-ui]") ? NodeFilter.FILTER_REJECT : S(a.nodeValue).length >= e ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let n = i.nextNode();
  for (; n; ) {
    const a = n.parentElement;
    a && t.push({ element: a, text: n.nodeValue ?? "" }), n = i.nextNode();
  }
  return t;
}
function r(s, e = {}, ...t) {
  const i = document.createElement(s);
  for (const [n, a] of Object.entries(e))
    a != null && (n === "class" ? i.className = a : n === "text" ? i.textContent = a : i.setAttribute(n, a));
  for (const n of t)
    n != null && i.append(n);
  return i;
}
function g(s) {
  for (; s.firstChild; )
    s.firstChild.remove();
}
async function R(s) {
  try {
    return await navigator.clipboard.writeText(s), !0;
  } catch {
    return !1;
  }
}
function z(s) {
  if (!s)
    return "—";
  const e = new Date(s);
  if (Number.isNaN(e.getTime()))
    return "—";
  const t = (i) => String(i).padStart(2, "0");
  return `${t(e.getDate())}-${t(e.getMonth() + 1)}-${e.getFullYear()} ${t(e.getHours())}:${t(e.getMinutes())}`;
}
function N(s) {
  if (!s)
    return "";
  const e = new Date(s);
  if (Number.isNaN(e.getTime()))
    return "";
  const t = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }), i = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"]
  ];
  let n = (e.getTime() - Date.now()) / 1e3;
  for (const [a, o] of i) {
    if (Math.abs(n) < a)
      return t.format(Math.round(n), o);
    n /= a;
  }
  return "";
}
const B = (
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

  /* The pill is a fixed white chip in both schemes. It carries the uPeek mark, which is drawn for a
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
   means "uPeek cannot say". A 1px dashed hairline on transparent was so faint that turning the
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

   At rest the pill is the uPeek mark and nothing else. Pressing it unfurls a tray of actions out of
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
   rest. Same timing as the tray, so opening Advanced feels like the same mechanism as opening
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
.peek-pill[data-state="advanced"]  { border-color: var(--peek-owned); }
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
   and Advanced stay where they have always been, next to the mark; only Stop is pushed out to the far
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
.peek-tray button[data-action="advanced"][aria-pressed="true"] { background: var(--peek-owned-soft); color: var(--peek-owned); }
.peek-tray button[data-action="stop"] { color: var(--peek-stop); }
.peek-tray button[hidden] { display: none; }

/* While a mode runs, both mode buttons stop taking presses — only Stop ends it. The two say so
   differently, because they mean different things:

   The mode that is NOT running is unavailable, and dims to say so.

   The mode that IS running is the answer to "what is uPeek doing right now", so it must stay fully
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

/* ---------------------------------------------------------------- card

   The card is the pill's other half, not a separate window: hover a region, pin it, and it is the
   same tool talking. So it takes the pill's palette rather than the page's scheme — a fixed white
   ground in both, and the kind scale pinned to its light-ground values, since the dark-mode kind
   colours are tuned to be legible on a dark surface and wash out on white. The card is the only
   thing that spends --peek-surface/-border/-text, so redeclaring them here retunes it whole. */

.peek-card {
  --peek-surface: var(--peek-pill-surface);
  --peek-surface-2: var(--peek-pill-surface-2);
  --peek-border: var(--peek-pill-border);
  --peek-text: var(--peek-pill-text);
  --peek-text-dim: var(--peek-pill-text-dim);
  --peek-owned: var(--peek-pill-owned);
  --peek-block: var(--peek-pill-block);
  --peek-shared: var(--peek-pill-shared);
  --peek-media: var(--peek-pill-media);

  position: absolute;
  width: 340px;
  max-width: calc(100vw - 32px);
  background: var(--peek-surface);
  /* Explicit, because color is inherited from :host as a computed value — the dark-mode
     --peek-text is already resolved by the time it lands here, and the override above would
     never be read. */
  color: var(--peek-text);
  border: 1px solid var(--peek-border);
  border-radius: var(--peek-radius);
  box-shadow: var(--peek-shadow);
  font-size: 12.5px;
  line-height: 1.45;
  overflow: hidden;
  pointer-events: none;
}

.peek-card[data-pinned="true"] { pointer-events: auto; }

.peek-card .peek-card-accent { height: 6px; }
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

/* Tags left, key hint hard right, on one line. The hint never wraps and never shrinks, so a long
   run of tags wraps under itself rather than crushing it. */
.peek-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

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
  flex: none;
  padding-top: 2px;
  font-size: 10.5px;
  white-space: nowrap;
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

/* ---------------------------------------------------------------- advanced panel

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
`
), x = 0.6, U = 4, O = 240;
function v(s) {
  return new URL(s, import.meta.url).href;
}
const y = {
  idle: v("icons/uPeekIconUnactive.png"),
  active: v("icons/uPeekIconActive.png")
}, D = {
  OwnedProperty: "owned",
  Block: "block",
  Shared: "shared",
  Media: "media"
}, F = {
  OwnedProperty: "This page",
  Block: "Block",
  Shared: "Shared",
  Media: "Media"
};
class k {
  #g;
  #N;
  #n;
  #r = "dormant";
  #i = null;
  #t = null;
  #k;
  #e;
  #B;
  #d;
  #b;
  #m;
  #C;
  #w;
  #x;
  #A;
  /** The tray only exists once asked for: at rest the pill is the icon and nothing else. */
  #v = !1;
  /** Set while a press on the pill turned into a drag, so the release does not also toggle it. */
  #L = !1;
  /**
   * Inspect and Advanced are mutually exclusive: at most one of these is ever true. Each one's button
   * is disabled while the other mode is running (see #syncButtons), so switching modes means
   * stopping the current one first rather than the two running together.
   */
  #U = !1;
  #y = !1;
  #l = null;
  #a = null;
  /**
   * Where the pill sat before the panel unfurled underneath it. Expanding has to pull the pill up
   * the page so the panel fits on screen; collapsing puts it back exactly where the user left it,
   * unless they moved it in the meantime — a drag clears this.
   */
  #T = null;
  /**
   * The size a fold in flight is heading for. Any fit that lands mid-fold — a scroll, a resize, the
   * panel's own post-render fit — has to clamp against where the pill is going, not the half-way
   * size it happens to be showing.
   */
  #I = null;
  /**
   * The panel a fold-out is closing over. It is out of #panel the moment the fold starts — as far
   * as the rest of the overlay is concerned the panel is already shut — but it stays in the DOM,
   * clipped by the shrinking pill, until the fold lands. #endFold is what actually removes it.
   */
  #O = null;
  #M = 0;
  #o = null;
  #p = !1;
  #f = 0;
  /**
   * Which source kinds the user has asked to see. Nothing is selected to begin with, and nothing
   * selected means nothing shown: Advanced opens on a bare page and every outline is something the
   * user asked for by name. Opening straight into a page covered in boxes answers a question
   * nobody asked yet, and it is the filters that make it a tool rather than a light switch.
   */
  #h = /* @__PURE__ */ new Set();
  #c = !1;
  /**
   * Only what has been asked for — see #kindFilter.
   *
   * The chips belong to Advanced mode, and Inspect has no chip UI to turn any of them on with, so
   * outside Advanced there is nothing to filter by and everything shows. Sharing the highlight
   * layer between the two modes is what makes this need saying out loud: an empty filter set means
   * "nothing selected yet" in Advanced and "not applicable" in Inspect.
   */
  #D(e) {
    return this.#y ? this.#h.has(e) : !0;
  }
  /** Usage counts are fetched lazily per node — the manifest should not pay for them. */
  #E = /* @__PURE__ */ new Map();
  constructor(e) {
    this.#n = e, this.#N = r("div", { "data-peek-ui": "root" }), this.#g = this.#N.attachShadow({ mode: "open" }), this.#g.append(r("style", { text: B })), document.body.append(this.#N), this.#J(), this.#Z(), this.#_();
  }
  // ------------------------------------------------------------------ chrome
  #J() {
    this.#k = r("div", { class: "peek-layer" }), this.#d = r(
      "button",
      {
        type: "button",
        class: "peek-badge",
        "aria-expanded": "false",
        "aria-label": "uPeek content inspector",
        title: "uPeek"
      },
      r("img", { class: "peek-mark", "data-variant": "idle", src: y.idle, alt: "", draggable: "false" }),
      r("img", { class: "peek-mark", "data-variant": "active", src: y.active, alt: "", draggable: "false" })
    ), this.#C = r("span", { class: "peek-status", hidden: "" }), this.#w = r("button", {
      type: "button",
      "data-action": "toggle",
      "aria-pressed": "false",
      text: "Inspect"
    }), this.#x = r("button", {
      type: "button",
      "data-action": "advanced",
      "aria-pressed": "false",
      text: "Advanced"
    }), this.#A = r("button", { type: "button", "data-action": "stop", hidden: "", text: "Stop" }), this.#m = r(
      "div",
      { class: "peek-tray-inner" },
      this.#C,
      this.#w,
      this.#x,
      this.#A
    ), this.#b = r("div", { class: "peek-tray", "aria-hidden": "true" }, this.#m), this.#B = r("div", { class: "peek-pill-row" }, this.#d, this.#b), this.#e = r(
      "div",
      {
        class: "peek-pill",
        "data-state": "dormant",
        "data-active": "false",
        "data-open": "false",
        "data-expanded": "false",
        role: "group",
        "aria-label": "uPeek content inspector"
      },
      this.#B
    ), this.#d.addEventListener("click", (e) => {
      if (e.stopPropagation(), this.#L) {
        this.#L = !1;
        return;
      }
      this.#s || this.#F(!this.#v);
    }), this.#w.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggle();
    }), this.#x.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggleAdvanced();
    }), this.#A.addEventListener("click", (e) => {
      e.stopPropagation(), this.disarm();
    }), this.#Q(this.#e), this.#g.append(this.#k, this.#e);
  }
  // ------------------------------------------------------------------ tray
  /**
   * The tray animates on an explicit pixel width because `auto` is not an animatable value. It is
   * measured from the laid-out content rather than guessed, so a longer status line still unfurls
   * to exactly the width it needs.
   */
  #F(e) {
    this.#v = e, this.#e.dataset.open = String(e), this.#d.setAttribute("aria-expanded", String(e)), this.#b.setAttribute("aria-hidden", String(!e)), this.#K();
  }
  /**
   * The pill's own border, in pixels — fixed by `.peek-pill`'s `border: 1px solid` and never
   * overridden by any state, including expanded. It never changes, so it is cheaper to name than to
   * remeasure every time #syncTrayWidth needs the pill's true target width.
   */
  static #W = 2;
  #K() {
    if (this.#a) {
      this.#b.style.width = "";
      return;
    }
    this.#b.style.width = this.#v ? `${this.#m.offsetWidth}px` : "0px";
    const e = this.#d.getBoundingClientRect().width, t = this.#v ? this.#m.offsetWidth : 0;
    this.#V(e + t + k.#W);
  }
  /**
   * Anchor the pill by its left edge, wherever it was dropped. The mark always leads the row (see
   * .peek-pill-row in styles.ts) and everything that unfurls — the tray, the panel underneath it —
   * grows out to its right, never its left, so the left edge is the one fixed point that has to
   * stay put while that happens.
   */
  #_() {
    const e = this.#e.getBoundingClientRect();
    this.#e.style.left = `${Math.round(e.left)}px`, this.#e.style.right = "auto", this.#e.style.top = `${Math.round(e.top)}px`, this.#e.style.bottom = "auto";
  }
  /**
   * Keep the whole pill — row plus whatever panel is unfurled under it — inside the viewport, on
   * both axes, every time something might have moved the edges out from under it: a window resize,
   * a page scroll, or the panel changing size as its content is refiltered.
   *
   * The panel grows downwards from a chip that usually sits near the bottom of the page, so on
   * expanding there is rarely room below it; anchoring by `top` and pulling that up is what keeps
   * the row and the panel one object, rather than the panel finding its own place on screen — the
   * detached card this replaced. The same clamp runs on `left` unconditionally, not only while a
   * panel is open: the mark always leads the row now (see .peek-pill-row in styles.ts) and nothing
   * unfurls to its left, so a narrowed viewport can just as easily leave the tray with no room to
   * its right.
   */
  #$() {
    const e = this.#I;
    this.#V(
      e?.width ?? this.#e.offsetWidth,
      e?.height ?? this.#e.offsetHeight
    );
  }
  /**
   * Animate the pill between two sizes.
   *
   * Neither an auto width nor a child that is only now appearing (or about to be removed) animates
   * on its own, which is why opening Advanced used to snap to full size and closing it used to blink
   * out. So the pill is pinned to the size it has, that pin is settled as the transition's starting
   * point, and only then is the target applied — with the pill clipping for the duration, so the
   * panel is wiped into view rather than jumping into it.
   */
  #Y(e, t) {
    this.#e.dataset.folding = "true", this.#e.style.width = `${Math.round(e.width)}px`, this.#e.style.height = `${Math.round(e.height)}px`, this.#e.offsetWidth, this.#e.style.width = `${Math.round(t.width)}px`, this.#e.style.height = `${Math.round(t.height)}px`, this.#I = t, this.#M = window.setTimeout(() => this.#H(), O);
  }
  /** End of a fold: drop the panel it was closing over, and hand sizing back to the content. */
  #H() {
    this.#M !== 0 && (clearTimeout(this.#M), this.#M = 0), this.#I && (this.#I = null, this.#O?.remove(), this.#O = null, delete this.#e.dataset.folding, this.#e.style.width = "", this.#e.style.height = "");
  }
  /**
   * The guts of #fitPill, taking the size as parameters rather than reading it off the pill. Both
   * callers that pass them are clamping for a size the pill does not have yet and is animating
   * towards: #setTrayOpen, before the tray's width transition starts, and #closePanel, before the
   * panel folds away. Clamping against the size it still has would put it in the wrong place and
   * then leave it there.
   */
  #V(e, t = this.#e.offsetHeight) {
    const i = this.#e.getBoundingClientRect(), n = Math.max(12, Math.min(i.top, window.innerHeight - t - 12)), a = Math.max(12, Math.min(i.left, window.innerWidth - e - 12));
    this.#e.style.top = `${Math.round(n)}px`, this.#e.style.bottom = "auto", this.#e.style.left = `${Math.round(a)}px`, this.#e.style.right = "auto";
  }
  /**
   * The pill will end up on top of somebody's chat widget. It has to be movable.
   *
   * The icon is now both the drag handle and the tray toggle, so a press only becomes a drag once
   * the pointer has travelled past `DRAG_SLOP`. Below that it stays a click and the tray toggles.
   */
  #Q(e) {
    let t = !1, i = !1, n = 0, a = 0, o = 0, d = 0;
    e.addEventListener("pointerdown", (p) => {
      const h = p.target;
      if (h.closest?.(".peek-panel") || h.closest?.("button, a") && !h.closest?.(".peek-badge"))
        return;
      t = !0, i = !1, this.#L = !1, n = p.clientX, a = p.clientY;
      const u = e.getBoundingClientRect();
      o = p.clientX - u.left, d = p.clientY - u.top, h.setPointerCapture(p.pointerId);
    }), e.addEventListener("pointermove", (p) => {
      if (!t)
        return;
      if (!i) {
        if (Math.hypot(p.clientX - n, p.clientY - a) < U)
          return;
        i = !0, this.#L = !0, e.dataset.dragging = "true", this.#T = null;
      }
      const h = Math.min(Math.max(0, p.clientX - o), window.innerWidth - e.offsetWidth), c = Math.min(Math.max(0, p.clientY - d), window.innerHeight - e.offsetHeight);
      e.style.left = `${h}px`, e.style.top = `${c}px`, e.style.right = "auto", e.style.bottom = "auto";
    });
    const l = (p) => {
      t && (t = !1, p.target.releasePointerCapture?.(p.pointerId), i && (i = !1, delete e.dataset.dragging, this.#_()));
    };
    e.addEventListener("pointerup", l), e.addEventListener("pointercancel", l);
  }
  #Z() {
    document.addEventListener("keydown", (i) => this.#oe(i), !0), document.addEventListener("mousemove", (i) => this.#ne(i), { passive: !0 }), document.addEventListener("click", (i) => this.#re(i), !0);
    let e = 0;
    const t = () => {
      cancelAnimationFrame(e), e = requestAnimationFrame(() => this.#ae());
    };
    window.addEventListener("resize", t, { passive: !0 }), window.addEventListener("scroll", t, { passive: !0, capture: !0 });
  }
  // ------------------------------------------------------------------ state
  get #s() {
    return this.#r === "armed" || this.#r === "locked" || this.#r === "advanced" || this.#r === "degraded";
  }
  #u(e) {
    this.#r = e, this.#e.dataset.state = e;
    const t = {
      dormant: "uPeek",
      loading: "Reading page…",
      armed: "Hover anything",
      locked: "Pinned",
      advanced: "Advanced on",
      degraded: "Partial coverage",
      error: "uPeek unavailable"
    }, i = this.#s;
    this.#e.dataset.active = String(i), this.#d.title = t[e], this.#d.setAttribute("aria-label", `uPeek content inspector — ${t[e]}`), this.#C.textContent = t[e], this.#C.hidden = e === "dormant" || e === "armed" || e === "advanced" || e === "degraded", this.#q(), this.#A.hidden = !i, e === "loading" || e === "degraded" || e === "error" ? this.#F(!0) : this.#K();
  }
  /**
   * Reflects Inspect and Advanced's own on/off state onto their buttons, and disables both of them
   * once either is running. Mutually exclusive modes have to look that way, not just behave that
   * way; and Stop is the only thing allowed to end a running mode now (see #stopButton), so the
   * mode buttons themselves have nothing left to do once one of them is on — pressing the active
   * one again no longer stops it.
   */
  #q() {
    this.#w.setAttribute("aria-pressed", String(this.#U)), this.#x.setAttribute("aria-pressed", String(this.#y)), this.#w.disabled = this.#s, this.#x.disabled = this.#s;
  }
  async toggle() {
    this.#s || (await this.arm(), this.#r !== "error" && (this.#U = !0, this.#q()));
  }
  async arm() {
    if (!this.#i && (this.#u("loading"), !await this.#ee())) {
      this.#u("error"), this.#we("uPeek could not read this page. It may not be an Umbraco-routed document.");
      return;
    }
    this.#t = L(this.#i), this.#u(this.#t.coverage < x ? "degraded" : "armed"), this.#P();
  }
  disarm() {
    this.#p = !1, this.#o = null, this.#h.clear(), this.#c = !1, this.#U = !1, this.#y = !1, this.#u("dormant"), g(this.#k), this.#R(), this.#ue();
  }
  async toggleAdvanced() {
    this.#s || (await this.arm(), this.#r !== "error" && (this.#y = !0, this.#u("advanced"), this.#P(), this.#ce()));
  }
  // ------------------------------------------------------------------ data
  async #ee() {
    if (!this.#n.pageKey)
      return !1;
    const e = new URL(this.#n.manifestUrl, window.location.origin);
    e.searchParams.set("key", this.#n.pageKey), this.#n.culture && e.searchParams.set("culture", this.#n.culture), this.#n.segment && e.searchParams.set("segment", this.#n.segment), this.#n.preview && e.searchParams.set("preview", "true");
    try {
      const t = await fetch(e, { credentials: "same-origin", headers: { accept: "application/json" } });
      return t.ok ? (this.#i = await t.json(), !0) : !1;
    } catch {
      return !1;
    }
  }
  async #te(e) {
    if (this.#E.has(e))
      return;
    this.#E.set(e, "pending");
    const t = new URL(this.#n.usageUrl, window.location.origin);
    t.searchParams.set("key", e);
    try {
      const i = await fetch(t, { credentials: "same-origin", headers: { accept: "application/json" } });
      this.#E.set(
        e,
        i.ok ? await i.json() : "error"
      );
    } catch {
      this.#E.set(e, "error");
    }
    this.#o && this.#S(this.#o);
  }
  #j(e) {
    return this.#i?.nodes.find((t) => t.key === e);
  }
  // ------------------------------------------------------------------ highlights
  #P() {
    if (g(this.#k), !!this.#t) {
      for (const e of this.#t.regions) {
        const t = e.entries[0];
        this.#D(t.sourceKind) && this.#k.append(this.#ie(e));
      }
      if (this.#y && this.#c)
        for (const e of this.#t.unattributed) {
          const t = e.getBoundingClientRect();
          t.width === 0 && t.height === 0 || this.#k.append(
            r("div", {
              class: "peek-highlight",
              "data-kind": "Unattributed",
              style: T(t)
            })
          );
        }
    }
  }
  #ie(e) {
    const t = e.element.getBoundingClientRect(), i = e.entries[0], n = r("div", {
      class: "peek-highlight",
      "data-kind": i.sourceKind,
      "data-entry": i.id,
      style: T(t)
    });
    return e.entries.length > 1 && n.append(r("span", { class: "peek-ambiguous-badge", text: "?", title: `${e.entries.length} possible sources` })), n;
  }
  #ae() {
    this.#$(), this.#s && (this.#P(), this.#o && this.#G(this.#o));
  }
  // ------------------------------------------------------------------ interaction
  #ne(e) {
    if (this.#r !== "armed" && this.#r !== "degraded" && this.#r !== "advanced" || this.#p || !this.#t)
      return;
    const t = this.#X(e.clientX, e.clientY);
    t !== this.#o && (this.#o = t, this.#f = 0, t ? this.#S(t) : this.#R());
  }
  #re(e) {
    if (!this.#s)
      return;
    const t = e.composedPath();
    if (t.includes(this.#e) || this.#l && t.includes(this.#l) || this.#a && t.includes(this.#a))
      return;
    const i = this.#X(e.clientX, e.clientY);
    i && (e.preventDefault(), e.stopPropagation(), this.#p = !0, this.#o = i, this.#f = 0, this.#u("locked"), this.#S(i));
  }
  #oe(e) {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyU") {
      e.preventDefault(), this.toggle();
      return;
    }
    if (this.#s && e.key === "Escape") {
      e.preventDefault(), this.#p ? (this.#p = !1, this.#u(this.#a ? "advanced" : "armed"), this.#R()) : this.disarm();
      return;
    }
  }
  #X(e, t) {
    if (!this.#t)
      return null;
    let i = null, n = Number.POSITIVE_INFINITY;
    for (const a of this.#t.regions) {
      if (!this.#D(a.entries[0].sourceKind))
        continue;
      const o = a.element.getBoundingClientRect();
      if (e < o.left || e > o.right || t < o.top || t > o.bottom)
        continue;
      const d = o.width * o.height;
      d < n && (i = a, n = d);
    }
    return i;
  }
  // ------------------------------------------------------------------ card
  #R() {
    this.#l?.remove(), this.#l = null;
  }
  #S(e) {
    this.#R();
    const t = e.entries[this.#f] ?? e.entries[0], i = this.#j(t.nodeKey), n = r("div", {
      class: "peek-card",
      "data-kind": t.sourceKind,
      "data-pinned": String(this.#p),
      "data-peek-ui": "card"
    });
    n.append(r("div", { class: "peek-card-accent" }));
    const a = r("div", { class: "peek-card-body" }), o = r("div", { class: "peek-card-top" });
    o.append(this.#se(t, i));
    const d = r("div", { class: "peek-keyhint" });
    this.#p ? d.innerHTML = "<kbd>Esc</kbd> close" : d.textContent = "Click to pin card", o.append(d), a.append(o), a.append(this.#de(t, i)), e.entries.length > 1 && a.append(this.#pe(e)), a.append(
      r("p", {
        class: "peek-value",
        "data-empty": String(!t.valuePreview),
        text: t.valuePreview || "(empty)"
      })
    ), a.append(this.#le(t, i)), a.append(this.#he(t, i)), n.append(a), this.#l = n, this.#g.append(n), this.#G(e), t.sourceKind === "Shared" && i && this.#te(i.key);
  }
  #se(e, t) {
    const i = r("div", { class: "peek-tags" });
    if (i.append(
      r("span", {
        class: "peek-tag",
        "data-tone": D[e.sourceKind] ?? "quiet",
        text: F[e.sourceKind] ?? e.sourceKind
      })
    ), e.culture ? i.append(r("span", { class: "peek-tag", "data-tone": "quiet", text: e.culture })) : e.invariantAcrossCultures && i.append(
      r("span", {
        class: "peek-tag",
        "data-tone": "quiet",
        title: "This property does not vary by culture — editing it changes every language.",
        text: "all languages"
      })
    ), t?.publishState === "DraftChangesPending" ? i.append(
      r("span", {
        class: "peek-tag",
        "data-tone": "warn",
        title: `Published, with unpublished changes. This is usually the answer to "why isn't my change showing".`,
        text: "draft pending"
      })
    ) : t?.publishState === "Unpublished" && i.append(r("span", { class: "peek-tag", "data-tone": "warn", text: "unpublished" })), e.sourceKind === "Shared" && t) {
      const n = this.#E.get(t.key), a = n === "pending" || n === void 0 ? "checking usage…" : n === "error" ? "usage unknown" : `used on ${n.length}`;
      i.append(
        r("span", {
          class: "peek-tag",
          "data-tone": "shared",
          title: "Editing this changes every place it is used, not just this page.",
          text: a
        })
      );
    }
    return i;
  }
  #de(e, t) {
    const i = r("div", { class: "peek-breadcrumb" }), n = [this.#i?.page?.name ?? t?.name ?? "Page", ...e.breadcrumb.map((a) => a.label)];
    return n.forEach((a, o) => {
      o > 0 && i.append(r("span", { class: "peek-crumb-sep", text: "›" })), i.append(
        r("span", {
          class: o === n.length - 1 ? "peek-crumb-last" : "",
          text: a
        })
      );
    }), i;
  }
  #pe(e) {
    const t = r("ul", { class: "peek-candidates", role: "listbox" });
    e.entries.forEach((n, a) => {
      const o = this.#j(n.nodeKey), d = r("li", {
        role: "option",
        "aria-selected": String(a === this.#f),
        text: `${o?.contentTypeAlias ?? "?"}.${n.propertyAlias}`
      });
      d.addEventListener("click", (l) => {
        l.stopPropagation(), this.#f = a, this.#S(e);
      }), t.append(d);
    });
    const i = r("div", {
      class: "peek-row-note",
      "data-tone": "warn",
      text: `${e.entries.length} possible sources — uPeek will not guess`
    });
    return r("div", {}, i, t);
  }
  #le(e, t) {
    const i = r("dl", { class: "peek-meta" }), n = [
      ["Node", t?.name ?? "—"],
      ["Doc type", t?.contentTypeAlias ?? "—"],
      ["Property", e.propertyAlias],
      ["Editor", e.editorAlias ?? "—"],
      ["Edited", t?.updateDate ? `${z(t.updateDate)} (${N(t.updateDate)})` : "—"],
      ["By", t?.lastEditedBy ?? "—"]
    ];
    for (const [a, o] of n)
      i.append(r("dt", { text: a }), r("dd", { text: o }));
    return i;
  }
  #he(e, t) {
    const i = r("div", { class: "peek-actions" });
    e.editUrl && i.append(
      r("a", {
        class: "peek-primary",
        href: e.editUrl,
        target: "_blank",
        rel: "noopener",
        text: "Edit this field"
      })
    );
    const n = t?.isElement ? `@item.Content.Value<string>("${e.propertyAlias}")` : `@Model.Value<string>("${e.propertyAlias}")`, a = [
      ["Alias", e.propertyAlias],
      ["GUID", e.nodeKey],
      ["Razor", n]
    ];
    for (const [o, d] of a) {
      const l = r("button", { type: "button", text: o });
      l.addEventListener("click", async (p) => {
        p.stopPropagation();
        const h = await R(d);
        l.textContent = h ? "Copied" : "Copy failed", setTimeout(() => {
          l.textContent = o;
        }, 1200);
      }), i.append(l);
    }
    return i;
  }
  #G(e) {
    if (!this.#l)
      return;
    const t = e.element.getBoundingClientRect(), i = this.#l, n = i.offsetWidth || 340, a = i.offsetHeight || 220;
    let o = t.left, d = t.bottom + 8;
    o + n > window.innerWidth - 12 && (o = window.innerWidth - n - 12), d + a > window.innerHeight - 12 && (d = Math.max(12, t.top - a - 8)), i.style.left = `${Math.max(12, o)}px`, i.style.top = `${d}px`;
  }
  // ------------------------------------------------------------------ filter panel
  /**
   * Unfurl the panel out of the pill itself, below the button row, and remember where the pill was
   * so collapsing can put it back. The panel is a child of the pill on purpose: it inherits the
   * pill's position, so dragging the mark drags the panel with it.
   */
  #ce() {
    if (!(!this.#i || !this.#t)) {
      if (!this.#a) {
        this.#H();
        const e = this.#e.style;
        this.#T = {
          top: e.top,
          bottom: e.bottom,
          left: e.left,
          right: e.right
        };
        const t = this.#e.getBoundingClientRect();
        this.#a = r("div", { class: "peek-panel", "data-peek-ui": "panel" }), this.#e.append(this.#a), this.#e.dataset.expanded = "true", this.#F(!0), this.#z(), this.#Y(t, { width: this.#e.offsetWidth, height: this.#e.offsetHeight }), this.#$();
        return;
      }
      this.#z();
    }
  }
  /** Fold the panel back into the row, rather than dropping it. */
  #ue() {
    const e = this.#a;
    if (!e)
      return;
    this.#H(), this.#a = null, this.#O = e;
    const t = this.#e.getBoundingClientRect();
    if (this.#e.dataset.expanded = "false", this.#T) {
      const { top: i, bottom: n, left: a, right: o } = this.#T;
      this.#e.style.top = i, this.#e.style.bottom = n, this.#e.style.left = a, this.#e.style.right = o, this.#T = null;
    }
    this.#K(), this.#Y(t, {
      width: this.#d.getBoundingClientRect().width + (this.#v ? this.#m.offsetWidth : 0) + k.#W,
      height: this.#B.getBoundingClientRect().height + k.#W
    }), this.#$();
  }
  /** Refill the open panel in place — a filter toggle must not move the pill out from under the
   *  cursor that just pressed it. */
  #z() {
    const e = this.#a;
    if (!(!e || !this.#i || !this.#t)) {
      g(e), e.append(this.#ke());
      for (const t of this.#i.warnings)
        e.append(r("div", { class: "peek-notice", text: t }));
      e.append(this.#ge()), e.append(
        r("div", {
          class: "peek-panel-foot",
          text: `${this.#i.entries.length} values considered · built in ${this.#i.buildDurationMs} ms`
        })
      ), requestAnimationFrame(() => {
        this.#a === e && this.#$();
      });
    }
  }
  #ke() {
    const e = this.#i, t = this.#t, i = Math.round(t.coverage * 100), n = r("div", { class: "peek-panel-head" });
    n.append(
      r(
        "div",
        { class: "peek-panel-title" },
        r("span", { text: e.page?.name ?? "This page" }),
        r("small", { text: e.page?.contentTypeAlias ?? "" })
      )
    );
    const a = r("div", { class: "peek-coverage-bar", "data-low": String(t.coverage < x) });
    return a.append(r("i", { style: `width:${i}%` })), n.append(
      r(
        "div",
        { class: "peek-coverage" },
        a,
        r(
          "div",
          { class: "peek-coverage-label" },
          r("span", { text: `${i}% of visible text attributed` }),
          r("span", { text: `${t.unattributed.length} unattributed` })
        )
      )
    ), n.append(this.#fe()), n;
  }
  #fe() {
    const e = r("div", { class: "peek-chips" }), t = r(
      "div",
      { class: "peek-filters" },
      r("span", { class: "peek-label", text: "Filter" }),
      e
    ), i = [
      ["OwnedProperty", "owned", "This page"],
      ["Block", "block", "Blocks"],
      ["Shared", "shared", "Shared"],
      ["Media", "media", "Media"]
    ];
    for (const [a, o, d] of i) {
      const l = r(
        "button",
        {
          class: "peek-chip",
          type: "button",
          "data-tone": o,
          "aria-pressed": String(this.#h.has(a))
        },
        r("i", {}),
        document.createTextNode(d)
      );
      l.addEventListener("click", () => {
        this.#h.has(a) ? this.#h.delete(a) : this.#h.add(a), this.#P(), this.#z();
      }), e.append(l);
    }
    const n = r(
      "button",
      {
        class: "peek-chip",
        type: "button",
        "data-tone": "unattributed",
        "aria-pressed": String(this.#c),
        title: "Text uPeek could not trace back to a content property."
      },
      r("i", {}),
      document.createTextNode("Unattributed")
    );
    return n.addEventListener("click", () => {
      this.#c = !this.#c, this.#P(), this.#z();
    }), e.append(n), t;
  }
  #ge() {
    const e = r("div", { class: "peek-panel-list" }), t = this.#i, i = this.#t, n = t.entries.filter(
      (d) => this.#D(d.sourceKind) && d.state !== "Empty"
    ), a = this.#c ? i.unattributed : [];
    if (n.length === 0 && a.length === 0)
      return e.append(
        r("div", {
          class: "peek-empty",
          text: this.#h.size === 0 && !this.#c ? "Pick a filter above to outline what it covers." : "Nothing on this page matches these filters."
        })
      ), e;
    const o = [...n].sort((d, l) => {
      const p = (h) => i.matchedEntryIds.has(h.id) ? 0 : h.state === "Unmatchable" ? 2 : 1;
      return p(d) - p(l);
    });
    for (const d of o)
      e.append(this.#me(d, i.matchedEntryIds.has(d.id)));
    for (const d of a)
      e.append(this.#be(d));
    return e;
  }
  /**
   * A row for text uPeek could not trace. There is no property to name and nothing to open in the
   * backoffice, so it is identified by where it sits in the markup and what it says — enough to go
   * and find it, which is the whole question being asked of an unattributed row.
   */
  #be(e) {
    const t = r(
      "button",
      {
        class: "peek-row",
        type: "button",
        "data-kind": "Unattributed",
        "data-rendered": "true"
      },
      r("i", {}),
      r(
        "div",
        { class: "peek-row-main" },
        r("div", { class: "peek-row-alias", text: W(e) }),
        r("div", {
          class: "peek-row-note",
          text: (e.textContent ?? "").replace(/\s+/g, " ").trim()
        })
      )
    );
    return t.addEventListener("click", () => {
      e.scrollIntoView({ block: "center", behavior: "smooth" });
    }), t;
  }
  #me(e, t) {
    const i = this.#j(e.nodeKey), n = t ? e.valuePreview ?? "" : e.state === "Unmatchable" ? `has a value uPeek can't search for (${e.unmatchable})` : "read, not rendered", a = r(
      "button",
      {
        class: "peek-row",
        type: "button",
        "data-kind": e.sourceKind,
        "data-rendered": String(t)
      },
      r("i", {}),
      r(
        "div",
        { class: "peek-row-main" },
        r("div", { class: "peek-row-alias", text: `${i?.contentTypeAlias ?? "?"}.${e.propertyAlias}` }),
        r("div", {
          class: "peek-row-note",
          "data-tone": t ? "quiet" : "warn",
          text: n
        })
      )
    );
    return a.addEventListener("click", () => {
      const o = this.#t?.regions.find(
        (d) => d.entries.some((l) => l.id === e.id)
      );
      o ? (this.#p = !0, this.#o = o, this.#f = o.entries.findIndex((d) => d.id === e.id), o.element.scrollIntoView({ block: "center", behavior: "smooth" }), this.#S(o)) : e.editUrl && window.open(e.editUrl, "_blank", "noopener");
    }), a;
  }
  #we(e) {
    const t = r("div", { class: "peek-notice", "data-peek-ui": "notice", text: e });
    t.style.position = "absolute", t.style.right = "20px", t.style.bottom = "74px", t.style.maxWidth = "320px", t.style.pointerEvents = "auto", this.#g.append(t), setTimeout(() => t.remove(), 6e3);
  }
}
function W(s) {
  const e = s.tagName.toLowerCase();
  if (s.id)
    return `${e}#${s.id}`;
  const t = s.classList[0];
  return t ? `${e}.${t}` : e;
}
function T(s) {
  return `left:${s.left}px;top:${s.top}px;width:${s.width}px;height:${s.height}px`;
}
const K = "upeek-bootstrap", E = 1;
function H() {
  const s = document.getElementById(K);
  if (!s?.textContent)
    return null;
  try {
    const e = JSON.parse(s.textContent);
    return e.version !== E ? (console.warn(
      `[uPeek] bootstrap version ${e.version} is not supported by this overlay (expected ${E}). Hard-refresh to pick up the current build.`
    ), null) : e;
  } catch (e) {
    return console.warn("[uPeek] could not parse the bootstrap payload.", e), null;
  }
}
function P() {
  const s = H();
  if (!s)
    return;
  const e = new k(s);
  new URLSearchParams(window.location.search).get("upeek") !== null && e.arm();
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", P, { once: !0 }) : P();
//# sourceMappingURL=upeek.overlay.js.map
