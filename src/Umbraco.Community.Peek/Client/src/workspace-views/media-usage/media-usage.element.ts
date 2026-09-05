import { css, customElement, html, LitElement, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_ENTITY_CONTEXT } from '@umbraco-cms/backoffice/entity';
import { peekApi } from '../../api/peek-api.js';
import type { PeekMediaUsage } from '../../api/types.js';
import '../../shared/peek-sampling-notice.element.js';

/**
 * "Used on" tab on the media workspace — the cheapest surface to build and the easiest to demo,
 * because it closes a support ticket that currently has no answer at all: can I delete this?
 *
 * Note this view leans on Umbraco's own relation tracking rather than on render sampling. That makes
 * it exact: if nothing references the item, nothing in the content tree points at it. Sampling would
 * only ever be able to say "not seen recently", which is a much weaker claim.
 */
@customElement('peek-media-usage')
export class PeekMediaUsageElement extends UmbElementMixin(LitElement) {
  @state() private _usage?: PeekMediaUsage;
  @state() private _loading = true;
  @state() private _error?: string;

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
        '_peekMediaUnique',
      );
    });
  }

  async #load(key: string): Promise<void> {
    this._loading = true;
    this._error = undefined;

    try {
      this._usage = await peekApi.mediaUsage(key);
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Peek could not load usage for this item.';
    } finally {
      this._loading = false;
    }
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

    return this._usage.isReferenced ? this.#renderReferences() : this.#renderUnreferenced();
  }

  #renderReferences() {
    const usage = this._usage!;

    return html`
      <uui-box headline="Used on ${usage.referencedBy.length} ${usage.referencedBy.length === 1 ? 'item' : 'items'}">
        <p class="lead">
          These are hard references from Umbraco's relation tracking, so the list is exact rather
          than sampled. Deleting this item will leave each of them with an empty picker.
        </p>
        <uui-ref-list>
          ${usage.referencedBy.map(
            (reference) => html`
              <uui-ref-node
                name=${reference.name ?? '(no name)'}
                detail=${reference.contentTypeName ?? reference.contentTypeAlias ?? ''}
                href=${reference.editUrl ?? '#'}
                target="_blank"
              >
                <uui-icon slot="icon" name=${reference.contentTypeIcon ?? 'icon-document'}></uui-icon>
                ${reference.published === false
                  ? html`<uui-tag slot="tag" color="warning" look="secondary">unpublished</uui-tag>`
                  : nothing}
              </uui-ref-node>
            `,
          )}
        </uui-ref-list>
      </uui-box>
    `;
  }

  #renderUnreferenced() {
    return html`
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
  }

  static override styles = [
    css`
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
    `,
  ];
}

export default PeekMediaUsageElement;

declare global {
  interface HTMLElementTagNameMap {
    'peek-media-usage': PeekMediaUsageElement;
  }
}
