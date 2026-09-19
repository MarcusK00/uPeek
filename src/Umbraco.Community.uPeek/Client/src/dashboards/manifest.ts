export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'uPeek Reports Dashboard',
    alias: 'Umbraco.Community.uPeek.Dashboard',
    type: 'dashboard',
    js: () => import('./upeek-dashboard.element.js'),
    meta: {
      label: 'uPeek',
      pathname: 'upeek',
    },
    conditions: [
      {
        // Settings, not a section of its own. The reports belong next to the content model they
        // describe, and a new icon in the left rail is a permanent tax on everyone's attention.
        alias: 'Umb.Condition.SectionAlias',
        match: 'Umb.Section.Settings',
      },
    ],
  },
];
