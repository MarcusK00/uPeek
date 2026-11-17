import { PeekOverlay } from './overlay.js';
import type { PeekBootstrap } from './types.js';

/**
 * Front-end entry point.
 *
 * This file is only ever loaded because `PeekOverlayMiddleware` decided the current request belongs
 * to an authenticated backoffice user with content access. An anonymous visitor never receives the
 * script tag, so there is nothing here to guard beyond a sanity check on the bootstrap payload.
 */

const BOOTSTRAP_ID = 'upeek-bootstrap';
const SUPPORTED_VERSION = 1;

function readBootstrap(): PeekBootstrap | null {
  const element = document.getElementById(BOOTSTRAP_ID);
  if (!element?.textContent) {
    return null;
  }

  try {
    const bootstrap = JSON.parse(element.textContent) as PeekBootstrap;
    if (bootstrap.version !== SUPPORTED_VERSION) {
      // A cached overlay against a newer server. Fail loudly rather than render nonsense.
      console.warn(
        `[uPeek] bootstrap version ${bootstrap.version} is not supported by this overlay (expected ${SUPPORTED_VERSION}). Hard-refresh to pick up the current build.`,
      );
      return null;
    }

    return bootstrap;
  } catch (error) {
    console.warn('[uPeek] could not parse the bootstrap payload.', error);
    return null;
  }
}

function start(): void {
  const bootstrap = readBootstrap();
  if (!bootstrap) {
    return;
  }

  const overlay = new PeekOverlay(bootstrap);

  // Deep link from the backoffice entity action: /some-page?upeek=1 arms inspect mode on arrival.
  if (new URLSearchParams(window.location.search).get('upeek') !== null) {
    void overlay.arm();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
