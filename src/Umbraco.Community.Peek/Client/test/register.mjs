import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

/**
 * Lets Node run the overlay sources directly under `node --test`.
 *
 * The source uses `./thing.js` in relative imports — the convention the Umbraco extension template
 * ships, and what the bundler expects — but on disk the file is `./thing.ts`. Vite rewrites this at
 * build time; Node does not, so this hook does the same mapping for the test run. Node strips the
 * TypeScript types itself, so there is no transpile step to keep in sync.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL) {
      const candidate = new URL(`${specifier.slice(0, -3)}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(candidate.href, context);
      }
    }

    return nextResolve(specifier, context);
  },
});
