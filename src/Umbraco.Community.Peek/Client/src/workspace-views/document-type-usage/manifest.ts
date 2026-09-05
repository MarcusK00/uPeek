export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'Peek Document Type Usage',
    alias: 'Umbraco.Community.Peek.WorkspaceView.DocumentTypeUsage',
    type: 'workspaceView',
    js: () => import('./document-type-usage.element.js'),
    meta: {
      label: 'Usage',
      pathname: 'peek-usage',
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
