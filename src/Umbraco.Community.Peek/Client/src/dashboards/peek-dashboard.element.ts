import { css, customElement, html, LitElement, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { peekApi } from '../api/peek-api.js';
import type { PeekOrphanReport, PeekOrphanRow, PeekReverseLookup } from '../api/types.js';
import { formatCount, formatDate, VERDICTS, verdictColour } from '../shared/verdict.js';
import '../shared/peek-sampling-notice.element.js';

/**
 * The Settings dashboard: site-wide reports, with reverse lookup as the centrepiece.
 *
 * Deliberately not a new backoffice section. The reports belong where the question is already being
 * asked — on the doctype, on the media item — and a section icon in the left rail is a permanent tax
 * on everyone's attention for something most people open twice a year.
 */
@customElement('peek-dashboard')
export class PeekDashboardElement extends UmbElementMixin(LitElement) {
  @state() private _report?: PeekOrphanReport;
  @state() private _loading = true;
  @state() private _error?: string;
  @state() private _lookup?: PeekReverseLookup;
  @state() private _lookupFor?: PeekOrphanRow;
  @state() private _lookupLoading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.#load();
  }

  async #load(): Promise<void> {
    this._loading = true;
    this._error = undefined;

    try {
      this._report = await peekApi.orphans();
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Peek could not load the report.';
    } finally {
      this._loading = false;
    }
  }

  async #lookUp(row: PeekOrphanRow): Promise<void> {
    this._lookupFor = row;
    this._lookupLoading = true;
    this._lookup = undefined;

    try {
      this._lookup = await peekApi.reverseLookup(row.contentTypeKey, row.propertyAlias);
    } catch {
      this._lookup = undefined;
    } finally {
      this._lookupLoading = false;
    }
  }

  override render() {
    if (this._loading) {
      return html`<uui-loader-bar></uui-loader-bar>`;
    }

    if (this._error) {
      return html`<uui-box><p class="error">${this._error}</p></uui-box>`;
    }

    if (!this._report) {
      return nothing;
    }

    return html`
      <div class="intro">
        <h2>Content usage</h2>
        <p>
          Which properties on this site actually reach a page, and which ones editors have been
          filling in for nobody. Everything below is evidence from observed traffic — Peek reports
          what it saw, and never tells you to delete anything.
        </p>
      </div>

      <peek-sampling-notice .status=${this._report.sampling}></peek-sampling-notice>

      ${this.#renderSummary()} ${this.#renderTable()} ${this.#renderLookup()}
    `;
  }

  #renderSummary() {
    const rows = this._report!.rows;
    const counts = {
      dead: rows.filter((r) => r.verdict === 'HasContentNeverObserved').length,
      empty: rows.filter((r) => r.verdict === 'AlwaysEmpty').length,
      excluded: rows.filter((r) => r.verdict === 'ExcludedFromReporting').length,
      rendering: rows.filter((r) => r.verdict === 'Rendering').length,
    };

    return html`
      <div class="stats">
        ${this.#stat(counts.dead, 'have content and never rendered', 'danger')}
        ${this.#stat(counts.empty, 'were never filled in at all', 'warning')}
        ${this.#stat(counts.rendering, 'confirmed rendering', 'positive')}
        ${this.#stat(counts.excluded, 'excluded from reporting', 'default')}
      </div>
    `;
  }

  #stat(value: number, label: string, tone: string) {
    return html`
      <div class="stat" data-tone=${tone}>
        <div class="stat-value">${formatCount(value)}</div>
        <div class="stat-label">${label}</div>
      </div>
    `;
  }

  #renderTable() {
    const report = this._report!;
    const showVerdicts = report.sampling.hasEnoughData;

    if (report.rows.length === 0) {
      return html`
        <uui-box headline="Nothing observed yet">
          <p class="muted">
            Peek has not recorded a single page view. Check that
            <code>Peek:Sampling:Enabled</code> is true and that the site is receiving front-end
            traffic.
          </p>
        </uui-box>
      `;
    }

    return html`
      <uui-box headline="Every observed property">
        <table>
          <thead>
            <tr>
              <th>Document type</th>
              <th>Property</th>
              <th class="num">Observed</th>
              <th class="num">Rendered</th>
              <th>Dead cultures</th>
              <th>${showVerdicts ? 'Verdict' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${report.rows.map((row) => this.#renderRow(row, showVerdicts))}
          </tbody>
        </table>
      </uui-box>
    `;
  }

  #renderRow(row: PeekOrphanRow, showVerdicts: boolean) {
    const presentation = VERDICTS[row.verdict];

    return html`
      <tr class=${row.verdict === 'HasContentNeverObserved' ? 'flagged' : ''}>
        <td>
          <uui-icon name=${row.contentTypeIcon ?? 'icon-document'}></uui-icon>
          <span class="mono">${row.contentTypeAlias}</span>
        </td>
        <td class="mono strong">${row.propertyAlias}</td>
        <td class="num">${formatCount(row.observedCount)}</td>
        <td class="num">${formatCount(row.renderedCount)}</td>
        <td class="mono muted">${row.deadCultures.length > 0 ? row.deadCultures.join(', ') : '—'}</td>
        <td>
          <uui-tag color=${verdictColour(row.verdict)} look="secondary" title=${presentation.description}>
            ${showVerdicts ? presentation.label : VERDICTS.InsufficientData.label}
          </uui-tag>
        </td>
        <td class="actions">
          <uui-button
            compact
            look="secondary"
            label="Where does it render?"
            @click=${() => this.#lookUp(row)}
          ></uui-button>
          ${row.usageUrl
            ? html`<uui-button compact look="secondary" label="Open type" href=${row.usageUrl}></uui-button>`
            : nothing}
        </td>
      </tr>
    `;
  }

  /**
   * Reverse lookup: pick a property, get every URL where it was observed rendering. This is the
   * "can I safely delete this?" question answered from the other direction, and it is the reason
   * the render-location table exists at all.
   */
  #renderLookup() {
    if (!this._lookupFor) {
      return nothing;
    }

    const row = this._lookupFor;

    return html`
      <uui-box headline="Where ${row.contentTypeAlias}.${row.propertyAlias} renders">
        <uui-button
          slot="header-actions"
          compact
          look="secondary"
          label="Close"
          @click=${() => {
            this._lookupFor = undefined;
            this._lookup = undefined;
          }}
        ></uui-button>

        ${this._lookupLoading
          ? html`<uui-loader-bar></uui-loader-bar>`
          : !this._lookup || this._lookup.locations.length === 0
            ? html`
                <p class="muted">
                  No observed renders. That is consistent with the verdict above, and it is still
                  only what sampling saw — a page nobody visited during the window contributes
                  nothing here.
                </p>
              `
            : html`
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
                      (location) => html`
                        <tr>
                          <td class="mono">${location.url}</td>
                          <td class="mono muted">${location.culture || 'invariant'}</td>
                          <td class="num">${formatCount(location.seenCount)}</td>
                          <td class="muted">${formatDate(location.lastSeen)}</td>
                          <td class="actions">
                            ${location.editUrl
                              ? html`<uui-button
                                  compact
                                  look="secondary"
                                  label="Edit"
                                  href=${location.editUrl}
                                ></uui-button>`
                              : nothing}
                            <uui-button
                              compact
                              look="secondary"
                              label="Inspect"
                              href="${location.url}?peek=1"
                              target="_blank"
                            ></uui-button>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `}
      </uui-box>
    `;
  }

  static override styles = [
    css`
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
    `,
  ];
}

export default PeekDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    'peek-dashboard': PeekDashboardElement;
  }
}
