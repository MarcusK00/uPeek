import { LitElement as b, html as o, nothing as g, css as k, state as p, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { UMB_ENTITY_CONTEXT as U } from "@umbraco-cms/backoffice/entity";
import { u as T } from "./upeek-api-Curt4TwX.js";
import "./upeek-sampling-notice.element-CalCqx9T.js";
var $ = Object.defineProperty, M = Object.getOwnPropertyDescriptor, _ = (t) => {
  throw TypeError(t);
}, u = (t, e, i, n) => {
  for (var r = n > 1 ? void 0 : n ? M(e, i) : e, c = t.length - 1, d; c >= 0; c--)
    (d = t[c]) && (r = (n ? d(e, i, r) : d(r)) || r);
  return n && r && $(e, i, r), r;
}, m = (t, e, i) => e.has(t) || _("Cannot " + i), P = (t, e, i) => (m(t, e, "read from private field"), e.get(t)), f = (t, e, i) => e.has(t) ? _("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), C = (t, e, i, n) => (m(t, e, "write to private field"), e.set(t, i), i), h = (t, e, i) => (m(t, e, "access private method"), i), l, s, v, y, x;
let a = class extends E(b) {
  constructor() {
    super(), f(this, s), this._loading = !0, f(this, l), this.consumeContext(U, (t) => {
      this.observe(
        t?.unique,
        (e) => {
          typeof e == "string" && e !== P(this, l) && (C(this, l, e), h(this, s, v).call(this, e));
        },
        "_peekMediaUnique"
      );
    });
  }
  render() {
    return this._loading ? o`<uui-loader-bar></uui-loader-bar>` : this._error ? o`<uui-box><p class="error">${this._error}</p></uui-box>` : this._usage ? this._usage.isReferenced ? h(this, s, y).call(this) : h(this, s, x).call(this) : g;
  }
};
l = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakSet();
v = async function(t) {
  this._loading = !0, this._error = void 0;
  try {
    this._usage = await T.mediaUsage(t);
  } catch (e) {
    this._error = e instanceof Error ? e.message : "uPeek could not load usage for this item.";
  } finally {
    this._loading = !1;
  }
};
y = function() {
  const t = this._usage;
  return o`
      <uui-box headline="Used on ${t.referencedBy.length} ${t.referencedBy.length === 1 ? "item" : "items"}">
        <p class="lead">
          These are hard references from Umbraco's relation tracking, so the list is exact rather
          than sampled. Deleting this item will leave each of them with an empty picker.
        </p>
        <uui-ref-list>
          ${t.referencedBy.map(
    (e) => o`
              <uui-ref-node
                name=${e.name ?? "(no name)"}
                detail=${e.contentTypeName ?? e.contentTypeAlias ?? ""}
                href=${e.editUrl ?? "#"}
                target="_blank"
              >
                <uui-icon slot="icon" name=${e.contentTypeIcon ?? "icon-document"}></uui-icon>
                ${e.published === !1 ? o`<uui-tag slot="tag" color="warning" look="secondary">unpublished</uui-tag>` : g}
              </uui-ref-node>
            `
  )}
        </uui-ref-list>
      </uui-box>
    `;
};
x = function() {
  return o`
      <uui-box headline="Not referenced anywhere">
        <div class="empty">
          <uui-icon name="icon-inbox"></uui-icon>
          <div>
            <strong>Nothing in the content tree points at this item.</strong>
            <p>
              No document, media item or block references it. That makes it a strong candidate for
              deletion — with one caveat worth reading before you act: a reference hard-coded in a
              template, a stylesheet or an email layout is invisible to relation tracking, because
              nothing ever recorded it as a relation.
            </p>
          </div>
        </div>
      </uui-box>
    `;
};
a.styles = [
  k`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .lead,
      p {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .lead {
        margin-top: 0;
      }

      .empty {
        display: flex;
        gap: var(--uui-size-space-5);
        align-items: flex-start;
      }

      .empty uui-icon {
        font-size: 2rem;
        color: var(--uui-color-text-alt);
      }

      .empty p {
        margin-bottom: 0;
      }

      .error {
        color: var(--uui-color-danger);
      }
    `
];
u([
  p()
], a.prototype, "_usage", 2);
u([
  p()
], a.prototype, "_loading", 2);
u([
  p()
], a.prototype, "_error", 2);
a = u([
  w("peek-media-usage")
], a);
const D = a;
export {
  a as PeekMediaUsageElement,
  D as default
};
//# sourceMappingURL=media-usage.element-Bxjr-Lu1.js.map
