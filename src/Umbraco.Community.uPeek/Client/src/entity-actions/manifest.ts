export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'uPeek Inspect On Site',
    alias: 'Umbraco.Community.uPeek.EntityAction.InspectOnSite',
    type: 'entityAction',
    kind: 'default',
    forEntityTypes: ['document'],
    api: () => import('./inspect-on-site.action.js'),
    weight: 100,
    meta: {
      icon: 'icon-search',
      label: 'Inspect on site',
    },
  },
];
