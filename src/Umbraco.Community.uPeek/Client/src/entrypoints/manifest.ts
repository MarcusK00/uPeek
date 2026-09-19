export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'uPeek Entry Point',
    alias: 'Umbraco.Community.uPeek.EntryPoint',
    type: 'backofficeEntryPoint',
    js: () => import('./entrypoint.js'),
  },
];
