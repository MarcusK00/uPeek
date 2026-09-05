export const manifests: Array<UmbExtensionManifest> = [
  {
    name: 'Peek Entry Point',
    alias: 'Umbraco.Community.Peek.EntryPoint',
    type: 'backofficeEntryPoint',
    js: () => import('./entrypoint.js'),
  },
];
