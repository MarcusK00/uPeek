const e = [
  {
    name: "uPeek Entry Point",
    alias: "Umbraco.Community.uPeek.EntryPoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-BXy3AV1G.js")
  }
], a = [
  {
    name: "uPeek Reports Dashboard",
    alias: "Umbraco.Community.uPeek.Dashboard",
    type: "dashboard",
    js: () => import("./upeek-dashboard.element-DGVJAlPO.js"),
    meta: {
      label: "uPeek",
      pathname: "upeek"
    },
    conditions: [
      {
        // Settings, not a section of its own. The reports belong next to the content model they
        // describe, and a new icon in the left rail is a permanent tax on everyone's attention.
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Settings"
      }
    ]
  }
], t = [
  {
    name: "uPeek Document Type Usage",
    alias: "Umbraco.Community.uPeek.WorkspaceView.DocumentTypeUsage",
    type: "workspaceView",
    js: () => import("./document-type-usage.element-a3QMx3fQ.js"),
    meta: {
      label: "Usage",
      pathname: "upeek-usage",
      icon: "icon-search"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Umb.Workspace.DocumentType"
      }
    ]
  }
], i = [
  {
    name: "uPeek Media Usage",
    alias: "Umbraco.Community.uPeek.WorkspaceView.MediaUsage",
    type: "workspaceView",
    js: () => import("./media-usage.element-Bxjr-Lu1.js"),
    meta: {
      label: "Used on",
      pathname: "upeek-usage",
      icon: "icon-search"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Umb.Workspace.Media"
      }
    ]
  }
], n = [
  {
    name: "uPeek Inspect On Site",
    alias: "Umbraco.Community.uPeek.EntityAction.InspectOnSite",
    type: "entityAction",
    kind: "default",
    forEntityTypes: ["document"],
    api: () => import("./inspect-on-site.action-BJg6POtk.js"),
    weight: 100,
    meta: {
      icon: "icon-search",
      label: "Inspect on site"
    }
  }
], o = [
  ...e,
  ...a,
  ...t,
  ...i,
  ...n
];
export {
  o as manifests
};
//# sourceMappingURL=upeek.backoffice.js.map
