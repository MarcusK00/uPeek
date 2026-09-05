import { UmbEntityActionBase as r } from "@umbraco-cms/backoffice/entity-action";
import { UMB_NOTIFICATION_CONTEXT as a } from "@umbraco-cms/backoffice/notification";
import { UmbDocumentUrlRepository as c } from "@umbraco-cms/backoffice/document";
class h extends r {
  async execute() {
    const t = this.args.unique;
    if (!t)
      return;
    const o = new c(this), { data: s } = await o.requestUrls([t]), e = s?.[0]?.urls?.find((i) => i.url)?.url;
    if (!e) {
      (await this.getContext(a))?.peek("warning", {
        data: {
          headline: "Nothing to inspect",
          message: "This node has no published front-end URL. Publish it, or pick a node that renders a page."
        }
      });
      return;
    }
    const n = new URL(e, window.location.origin);
    n.searchParams.set("peek", "1"), window.open(n.toString(), "_blank", "noopener");
  }
}
export {
  h as PeekInspectOnSiteAction,
  h as api,
  h as default
};
//# sourceMappingURL=inspect-on-site.action-BpH-MJid.js.map
