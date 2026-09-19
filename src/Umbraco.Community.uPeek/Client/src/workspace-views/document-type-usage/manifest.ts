export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'uPeek Document Type Usage',
    alias: 'Umbraco.Community.uPeek.WorkspaceView.DocumentTypeUsage',
    type: 'workspaceView',
    js: () => import('./document-type-usage.element.js'),
    meta: {
      label: 'Usage',
      pathname: 'upeek-usage',
      icon: 'icon-search',
    },
    conditions: [
      {
        alias: 'Umb.Condition.WorkspaceAlias',
        match: 'Umb.Workspace.DocumentType',
      },
    ],
  },
];
