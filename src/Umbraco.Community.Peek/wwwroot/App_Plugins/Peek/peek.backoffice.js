const e = [
  {
    name: "Peek Entry Point",
    alias: "Umbraco.Community.Peek.EntryPoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-BzQCw5xL.js")
  }
], a = [
  {
    name: "Peek Reports Dashboard",
    alias: "Umbraco.Community.Peek.Dashboard",
    type: "dashboard",
    js: () => import("./peek-dashboard.element-DmFQffJk.js"),
    meta: {
      label: "Peek",
      pathname: "peek"
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
    name: "Peek Document Type Usage",
    alias: "Umbraco.Community.Peek.WorkspaceView.DocumentTypeUsage",
    type: "workspaceView",
    js: () => import("./document-type-usage.element-CHh9t12v.js"),
    meta: {
      label: "Usage",
      pathname: "peek-usage",
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
    name: "Peek Media Usage",
    alias: "Umbraco.Community.Peek.WorkspaceView.MediaUsage",
    type: "workspaceView",
    js: () => import("./media-usage.element-JzwP3ZAm.js"),
    meta: {
      label: "Used on",
      pathname: "peek-usage",
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
    name: "Peek Inspect On Site",
    alias: "Umbraco.Community.Peek.EntityAction.InspectOnSite",
    type: "entityAction",
    kind: "default",
    forEntityTypes: ["document"],
    api: () => import("./inspect-on-site.action-BpH-MJid.js"),
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
//# sourceMappingURL=peek.backoffice.js.map
