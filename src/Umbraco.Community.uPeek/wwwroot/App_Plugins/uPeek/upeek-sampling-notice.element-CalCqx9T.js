import { LitElement as c, nothing as p, html as l, css as m, property as g, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
const b = {
  Rendering: {
    label: "Rendering",
    tone: "positive",
    description: "Observed reaching the page."
  },
  HasContentNeverObserved: {
    label: "0 observed renders",
    tone: "danger",
    description: "Editors are filling this in and it was never seen in any output. Worth investigating — not proof it is unused."
  },
  AlwaysEmpty: {
    label: "Always empty",
    tone: "warning",
    description: "No editor has put anything in this property on any page uPeek observed."
  },
  NotMeasurable: {
    label: "Not measurable",
    tone: "neutral",
    description: "Has content, but of a kind uPeek cannot search the page for — too short, numeric, or not literal text. Absence of a match means nothing here."
  },
  ExcludedFromReporting: {
    label: "Excluded",
    tone: "neutral",
    description: "Marked in configuration as rendering outside page requests — email templates, sitemaps, feeds, scheduled jobs. Page-view sampling is blind to these by construction."
  },
  InsufficientData: {
    label: "Collecting",
    tone: "neutral",
    description: "Not enough traffic observed yet to say anything about this property."
  }
};
function P(e) {
  switch (b[e].tone) {
    case "positive":
      return "positive";
    case "danger":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "default";
  }
}
function n(e) {
  return new Intl.NumberFormat().format(e);
}
function h(e) {
  if (!e)
    return "—";
  const t = new Date(e);
  if (Number.isNaN(t.getTime()))
    return "—";
  const a = (r) => String(r).padStart(2, "0");
  return `${a(t.getDate())}-${a(t.getMonth() + 1)}-${t.getFullYear()}`;
}
var w = Object.defineProperty, y = Object.getOwnPropertyDescriptor, u = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? y(t, a) : t, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (i = (r ? d(t, a, i) : d(i)) || i);
  return r && i && w(t, a, i), i;
};
let o = class extends f(c) {
  render() {
    const e = this.status;
    return e ? e.enabled ? e.hasEnoughData ? l`
        <div class="collected">
          Based on ${n(e.eligibleViews)} page views over ${e.daysCollected}
          ${e.daysCollected === 1 ? "day" : "days"}, sampling ${Math.round(e.sampleRate * 100)}% of
          traffic. First observed ${h(e.firstObservedOn)}.
        </div>
      ` : l`
      <uui-box headline="Still collecting">
        <p class="lead">
          uPeek will not draw conclusions from a sample this small. Verdicts appear once it has
          watched ${e.minimumWindowDays} days and ${n(e.minimumObservedPageViews)}
          page views.
        </p>
        <uui-loader-bar progress=${e.progress}></uui-loader-bar>
        <dl>
          <div>
            <dt>Days collected</dt>
            <dd>${e.daysCollected} of ${e.minimumWindowDays}</dd>
          </div>
          <div>
            <dt>Page views seen</dt>
            <dd>${n(e.eligibleViews)} of ${n(e.minimumObservedPageViews)}</dd>
          </div>
          <div>
            <dt>Sampled and matched</dt>
            <dd>${n(e.sampledViews)}</dd>
          </div>
          <div>
            <dt>Waiting to be written</dt>
            <dd>${n(e.pendingFlush)}</dd>
          </div>
        </dl>
      </uui-box>
    ` : l`
        <uui-box>
          <div class="row">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
              <strong>Usage sampling is switched off.</strong>
              <p>
                uPeek's inspector works without it, but nothing can be said about which properties
                reach a page until sampling has watched some real traffic. Switch it on with
                <code>uPeek:Sampling:Enabled</code> in configuration.
              </p>
            </div>
          </div>
        </uui-box>
      ` : p;
  }
};
o.styles = [
  m`
      :host {
        display: block;
        margin-bottom: var(--uui-size-layout-1);
      }

      .row {
        display: flex;
        gap: var(--uui-size-space-4);
        align-items: flex-start;
      }

      .row uui-icon {
        color: var(--uui-color-warning-emphasis);
        margin-top: 2px;
      }

      .lead {
        margin-top: 0;
      }

      p {
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-4);
      }

      .collected {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        margin-bottom: var(--uui-size-space-4);
      }

      dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--uui-size-space-4);
        margin: var(--uui-size-space-5) 0 0;
      }

      dt {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      dd {
        margin: 0;
        font-weight: 700;
      }

      code {
        background: var(--uui-color-surface-alt);
        padding: 0 4px;
        border-radius: 3px;
      }
    `
];
u([
  g({ type: Object })
], o.prototype, "status", 2);
o = u([
  v("upeek-sampling-notice")
], o);
export {
  b as V,
  h as a,
  n as f,
  P as v
};
//# sourceMappingURL=upeek-sampling-notice.element-CalCqx9T.js.map
