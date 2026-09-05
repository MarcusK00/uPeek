import { LitElement as E, html as s, nothing as g, css as T, state as h, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
import { UMB_ENTITY_CONTEXT as D } from "@umbraco-cms/backoffice/entity";
import { p as O } from "./peek-api-CNyuwSfX.js";
import { V as p, f as d, v as b } from "./peek-sampling-notice.element-C2WTDiVu.js";
var U = Object.defineProperty, S = Object.getOwnPropertyDescriptor, y = (t) => {
  throw TypeError(t);
}, u = (t, e, a, i) => {
  for (var r = i > 1 ? void 0 : i ? S(e, a) : e, v = t.length - 1, m; v >= 0; v--)
    (m = t[v]) && (r = (i ? m(e, a, r) : m(r)) || r);
  return i && r && U(e, a, r), r;
}, f = (t, e, a) => e.has(t) || y("Cannot " + a), A = (t, e, a) => (f(t, e, "read from private field"), e.get(t)), _ = (t, e, a) => e.has(t) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), M = (t, e, a, i) => (f(t, e, "write to private field"), e.set(t, a), a), l = (t, e, a) => (f(t, e, "access private method"), a), c, n, $, x, w, k, C;
let o = class extends z(E) {
  constructor() {
    super(), _(this, n), this._loading = !0, this._expanded = /* @__PURE__ */ new Set(), _(this, c), this.consumeContext(D, (t) => {
      this.observe(
        t?.unique,
        (e) => {
          typeof e == "string" && e !== A(this, c) && (M(this, c, e), l(this, n, $).call(this, e));
        },
        "_peekEntityUnique"
      );
    });
  }
  render() {
    return this._loading ? s`<uui-loader-bar></uui-loader-bar>` : this._error ? s`<uui-box><p class="error">${this._error}</p></uui-box>` : this._usage ? s`
      <peek-sampling-notice .status=${this._usage.sampling}></peek-sampling-notice>

      <uui-box headline="Property usage">
        <div slot="header-actions">
          <span class="muted">${this._usage.properties.length} properties</span>
        </div>
        ${l(this, n, w).call(this)}
      </uui-box>
    ` : g;
  }
};
c = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakSet();
$ = async function(t) {
  this._loading = !0, this._error = void 0;
  try {
    this._usage = await O.documentTypeUsage(t);
  } catch (e) {
    this._error = e instanceof Error ? e.message : "Peek could not load usage for this document type.";
  } finally {
    this._loading = !1;
  }
};
x = function(t) {
  const e = new Set(this._expanded);
  e.has(t) ? e.delete(t) : e.add(t), this._expanded = e;
};
w = function() {
  const t = this._usage, e = t.sampling.hasEnoughData;
  return t.properties.length === 0 ? s`<p class="muted">This document type has no properties of its own.</p>` : s`
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Editor</th>
            <th class="num">Observed</th>
            <th class="num">Rendered</th>
            <th>${e ? "Verdict" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          ${t.properties.map((a) => l(this, n, k).call(this, a, e))}
        </tbody>
      </table>
    `;
};
k = function(t, e) {
  const a = p[t.verdict], i = this._expanded.has(t.propertyAlias), r = t.cultures.length > 0;
  return s`
      <tr
        class=${t.verdict === "HasContentNeverObserved" ? "flagged" : ""}
        @click=${() => r && l(this, n, x).call(this, t.propertyAlias)}
      >
        <td>
          <div class="alias">${t.propertyAlias}</div>
          <div class="muted">${t.propertyName ?? ""}</div>
        </td>
        <td class="muted mono">${t.editorAlias?.replace("Umbraco.", "") ?? "—"}</td>
        <td class="num">${d(t.totalObserved)}</td>
        <td class="num">${d(t.totalRendered)}</td>
        <td>
          <uui-tag color=${b(t.verdict)} look="secondary" title=${a.description}>
            ${e ? a.label : p.InsufficientData.label}
          </uui-tag>
          ${t.variesByCulture ? s`<uui-tag look="outline" class="vary">varies</uui-tag>` : g}
        </td>
      </tr>
      ${i ? l(this, n, C).call(this, t) : g}
    `;
};
C = function(t) {
  return s`
      <tr class="detail">
        <td colspan="5">
          <table class="inner">
            <tbody>
              ${t.cultures.map(
    (e) => s`
                  <tr>
                    <td class="mono">${e.culture || "invariant"}</td>
                    <td class="num">${d(e.observedCount)} observed</td>
                    <td class="num">${d(e.renderedCount)} rendered</td>
                    <td class="num muted">${d(e.emptyCount)} empty</td>
                    <td>
                      <uui-tag
                        color=${b(e.verdict)}
                        look="secondary"
                        title=${p[e.verdict].description}
                      >
                        ${p[e.verdict].label}
                      </uui-tag>
                    </td>
                  </tr>
                `
  )}
            </tbody>
          </table>
        </td>
      </tr>
    `;
};
o.styles = [
  T`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
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
        vertical-align: top;
      }

      tbody tr:hover {
        background: var(--uui-color-surface-alt);
        cursor: pointer;
      }

      tr.flagged td {
        background: var(--uui-color-danger-standalone, rgba(214, 62, 62, 0.06));
      }

      tr.detail:hover,
      tr.detail {
        background: var(--uui-color-surface-alt);
        cursor: default;
      }

      table.inner td {
        border: none;
        padding: 2px var(--uui-size-space-4);
      }

      .alias {
        font-family: var(--uui-font-monospace, monospace);
        font-weight: 700;
      }

      .mono {
        font-family: var(--uui-font-monospace, monospace);
      }

      .muted {
        color: var(--uui-color-text-alt);
      }

      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .vary {
        margin-left: var(--uui-size-space-2);
      }

      .error {
        color: var(--uui-color-danger);
      }
    `
];
u([
  h()
], o.prototype, "_usage", 2);
u([
  h()
], o.prototype, "_loading", 2);
u([
  h()
], o.prototype, "_error", 2);
u([
  h()
], o.prototype, "_expanded", 2);
o = u([
  P("peek-document-type-usage")
], o);
const B = o;
export {
  o as PeekDocumentTypeUsageElement,
  B as default
};
//# sourceMappingURL=document-type-usage.element-CHh9t12v.js.map
