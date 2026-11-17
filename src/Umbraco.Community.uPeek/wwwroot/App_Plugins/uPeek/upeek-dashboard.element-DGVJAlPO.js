import { LitElement as C, html as r, nothing as h, css as E, state as u, customElement as z } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as P } from "@umbraco-cms/backoffice/element-api";
import { u as b } from "./upeek-api-Curt4TwX.js";
import { f as p, V as m, v as D, a as L } from "./upeek-sampling-notice.element-CalCqx9T.js";
var T = Object.defineProperty, A = Object.getOwnPropertyDescriptor, f = (t) => {
  throw TypeError(t);
}, l = (t, e, o, c) => {
  for (var n = c > 1 ? void 0 : c ? A(e, o) : e, v = t.length - 1, g; v >= 0; v--)
    (g = t[v]) && (n = (c ? g(e, o, n) : g(n)) || n);
  return c && n && T(e, o, n), n;
}, O = (t, e, o) => e.has(t) || f("Cannot " + o), S = (t, e, o) => e.has(t) ? f("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, o), i = (t, e, o) => (O(t, e, "access private method"), o), a, y, _, k, d, $, x, w;
let s = class extends P(C) {
  constructor() {
    super(...arguments), S(this, a), this._loading = !0, this._lookupLoading = !1;
  }
  connectedCallback() {
    super.connectedCallback(), i(this, a, y).call(this);
  }
  render() {
    return this._loading ? r`<uui-loader-bar></uui-loader-bar>` : this._error ? r`<uui-box><p class="error">${this._error}</p></uui-box>` : this._report ? r`
      <div class="intro">
        <h2>Content usage</h2>
        <p>
          Which properties on this site actually reach a page, and which ones editors have been
          filling in for nobody. Everything below is evidence from observed traffic — uPeek reports
          what it saw, and never tells you to delete anything.
        </p>
      </div>

      <upeek-sampling-notice .status=${this._report.sampling}></upeek-sampling-notice>

      ${i(this, a, k).call(this)} ${i(this, a, $).call(this)} ${i(this, a, w).call(this)}
    ` : h;
  }
};
a = /* @__PURE__ */ new WeakSet();
y = async function() {
  this._loading = !0, this._error = void 0;
  try {
    this._report = await b.orphans();
  } catch (t) {
    this._error = t instanceof Error ? t.message : "uPeek could not load the report.";
  } finally {
    this._loading = !1;
  }
};
_ = async function(t) {
  this._lookupFor = t, this._lookupLoading = !0, this._lookup = void 0;
  try {
    this._lookup = await b.reverseLookup(t.contentTypeKey, t.propertyAlias);
  } catch {
    this._lookup = void 0;
  } finally {
    this._lookupLoading = !1;
  }
};
k = function() {
  const t = this._report.rows, e = {
    dead: t.filter((o) => o.verdict === "HasContentNeverObserved").length,
    empty: t.filter((o) => o.verdict === "AlwaysEmpty").length,
    excluded: t.filter((o) => o.verdict === "ExcludedFromReporting").length,
    rendering: t.filter((o) => o.verdict === "Rendering").length
  };
  return r`
      <div class="stats">
        ${i(this, a, d).call(this, e.dead, "have content and never rendered", "danger")}
        ${i(this, a, d).call(this, e.empty, "were never filled in at all", "warning")}
        ${i(this, a, d).call(this, e.rendering, "confirmed rendering", "positive")}
        ${i(this, a, d).call(this, e.excluded, "excluded from reporting", "default")}
      </div>
    `;
};
d = function(t, e, o) {
  return r`
      <div class="stat" data-tone=${o}>
        <div class="stat-value">${p(t)}</div>
        <div class="stat-label">${e}</div>
      </div>
    `;
};
$ = function() {
  const t = this._report, e = t.sampling.hasEnoughData;
  return t.rows.length === 0 ? r`
        <uui-box headline="Nothing observed yet">
          <p class="muted">
            uPeek has not recorded a single page view. Check that
            <code>uPeek:Sampling:Enabled</code> is true and that the site is receiving front-end
            traffic.
          </p>
        </uui-box>
      ` : r`
      <uui-box headline="Every observed property">
        <table>
          <thead>
            <tr>
              <th>Document type</th>
              <th>Property</th>
              <th class="num">Observed</th>
              <th class="num">Rendered</th>
              <th>Dead cultures</th>
              <th>${e ? "Verdict" : "Status"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${t.rows.map((o) => i(this, a, x).call(this, o, e))}
          </tbody>
        </table>
      </uui-box>
    `;
};
x = function(t, e) {
  const o = m[t.verdict];
  return r`
      <tr class=${t.verdict === "HasContentNeverObserved" ? "flagged" : ""}>
        <td>
          <uui-icon name=${t.contentTypeIcon ?? "icon-document"}></uui-icon>
          <span class="mono">${t.contentTypeAlias}</span>
        </td>
        <td class="mono strong">${t.propertyAlias}</td>
        <td class="num">${p(t.observedCount)}</td>
        <td class="num">${p(t.renderedCount)}</td>
        <td class="mono muted">${t.deadCultures.length > 0 ? t.deadCultures.join(", ") : "—"}</td>
        <td>
          <uui-tag color=${D(t.verdict)} look="secondary" title=${o.description}>
            ${e ? o.label : m.InsufficientData.label}
          </uui-tag>
        </td>
        <td class="actions">
          <uui-button
            compact
            look="secondary"
            label="Where does it render?"
            @click=${() => i(this, a, _).call(this, t)}
          ></uui-button>
          ${t.usageUrl ? r`<uui-button compact look="secondary" label="Open type" href=${t.usageUrl}></uui-button>` : h}
        </td>
      </tr>
    `;
};
w = function() {
  if (!this._lookupFor)
    return h;
  const t = this._lookupFor;
  return r`
      <uui-box headline="Where ${t.contentTypeAlias}.${t.propertyAlias} renders">
        <uui-button
          slot="header-actions"
          compact
          look="secondary"
          label="Close"
          @click=${() => {
    this._lookupFor = void 0, this._lookup = void 0;
  }}
        ></uui-button>

        ${this._lookupLoading ? r`<uui-loader-bar></uui-loader-bar>` : !this._lookup || this._lookup.locations.length === 0 ? r`
                <p class="muted">
                  No observed renders. That is consistent with the verdict above, and it is still
                  only what sampling saw — a page nobody visited during the window contributes
                  nothing here.
                </p>
              ` : r`
                <table>
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th>Culture</th>
                      <th class="num">Times seen</th>
                      <th>Last seen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this._lookup.locations.map(
    (e) => r`
                        <tr>
                          <td class="mono">${e.url}</td>
                          <td class="mono muted">${e.culture || "invariant"}</td>
                          <td class="num">${p(e.seenCount)}</td>
                          <td class="muted">${L(e.lastSeen)}</td>
                          <td class="actions">
                            ${e.editUrl ? r`<uui-button
                                  compact
                                  look="secondary"
                                  label="Edit"
                                  href=${e.editUrl}
                                ></uui-button>` : h}
                            <uui-button
                              compact
                              look="secondary"
                              label="Inspect"
                              href="${e.url}?upeek=1"
                              target="_blank"
                            ></uui-button>
                          </td>
                        </tr>
                      `
  )}
                  </tbody>
                </table>
              `}
      </uui-box>
    `;
};
s.styles = [
  E`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .intro h2 {
        margin: 0 0 var(--uui-size-space-2);
      }

      .intro p {
        margin: 0 0 var(--uui-size-layout-1);
        max-width: 70ch;
        color: var(--uui-color-text-alt);
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-layout-1);
      }

      .stat {
        padding: var(--uui-size-space-5);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        border-left: 3px solid var(--uui-color-divider-emphasis);
      }

      .stat[data-tone='danger'] {
        border-left-color: var(--uui-color-danger);
      }

      .stat[data-tone='warning'] {
        border-left-color: var(--uui-color-warning);
      }

      .stat[data-tone='positive'] {
        border-left-color: var(--uui-color-positive);
      }

      .stat-value {
        font-size: 1.7rem;
        font-weight: 700;
        line-height: 1.1;
      }

      .stat-label {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      uui-box {
        margin-bottom: var(--uui-size-layout-1);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--uui-type-small-size);
      }

      th {
        text-align: left;
        font-weight: 700;
        color: var(--uui-color-text-alt);
        padding: var(--uui-size-space-3) var(--uui-size-space-4);
        border-bottom: 1px solid var(--uui-color-divider);
        white-space: nowrap;
      }

      td {
        padding: var(--uui-size-space-3) var(--uui-size-space-4);
        border-bottom: 1px solid var(--uui-color-divider-standalone);
        vertical-align: middle;
      }

      tr.flagged td {
        background: var(--uui-color-danger-standalone, rgba(214, 62, 62, 0.06));
      }

      .mono {
        font-family: var(--uui-font-monospace, monospace);
      }

      .strong {
        font-weight: 700;
      }

      .muted {
        color: var(--uui-color-text-alt);
      }

      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .actions {
        white-space: nowrap;
        text-align: right;
      }

      code {
        background: var(--uui-color-surface-alt);
        padding: 0 4px;
        border-radius: 3px;
      }

      .error {
        color: var(--uui-color-danger);
      }
    `
];
l([
  u()
], s.prototype, "_report", 2);
l([
  u()
], s.prototype, "_loading", 2);
l([
  u()
], s.prototype, "_error", 2);
l([
  u()
], s.prototype, "_lookup", 2);
l([
  u()
], s.prototype, "_lookupFor", 2);
l([
  u()
], s.prototype, "_lookupLoading", 2);
s = l([
  z("upeek-dashboard")
], s);
const I = s;
export {
  s as PeekDashboardElement,
  I as default
};
//# sourceMappingURL=upeek-dashboard.element-DGVJAlPO.js.map
