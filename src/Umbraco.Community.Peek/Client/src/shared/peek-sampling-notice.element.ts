import { css, customElement, html, LitElement, nothing, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import type { PeekSamplingStatus } from '../api/types.js';
import { formatCount, formatDate } from './verdict.js';

/**
 * The state nobody designs: not enough data yet.
 *
 * When sampling has been running for three days, the report must refuse to render orphan verdicts
 * and show progress instead. Every report surface in Peek mounts this above its table, and hides the
 * verdict column entirely while `hasEnoughData` is false.
 */
@customElement('peek-sampling-notice')
export class PeekSamplingNoticeElement extends UmbElementMixin(LitElement) {
  @property({ type: Object })
  status?: PeekSamplingStatus;

  override render() {
    const status = this.status;
    if (!status) {
      return nothing;
    }

    if (!status.enabled) {
      return html`
        <uui-box>
          <div class="row">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
              <strong>Usage sampling is switched off.</strong>
              <p>
                Peek's inspector works without it, but nothing can be said about which properties
                reach a page until sampling has watched some real traffic. Switch it on with
                <code>Peek:Sampling:Enabled</code> in configuration.
              </p>
            </div>
          </div>
        </uui-box>
      `;
    }

    if (status.hasEnoughData) {
      return html`
        <div class="collected">
          Based on ${formatCount(status.eligibleViews)} page views over ${status.daysCollected}
          ${status.daysCollected === 1 ? 'day' : 'days'}, sampling ${Math.round(status.sampleRate * 100)}% of
          traffic. First observed ${formatDate(status.firstObservedOn)}.
        </div>
      `;
    }

    return html`
      <uui-box headline="Still collecting">
        <p class="lead">
          Peek will not draw conclusions from a sample this small. Verdicts appear once it has
          watched ${status.minimumWindowDays} days and ${formatCount(status.minimumObservedPageViews)}
          page views.
        </p>
        <uui-loader-bar progress=${status.progress}></uui-loader-bar>
        <dl>
          <div>
            <dt>Days collected</dt>
            <dd>${status.daysCollected} of ${status.minimumWindowDays}</dd>
          </div>
          <div>
            <dt>Page views seen</dt>
            <dd>${formatCount(status.eligibleViews)} of ${formatCount(status.minimumObservedPageViews)}</dd>
          </div>
          <div>
            <dt>Sampled and matched</dt>
            <dd>${formatCount(status.sampledViews)}</dd>
          </div>
          <div>
            <dt>Waiting to be written</dt>
            <dd>${formatCount(status.pendingFlush)}</dd>
          </div>
        </dl>
      </uui-box>
    `;
  }

  static override styles = [
    css`
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
    `,
  ];
}

export default PeekSamplingNoticeElement;

declare global {
  interface HTMLElementTagNameMap {
    'peek-sampling-notice': PeekSamplingNoticeElement;
  }
}
