import { manifests as entrypoints } from './entrypoints/manifest.js';
import { manifests as dashboards } from './dashboards/manifest.js';
import { manifests as documentTypeUsage } from './workspace-views/document-type-usage/manifest.js';
import { manifests as mediaUsage } from './workspace-views/media-usage/manifest.js';
import { manifests as entityActions } from './entity-actions/manifest.js';

/**
 * Collates every backoffice manifest Peek registers. Loaded from `umbraco-package.json`.
 *
 * Four surfaces, each placed where the question is already being asked:
 *   - Document Type workspace -> "Usage"    (why is nobody seeing seoKeywords?)
 *   - Media workspace         -> "Used on"  (can I delete this?)
 *   - Settings dashboard      -> reports    (what is dead across the whole site?)
 *   - Content entity action   -> inspect    (show me this page with Peek armed)
 */
export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...dashboards,
  ...documentTypeUsage,
  ...mediaUsage,
  ...entityActions,
];
