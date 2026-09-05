export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'Peek Media Usage',
    alias: 'Umbraco.Community.Peek.WorkspaceView.MediaUsage',
    type: 'workspaceView',
    js: () => import('./media-usage.element.js'),
    meta: {
      label: 'Used on',
      pathname: 'peek-usage',
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
