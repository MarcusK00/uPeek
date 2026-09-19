import { css, customElement, html, LitElement, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_ENTITY_CONTEXT } from '@umbraco-cms/backoffice/entity';
import { upeekApi } from '../../api/upeek-api.js';
import type { PeekDocumentTypeUsage, PeekPropertyUsage } from '../../api/types.js';
import { formatCount, VERDICTS, verdictColour } from '../../shared/verdict.js';
import '../../shared/upeek-sampling-notice.element.js';

/**
 * "Usage" tab on the document type workspace.
 *
 * This is the placement that sells the package: you are already staring at `seoKeywords` in the
 * doctype editor, and the tab next to Design tells you it has never rendered on any page.
 */
@customElement('peek-document-type-usage')
export class PeekDocumentTypeUsageElement extends UmbElementMixin(LitElement) {
  @state() private _usage?: PeekDocumentTypeUsage;
  @state() private _loading = true;
  @state() private _error?: string;
  @state() private _expanded = new Set<string>();

  #unique?: string;

  constructor() {
    super();

    this.consumeContext(UMB_ENTITY_CONTEXT, (context) => {
      this.observe(
        context?.unique,
        (unique) => {
          if (typeof unique === 'string' && unique !== this.#unique) {
            this.#unique = unique;
            void this.#load(unique);
          }
        },
        '_peekEntityUnique',
      );
    });
  }

  async #load(key: string): Promise<void> {
    this._loading = true;
    this._error = undefined;

    try {
      this._usage = await upeekApi.documentTypeUsage(key);
    } catch (error) {
      this._error =
        error instanceof Error ? error.message : 'uPeek could not load usage for this document type.';
    } finally {
      this._loading = false;
    }
  }

  #toggle(alias: string): void {
    const next = new Set(this._expanded);
    if (next.has(alias)) {
      next.delete(alias);
    } else {
      next.add(alias);
    }

    this._expanded = next;
  }

  override render() {
    if (this._loading) {
      return html`<uui-loader-bar></uui-loader-bar>`;
    }

    if (this._error) {
      return html`<uui-box><p class="error">${this._error}</p></uui-box>`;
    }

    if (!this._usage) {
      return nothing;
    }

    return html`
      <upeek-sampling-notice .status=${this._usage.sampling}></upeek-sampling-notice>

      <uui-box headline="Property usage">
        <div slot="header-actions">
          <span class="muted">${this._usage.properties.length} properties</span>
        </div>
        ${this.#renderTable()}
      </uui-box>
    `;
  }

  #renderTable() {
    const usage = this._usage!;
    const showVerdicts = usage.sampling.hasEnoughData;

    if (usage.properties.length === 0) {
      return html`<p class="muted">This document type has no properties of its own.</p>`;
    }

    return html`
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Editor</th>
            <th class="num">Observed</th>
            <th class="num">Rendered</th>
            <th>${showVerdicts ? 'Verdict' : 'Status'}</th>
          </tr>
        </thead>
        <tbody>
          ${usage.properties.map((property) => this.#renderRow(property, showVerdicts))}
        </tbody>
      </table>
    `;
  }

  #renderRow(property: PeekPropertyUsage, showVerdicts: boolean) {
    const presentation = VERDICTS[property.verdict];
    const open = this._expanded.has(property.propertyAlias);
    const hasCultures = property.cultures.length > 0;

    return html`
      <tr
        class=${property.verdict === 'HasContentNeverObserved' ? 'flagged' : ''}
        @click=${() => hasCultures && this.#toggle(property.propertyAlias)}
      >
        <td>
          <div class="alias">${property.propertyAlias}</div>
          <div class="muted">${property.propertyName ?? ''}</div>
        </td>
        <td class="muted mono">${property.editorAlias?.replace('Umbraco.', '') ?? '—'}</td>
        <td class="num">${formatCount(property.totalObserved)}</td>
        <td class="num">${formatCount(property.totalRendered)}</td>
        <td>
          <uui-tag color=${verdictColour(property.verdict)} look="secondary" title=${presentation.description}>
            ${showVerdicts ? presentation.label : VERDICTS.InsufficientData.label}
          </uui-tag>
          ${property.variesByCulture ? html`<uui-tag look="outline" class="vary">varies</uui-tag>` : nothing}
        </td>
      </tr>
      ${open ? this.#renderCultures(property) : nothing}
    `;
  }

  /**
   * Per-culture breakdown, always available rather than a nice-to-have. On a Danish multilingual
   * site "renders on da-DK but never on en-GB" is a real and common finding, and collapsing it into
   * a single count would hide exactly the thing worth knowing.
   */
  #renderCultures(property: PeekPropertyUsage) {
    return html`
      <tr class="detail">
        <td colspan="5">
          <table class="inner">
            <tbody>
              ${property.cultures.map(
                (culture) => html`
                  <tr>
                    <td class="mono">${culture.culture || 'invariant'}</td>
                    <td class="num">${formatCount(culture.observedCount)} observed</td>
                    <td class="num">${formatCount(culture.renderedCount)} rendered</td>
                    <td class="num muted">${formatCount(culture.emptyCount)} empty</td>
                    <td>
                      <uui-tag
                        color=${verdictColour(culture.verdict)}
                        look="secondary"
                        title=${VERDICTS[culture.verdict].description}
                      >
                        ${VERDICTS[culture.verdict].label}
                      </uui-tag>
                    </td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </td>
      </tr>
    `;
  }

  static override styles = [
    css`
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
    `,
  ];
}

export default PeekDocumentTypeUsageElement;

declare global {
  interface HTMLElementTagNameMap {
    'peek-document-type-usage': PeekDocumentTypeUsageElement;
  }
}
