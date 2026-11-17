export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'uPeek Media Usage',
    alias: 'Umbraco.Community.uPeek.WorkspaceView.MediaUsage',
    type: 'workspaceView',
    js: () => import('./media-usage.element.js'),
    meta: {
      label: 'Used on',
      pathname: 'upeek-usage',
      icon: 'icon-search',
    },
    conditions: [
      {
        alias: 'Umb.Condition.WorkspaceAlias',
        match: 'Umb.Workspace.Media',
      },
    ],
  },
];
