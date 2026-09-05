export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'Peek Reports Dashboard',
    alias: 'Umbraco.Community.Peek.Dashboard',
    type: 'dashboard',
    js: () => import('./peek-dashboard.element.js'),
    meta: {
      label: 'Peek',
      pathname: 'peek',
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
