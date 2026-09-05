import { UmbEntityActionBase } from '@umbraco-cms/backoffice/entity-action';
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';
import { UmbDocumentUrlRepository } from '@umbraco-cms/backoffice/document';

/**
 * "Inspect on site" — opens the front end with inspect mode already armed.
 *
 * The `?peek=1` marker is read by the overlay bootstrap on load. It is a convenience, not a security
 * boundary: the overlay is only ever injected for an authenticated backoffice user with content
 * access, so the parameter cannot arm anything for anyone else.
 */
export class PeekInspectOnSiteAction extends UmbEntityActionBase<never> {
  override async execute(): Promise<void> {
    const unique = this.args.unique;
    if (!unique) {
      return;
    }

    const repository = new UmbDocumentUrlRepository(this);
    const { data } = await repository.requestUrls([unique]);

    // Prefer a culture-specific URL; fall back to the first one the node has at all.
    const url = data?.[0]?.urls?.find((candidate) => candidate.url)?.url;

    if (!url) {
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek('warning', {
        data: {
          headline: 'Nothing to inspect',
          message:
            'This node has no published front-end URL. Publish it, or pick a node that renders a page.',
        },
      });
      return;
    }

    const target = new URL(url, window.location.origin);
    target.searchParams.set('peek', '1');
    window.open(target.toString(), '_blank', 'noopener');
  }
}

export { PeekInspectOnSiteAction as api };
export default PeekInspectOnSiteAction;
