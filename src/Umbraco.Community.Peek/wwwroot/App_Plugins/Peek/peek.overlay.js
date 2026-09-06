function E(s) {
  if (!s)
    return "";
  let e = "", t = !1;
  for (const a of s) {
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
function P(s) {
  return T.has(s.tagName);
}
function S(s) {
  const e = /* @__PURE__ */ new Map(), t = [];
  for (const c of s.entries)
    for (const h of c.matchTexts) {
      const l = h.toLowerCase(), u = e.get(l);
      u ? u.push(c) : e.set(l, [c]), t.push({ entry: c, fragment: l });
    }
  t.sort((c, h) => h.fragment.length - c.fragment.length);
  const a = /* @__PURE__ */ new Map(), i = [], r = /* @__PURE__ */ new Set(), n = s.matching.minimumValueLength;
  let d = 0, p = 0;
  for (const c of A(document.body, n)) {
    d++;
    const h = E(c.text).toLowerCase();
    let l = e.get(h), u = "exact";
    if (!l) {
      const k = t.find(
        (f) => h.includes(f.fragment) || f.fragment.includes(h)
      );
      k && (l = [k.entry], u = "partial");
    }
    if (!l || l.length === 0) {
      i.push(c.element);
      continue;
    }
    p++, g(a, c.element, l, u);
    for (const k of l)
      r.add(k.id);
  }
  return L(s, a, r), C(s, a, r, n), {
    regions: [...a.values()],
    unattributed: i,
    coverage: d === 0 ? 0 : p / d,
    matchedEntryIds: r
  };
}
function g(s, e, t, a) {
  const i = s.get(e);
  if (!i) {
    s.set(e, { element: e, entries: [...t], confidence: a });
    return;
  }
  for (const r of t)
    i.entries.some((n) => n.id === r.id) || i.entries.push(r);
}
function L(s, e, t) {
  const a = s.entries.filter((r) => r.mediaUrl);
  if (a.length === 0)
    return;
  const i = document.querySelectorAll('img, picture source, video, [style*="url("]');
  for (const r of i) {
    const n = [
      r.getAttribute("src"),
      r.getAttribute("srcset"),
      r.getAttribute("poster"),
      r.getAttribute("style")
    ].filter(Boolean).join(" ").toLowerCase();
    if (n) {
      for (const d of a)
        if (n.includes(d.mediaUrl.toLowerCase())) {
          const p = r.tagName === "SOURCE" ? r.parentElement ?? r : r;
          g(e, p, [d], "media"), t.add(d.id);
        }
    }
  }
}
const b = ["href", "src", "srcset", "action", "poster", "content", "value"];
function C(s, e, t, a) {
  const i = s.entries.filter(
    (n) => !t.has(n.id) && n.matchTexts.length > 0
  );
  if (i.length === 0)
    return;
  const r = b.map((n) => `[${n}]`).join(",");
  for (const n of document.querySelectorAll(r)) {
    if (n.closest("[data-peek-ui]"))
      continue;
    const d = b.map((p) => n.getAttribute(p)).filter((p) => !!p && p.length >= a).join(" ").toLowerCase();
    if (d)
      for (const p of i)
        p.matchTexts.some((c) => d.includes(c.toLowerCase())) && (g(e, n, [p], "attribute"), t.add(p.id));
  }
}
function A(s, e) {
  const t = [];
  if (!s)
    return t;
  const a = document.createTreeWalker(s, NodeFilter.SHOW_TEXT, {
    acceptNode(r) {
      const n = r.parentElement;
      return !n || P(n) || n.closest("[data-peek-ui]") ? NodeFilter.FILTER_REJECT : E(r.nodeValue).length >= e ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let i = a.nextNode();
  for (; i; ) {
    const r = i.parentElement;
    r && t.push({ element: r, text: i.nodeValue ?? "" }), i = a.nextNode();
  }
  return t;
}
function o(s, e = {}, ...t) {
  const a = document.createElement(s);
  for (const [i, r] of Object.entries(e))
    r != null && (i === "class" ? a.className = r : i === "text" ? a.textContent = r : a.setAttribute(i, r));
  for (const i of t)
    i != null && a.append(i);
  return a;
}
function m(s) {
  for (; s.firstChild; )
    s.firstChild.remove();
}
async function $(s) {
  try {
    return await navigator.clipboard.writeText(s), !0;
  } catch {
    return !1;
  }
}
function I(s) {
  if (!s)
    return "—";
  const e = new Date(s);
  if (Number.isNaN(e.getTime()))
    return "—";
  const t = (a) => String(a).padStart(2, "0");
  return `${t(e.getDate())}-${t(e.getMonth() + 1)}-${e.getFullYear()} ${t(e.getHours())}:${t(e.getMinutes())}`;
}
function N(s) {
  if (!s)
    return "";
  const e = new Date(s);
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
  for (const [r, n] of a) {
    if (Math.abs(i) < r)
      return t.format(Math.round(i), n);
    i /= r;
  }
  return "";
}
const M = (
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

/* ---------------------------------------------------------------- pill */

.peek-pill {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 10px;
  background: var(--peek-surface);
  border: 1px solid var(--peek-border);
  border-radius: 999px;
  box-shadow: var(--peek-shadow);
  font-size: 13px;
  font-weight: 600;
  cursor: grab;
  pointer-events: auto;
  user-select: none;
}

.peek-pill[data-dragging="true"] { cursor: grabbing; }
.peek-pill[data-state="armed"]   { border-color: var(--peek-owned); }
.peek-pill[data-state="xray"]    { border-color: var(--peek-block); }
.peek-pill[data-state="degraded"]{ border-color: var(--peek-warn); }

.peek-pill .peek-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--peek-text-dim);
  flex: none;
}

.peek-pill[data-state="armed"] .peek-dot { background: var(--peek-owned); box-shadow: 0 0 0 3px var(--peek-owned-soft); }
.peek-pill[data-state="locked"] .peek-dot { background: var(--peek-owned); }
.peek-pill[data-state="xray"] .peek-dot  { background: var(--peek-block); box-shadow: 0 0 0 3px var(--peek-block-soft); }
.peek-pill[data-state="loading"] .peek-dot { background: var(--peek-owned); animation: peek-pulse 900ms ease-in-out infinite; }
.peek-pill[data-state="degraded"] .peek-dot { background: var(--peek-warn); }

@keyframes peek-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }

.peek-pill button {
  all: unset;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--peek-text-dim);
}

.peek-pill button:hover { background: var(--peek-surface-2); color: var(--peek-text); }
.peek-pill button[aria-pressed="true"] { background: var(--peek-block-soft); color: var(--peek-block); }
.peek-pill button[hidden] { display: none; }

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
), x = 0.6, R = {
  OwnedProperty: "owned",
  Block: "block",
  Shared: "shared",
  Media: "media"
}, D = {
  OwnedProperty: "This page",
  Block: "Block",
  Shared: "Shared",
  Media: "Media"
};
class B {
  #h;
  #E;
  #r;
  #a = "dormant";
  #i = null;
  #t = null;
  #u;
  #s;
  #T;
  #m;
  #x;
  #v;
  #c = null;
  #k = null;
  #e = null;
  #o = !1;
  #n = 0;
  #d = /* @__PURE__ */ new Set();
  #w = !1;
  /** Usage counts are fetched lazily per node — the manifest should not pay for them. */
  #b = /* @__PURE__ */ new Map();
  constructor(e) {
    this.#r = e, this.#E = o("div", { "data-peek-ui": "root" }), this.#h = this.#E.attachShadow({ mode: "open" }), this.#h.append(o("style", { text: M })), document.body.append(this.#E), this.#$(), this.#N();
  }
  // ------------------------------------------------------------------ chrome
  #$() {
    this.#u = o("div", { class: "peek-layer" }), this.#T = o("span", { text: "Peek" }), this.#m = o("button", { type: "button", "data-action": "toggle", text: "Inspect" }), this.#x = o("button", {
      type: "button",
      "data-action": "xray",
      "aria-pressed": "false",
      text: "X-ray"
    }), this.#v = o("button", { type: "button", "data-action": "stop", hidden: "", text: "Stop" }), this.#s = o(
      "div",
      { class: "peek-pill", "data-state": "dormant", role: "group", "aria-label": "Peek content inspector" },
      o("span", { class: "peek-dot" }),
      this.#T,
      this.#m,
      this.#x,
      this.#v
    ), this.#m.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggle();
    }), this.#x.addEventListener("click", (e) => {
      e.stopPropagation(), this.toggleXray();
    }), this.#v.addEventListener("click", (e) => {
      e.stopPropagation(), this.disarm();
    }), this.#I(this.#s), this.#h.append(this.#u, this.#s);
  }
  /** The pill will end up on top of somebody's chat widget. It has to be movable. */
  #I(e) {
    let t = !1, a = 0, i = 0;
    e.addEventListener("pointerdown", (n) => {
      if (n.target.tagName === "BUTTON")
        return;
      t = !0;
      const d = e.getBoundingClientRect();
      a = n.clientX - d.left, i = n.clientY - d.top, e.setPointerCapture(n.pointerId), e.dataset.dragging = "true";
    }), e.addEventListener("pointermove", (n) => {
      if (!t)
        return;
      const d = Math.min(Math.max(0, n.clientX - a), window.innerWidth - e.offsetWidth), p = Math.min(Math.max(0, n.clientY - i), window.innerHeight - e.offsetHeight);
      e.style.left = `${d}px`, e.style.top = `${p}px`, e.style.right = "auto", e.style.bottom = "auto";
    });
    const r = (n) => {
      t && (t = !1, delete e.dataset.dragging, e.releasePointerCapture(n.pointerId));
    };
    e.addEventListener("pointerup", r), e.addEventListener("pointercancel", r);
  }
  #N() {
    document.addEventListener("keydown", (a) => this.#O(a), !0), document.addEventListener("mousemove", (a) => this.#U(a), { passive: !0 }), document.addEventListener("click", (a) => this.#z(a), !0);
    let e = 0;
    const t = () => {
      cancelAnimationFrame(e), e = requestAnimationFrame(() => this.#B());
    };
    window.addEventListener("resize", t, { passive: !0 }), window.addEventListener("scroll", t, { passive: !0, capture: !0 });
  }
  // ------------------------------------------------------------------ state
  get #g() {
    return this.#a === "armed" || this.#a === "locked" || this.#a === "xray" || this.#a === "degraded";
  }
  #p(e) {
    this.#a = e, this.#s.dataset.state = e;
    const t = {
      dormant: "Peek",
      loading: "Reading page…",
      armed: "Hover anything",
      locked: "Pinned",
      xray: "X-ray",
      degraded: "Partial coverage",
      error: "Peek unavailable"
    };
    this.#T.textContent = t[e];
    const a = this.#g;
    this.#m.hidden = a, this.#x.hidden = a, this.#v.hidden = !a;
  }
  async toggle() {
    if (this.#g) {
      this.disarm();
      return;
    }
    await this.arm();
  }
  async arm() {
    if (!this.#i && (this.#p("loading"), !await this.#M())) {
      this.#p("error"), this.#J("Peek could not read this page. It may not be an Umbraco-routed document.");
      return;
    }
    this.#t = S(this.#i), this.#p(this.#t.coverage < x ? "degraded" : "armed"), this.#f();
  }
  disarm() {
    this.#o = !1, this.#e = null, this.#p("dormant"), m(this.#u), this.#y(), this.#S(), this.#s.querySelector('[data-action="xray"]')?.setAttribute("aria-pressed", "false");
  }
  async toggleXray() {
    if (this.#a === "xray") {
      this.#S(), this.#p("armed"), this.#s.querySelector('[data-action="xray"]')?.setAttribute("aria-pressed", "false"), this.#f();
      return;
    }
    !this.#g && (await this.arm(), this.#a === "error") || (this.#p("xray"), this.#s.querySelector('[data-action="xray"]')?.setAttribute("aria-pressed", "true"), this.#f(), this.#L());
  }
  // ------------------------------------------------------------------ data
  async #M() {
    if (!this.#r.pageKey)
      return !1;
    const e = new URL(this.#r.manifestUrl, window.location.origin);
    e.searchParams.set("key", this.#r.pageKey), this.#r.culture && e.searchParams.set("culture", this.#r.culture), this.#r.segment && e.searchParams.set("segment", this.#r.segment), this.#r.preview && e.searchParams.set("preview", "true");
    try {
      const t = await fetch(e, { credentials: "same-origin", headers: { accept: "application/json" } });
      return t.ok ? (this.#i = await t.json(), !0) : !1;
    } catch {
      return !1;
    }
  }
  async #R(e) {
    if (this.#b.has(e))
      return;
    this.#b.set(e, "pending");
    const t = new URL(this.#r.usageUrl, window.location.origin);
    t.searchParams.set("key", e);
    try {
      const a = await fetch(t, { credentials: "same-origin", headers: { accept: "application/json" } });
      this.#b.set(
        e,
        a.ok ? await a.json() : "error"
      );
    } catch {
      this.#b.set(e, "error");
    }
    this.#e && this.#l(this.#e);
  }
  #P(e) {
    return this.#i?.nodes.find((t) => t.key === e);
  }
  // ------------------------------------------------------------------ highlights
  #f() {
    if (m(this.#u), !!this.#t) {
      for (const e of this.#t.regions) {
        const t = e.entries[0];
        this.#d.has(t.sourceKind) || this.#u.append(this.#D(e));
      }
      if (this.#a === "xray" && this.#w)
        for (const e of this.#t.unattributed) {
          const t = e.getBoundingClientRect();
          t.width === 0 && t.height === 0 || this.#u.append(
            o("div", {
              class: "peek-highlight",
              "data-kind": "Unattributed",
              style: v(t)
            })
          );
        }
    }
  }
  #D(e) {
    const t = e.element.getBoundingClientRect(), a = e.entries[0], i = o("div", {
      class: "peek-highlight",
      "data-kind": a.sourceKind,
      "data-entry": a.id,
      style: v(t)
    });
    return e.entries.length > 1 && i.append(o("span", { class: "peek-ambiguous-badge", text: "?", title: `${e.entries.length} possible sources` })), i;
  }
  #B() {
    this.#g && (this.#f(), this.#e && this.#A(this.#e));
  }
  // ------------------------------------------------------------------ interaction
  #U(e) {
    if (this.#a !== "armed" && this.#a !== "degraded" && this.#a !== "xray" || this.#o || !this.#t)
      return;
    const t = this.#C(e.clientX, e.clientY);
    t !== this.#e && (this.#e = t, this.#n = 0, t ? this.#l(t) : this.#y());
  }
  #z(e) {
    if (!this.#g)
      return;
    const t = e.composedPath();
    if (t.includes(this.#s) || this.#c && t.includes(this.#c) || this.#k && t.includes(this.#k))
      return;
    const a = this.#C(e.clientX, e.clientY);
    a && (e.preventDefault(), e.stopPropagation(), this.#o = !0, this.#e = a, this.#n = 0, this.#p("locked"), this.#l(a));
  }
  #O(e) {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyU") {
      e.preventDefault(), this.toggle();
      return;
    }
    if (!this.#g)
      return;
    if (e.key === "Escape") {
      e.preventDefault(), this.#o ? (this.#o = !1, this.#p(this.#k ? "xray" : "armed"), this.#y()) : this.disarm();
      return;
    }
    if (!this.#o || !this.#e)
      return;
    const t = this.#e.entries;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (t.length < 2)
          return;
        e.preventDefault();
        const a = e.key === "ArrowDown" ? 1 : -1;
        this.#n = (this.#n + a + t.length) % t.length, this.#l(this.#e);
        return;
      }
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault(), this.#K(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      case "Enter": {
        e.preventDefault();
        const a = t[this.#n]?.editUrl;
        a && window.open(a, "_blank", "noopener");
        return;
      }
    }
  }
  /** Walk to the next or previous region in document order, so the page can be traversed. */
  #K(e) {
    if (!this.#t || !this.#e)
      return;
    const t = this.#t.regions.filter((r) => !this.#d.has(r.entries[0].sourceKind)), a = t.indexOf(this.#e);
    if (a < 0)
      return;
    const i = t[(a + e + t.length) % t.length];
    this.#e = i, this.#n = 0, i.element.scrollIntoView({ block: "center", behavior: "smooth" }), this.#l(i);
  }
  #C(e, t) {
    if (!this.#t)
      return null;
    let a = null, i = Number.POSITIVE_INFINITY;
    for (const r of this.#t.regions) {
      if (this.#d.has(r.entries[0].sourceKind))
        continue;
      const n = r.element.getBoundingClientRect();
      if (e < n.left || e > n.right || t < n.top || t > n.bottom)
        continue;
      const d = n.width * n.height;
      d < i && (a = r, i = d);
    }
    return a;
  }
  // ------------------------------------------------------------------ card
  #y() {
    this.#c?.remove(), this.#c = null;
  }
  #l(e) {
    this.#y();
    const t = e.entries[this.#n] ?? e.entries[0], a = this.#P(t.nodeKey), i = o("div", {
      class: "peek-card",
      "data-kind": t.sourceKind,
      "data-pinned": String(this.#o),
      "data-peek-ui": "card"
    });
    i.append(o("div", { class: "peek-card-accent" }));
    const r = o("div", { class: "peek-card-body" });
    if (r.append(this.#F(t, a)), r.append(this.#_(t, a)), e.entries.length > 1 && r.append(this.#H(e)), r.append(
      o("p", {
        class: "peek-value",
        "data-empty": String(!t.valuePreview),
        text: t.valuePreview || "(empty)"
      })
    ), r.append(this.#V(t, a)), r.append(this.#j(t, a)), this.#o) {
      const n = o("div", { class: "peek-keyhint" });
      n.innerHTML = "<kbd>←</kbd><kbd>→</kbd> next region · <kbd>↑</kbd><kbd>↓</kbd> candidates · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close", r.append(n);
    }
    i.append(r), this.#c = i, this.#h.append(i), this.#A(e), t.sourceKind === "Shared" && a && this.#R(a.key);
  }
  #F(e, t) {
    const a = o("div", { class: "peek-tags" });
    if (a.append(
      o("span", {
        class: "peek-tag",
        "data-tone": R[e.sourceKind] ?? "quiet",
        text: D[e.sourceKind] ?? e.sourceKind
      })
    ), e.culture ? a.append(o("span", { class: "peek-tag", "data-tone": "quiet", text: e.culture })) : e.invariantAcrossCultures && a.append(
      o("span", {
        class: "peek-tag",
        "data-tone": "quiet",
        title: "This property does not vary by culture — editing it changes every language.",
        text: "all languages"
      })
    ), t?.publishState === "DraftChangesPending" ? a.append(
      o("span", {
        class: "peek-tag",
        "data-tone": "warn",
        title: `Published, with unpublished changes. This is usually the answer to "why isn't my change showing".`,
        text: "draft pending"
      })
    ) : t?.publishState === "Unpublished" && a.append(o("span", { class: "peek-tag", "data-tone": "warn", text: "unpublished" })), e.sourceKind === "Shared" && t) {
      const i = this.#b.get(t.key), r = i === "pending" || i === void 0 ? "checking usage…" : i === "error" ? "usage unknown" : `used on ${i.length}`;
      a.append(
        o("span", {
          class: "peek-tag",
          "data-tone": "shared",
          title: "Editing this changes every place it is used, not just this page.",
          text: r
        })
      );
    }
    return a;
  }
  #_(e, t) {
    const a = o("div", { class: "peek-breadcrumb" }), i = [this.#i?.page?.name ?? t?.name ?? "Page", ...e.breadcrumb.map((r) => r.label)];
    return i.forEach((r, n) => {
      n > 0 && a.append(o("span", { class: "peek-crumb-sep", text: "›" })), a.append(
        o("span", {
          class: n === i.length - 1 ? "peek-crumb-last" : "",
          text: r
        })
      );
    }), a;
  }
  #H(e) {
    const t = o("ul", { class: "peek-candidates", role: "listbox" });
    e.entries.forEach((i, r) => {
      const n = this.#P(i.nodeKey), d = o("li", {
        role: "option",
        "aria-selected": String(r === this.#n),
        text: `${n?.contentTypeAlias ?? "?"}.${i.propertyAlias}`
      });
      d.addEventListener("click", (p) => {
        p.stopPropagation(), this.#n = r, this.#l(e);
      }), t.append(d);
    });
    const a = o("div", {
      class: "peek-row-note",
      "data-tone": "warn",
      text: `${e.entries.length} possible sources — Peek will not guess`
    });
    return o("div", {}, a, t);
  }
  #V(e, t) {
    const a = o("dl", { class: "peek-meta" }), i = [
      ["Node", t?.name ?? "—"],
      ["Doc type", t?.contentTypeAlias ?? "—"],
      ["Property", e.propertyAlias],
      ["Editor", e.editorAlias ?? "—"],
      ["Edited", t?.updateDate ? `${I(t.updateDate)} (${N(t.updateDate)})` : "—"],
      ["By", t?.lastEditedBy ?? "—"]
    ];
    for (const [r, n] of i)
      a.append(o("dt", { text: r }), o("dd", { text: n }));
    return a;
  }
  #j(e, t) {
    const a = o("div", { class: "peek-actions" });
    e.editUrl && a.append(
      o("a", {
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
      ["Bug report", this.#q(e, t)]
    ];
    for (const [n, d] of r) {
      const p = o("button", { type: "button", text: n });
      p.addEventListener("click", async (c) => {
        c.stopPropagation();
        const h = await $(d);
        p.textContent = h ? "Copied" : "Copy failed", setTimeout(() => {
          p.textContent = n;
        }, 1200);
      }), a.append(p);
    }
    return a;
  }
  #q(e, t) {
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
  #A(e) {
    if (!this.#c)
      return;
    const t = e.element.getBoundingClientRect(), a = this.#c, i = a.offsetWidth || 340, r = a.offsetHeight || 220;
    let n = t.left, d = t.bottom + 8;
    n + i > window.innerWidth - 12 && (n = window.innerWidth - i - 12), d + r > window.innerHeight - 12 && (d = Math.max(12, t.top - r - 8)), a.style.left = `${Math.max(12, n)}px`, a.style.top = `${d}px`;
  }
  // ------------------------------------------------------------------ x-ray panel
  #S() {
    this.#k?.remove(), this.#k = null;
  }
  #L() {
    if (this.#S(), !this.#i || !this.#t)
      return;
    const e = o("div", { class: "peek-panel", "data-peek-ui": "panel" });
    e.append(this.#Y());
    for (const t of this.#i.warnings)
      e.append(o("div", { class: "peek-notice", text: t }));
    e.append(this.#X()), e.append(
      o("div", {
        class: "peek-panel-foot",
        text: `${this.#i.entries.length} values considered · built in ${this.#i.buildDurationMs} ms`
      })
    ), this.#k = e, this.#h.append(e);
  }
  #Y() {
    const e = this.#i, t = this.#t, a = Math.round(t.coverage * 100), i = o("div", { class: "peek-panel-head" });
    i.append(
      o(
        "div",
        { class: "peek-panel-title" },
        o("span", { text: e.page?.name ?? "This page" }),
        o("small", { text: e.page?.contentTypeAlias ?? "" })
      )
    );
    const r = o("div", { class: "peek-coverage-bar", "data-low": String(t.coverage < x) });
    return r.append(o("i", { style: `width:${a}%` })), i.append(
      o(
        "div",
        { class: "peek-coverage" },
        r,
        o(
          "div",
          { class: "peek-coverage-label" },
          o("span", { text: `${a}% of visible text attributed` }),
          o("span", { text: `${t.unattributed.length} unattributed` })
        )
      )
    ), i.append(this.#W()), i;
  }
  #W() {
    const e = o("div", { class: "peek-chips" }), t = [
      ["OwnedProperty", "owned", "This page"],
      ["Block", "block", "Blocks"],
      ["Shared", "shared", "Shared"],
      ["Media", "media", "Media"]
    ];
    for (const [i, r, n] of t) {
      const d = o(
        "button",
        {
          class: "peek-chip",
          type: "button",
          "data-tone": r,
          "aria-pressed": String(!this.#d.has(i))
        },
        o("i", {}),
        document.createTextNode(n)
      );
      d.addEventListener("click", () => {
        this.#d.has(i) ? this.#d.delete(i) : this.#d.add(i), this.#f(), this.#L();
      }), e.append(d);
    }
    const a = o(
      "button",
      {
        class: "peek-chip",
        type: "button",
        "data-tone": "unattributed",
        "aria-pressed": String(this.#w),
        title: "Text Peek could not trace back to a content property."
      },
      o("i", {}),
      document.createTextNode("Unattributed")
    );
    return a.addEventListener("click", () => {
      this.#w = !this.#w, this.#f(), this.#L();
    }), e.append(a), e;
  }
  #X() {
    const e = o("div", { class: "peek-panel-list" }), t = this.#i, a = this.#t, i = t.entries.filter(
      (n) => !this.#d.has(n.sourceKind) && n.state !== "Empty"
    );
    if (i.length === 0)
      return e.append(o("div", { class: "peek-empty", text: "Nothing to show with these filters." })), e;
    const r = [...i].sort((n, d) => {
      const p = (c) => a.matchedEntryIds.has(c.id) ? 0 : c.state === "Unmatchable" ? 2 : 1;
      return p(n) - p(d);
    });
    for (const n of r)
      e.append(this.#G(n, a.matchedEntryIds.has(n.id)));
    return e;
  }
  #G(e, t) {
    const a = this.#P(e.nodeKey), i = t ? e.valuePreview ?? "" : e.state === "Unmatchable" ? `has a value Peek can't search for (${e.unmatchable})` : "read, not rendered", r = o(
      "button",
      {
        class: "peek-row",
        type: "button",
        "data-kind": e.sourceKind,
        "data-rendered": String(t)
      },
      o("i", {}),
      o(
        "div",
        { class: "peek-row-main" },
        o("div", { class: "peek-row-alias", text: `${a?.contentTypeAlias ?? "?"}.${e.propertyAlias}` }),
        o("div", {
          class: "peek-row-note",
          "data-tone": t ? "quiet" : "warn",
          text: i
        })
      )
    );
    return r.addEventListener("click", () => {
      const n = this.#t?.regions.find(
        (d) => d.entries.some((p) => p.id === e.id)
      );
      n ? (this.#o = !0, this.#e = n, this.#n = n.entries.findIndex((d) => d.id === e.id), n.element.scrollIntoView({ block: "center", behavior: "smooth" }), this.#l(n)) : e.editUrl && window.open(e.editUrl, "_blank", "noopener");
    }), r;
  }
  #J(e) {
    const t = o("div", { class: "peek-notice", "data-peek-ui": "notice", text: e });
    t.style.position = "absolute", t.style.right = "20px", t.style.bottom = "74px", t.style.maxWidth = "320px", t.style.pointerEvents = "auto", this.#h.append(t), setTimeout(() => t.remove(), 6e3);
  }
}
function v(s) {
  return `left:${s.left}px;top:${s.top}px;width:${s.width}px;height:${s.height}px`;
}
const U = "peek-bootstrap", w = 1;
function z() {
  const s = document.getElementById(U);
  if (!s?.textContent)
    return null;
  try {
    const e = JSON.parse(s.textContent);
    return e.version !== w ? (console.warn(
      `[Peek] bootstrap version ${e.version} is not supported by this overlay (expected ${w}). Hard-refresh to pick up the current build.`
    ), null) : e;
  } catch (e) {
    return console.warn("[Peek] could not parse the bootstrap payload.", e), null;
  }
}
function y() {
  const s = z();
  if (!s)
    return;
  const e = new B(s);
  new URLSearchParams(window.location.search).get("peek") !== null && e.arm();
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", y, { once: !0 }) : y();
//# sourceMappingURL=peek.overlay.js.map
