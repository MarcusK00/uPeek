import { defineConfig } from 'vite';

/**
 * Two bundles out of one source tree:
 *
 *   upeek.backoffice.js  loaded by umbraco-package.json inside the backoffice. Treats everything
 *                       under @umbraco-cms as external, because the backoffice already provides it.
 *
 *   upeek.overlay.js     injected into the public site by PeekOverlayMiddleware. Deliberately has no
 *                       dependencies at all — not even Lit. It is injected into somebody else's
 *                       page, where a framework is a collision waiting to happen, so it is plain
 *                       DOM inside a shadow root.
 */
export default defineConfig({
  build: {
    lib: {
      entry: {
        'upeek.backoffice': 'src/bundle.manifests.ts',
        'upeek.overlay': 'src/overlay/index.ts',
      },
      formats: ['es'],
    },
    outDir: '../wwwroot/App_Plugins/uPeek',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco/],
    },
  },
});
