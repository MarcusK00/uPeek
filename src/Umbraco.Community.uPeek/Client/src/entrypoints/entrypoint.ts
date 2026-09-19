import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from '@umbraco-cms/backoffice/extension-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { setTokenProvider } from '../api/upeek-api.js';
import { UPEEK_QUERY } from '../constants.js';

/**
 * Backoffice entry point.
 *
 * Two jobs: give the uPeek API client a way to get a bearer token, and land the deep links the
 * overlay produces on the right property rather than merely on the right node.
 */

let stopDeepLinkWatcher: (() => void) | undefined;

export const onInit: UmbEntryPointOnInit = async (host) => {
  const authContext = await host.getContext(UMB_AUTH_CONTEXT);

  if (authContext) {
    setTokenProvider(() => authContext.getLatestToken());
  } else {
    console.warn('[uPeek] UMB_AUTH_CONTEXT was unavailable; uPeek reports will not be able to load.');
  }

  stopDeepLinkWatcher = startDeepLinkWatcher();
};

export const onUnload: UmbEntryPointOnUnload = () => {
  stopDeepLinkWatcher?.();
  stopDeepLinkWatcher = undefined;
};

/**
 * Deep-link handling.
 *
 * `PeekBackofficeUrls` appends `?upeekProperty=…&upeekCulture=…` to a workspace URL. The backoffice is
 * a client-side-routed SPA, so there is no load event to hook: the workspace hydrates some time
 * after the URL changes. This watches for the parameter, waits for a matching property element to
 * appear, then scrolls it into view and pulses it.
 *
 * Highlighting the field is the whole point. Getting a user to the node is what an edit link already
 * does; getting their eye to the right field on a doctype with forty properties is the part that
 * saves time.
 */
function startDeepLinkWatcher(): () => void {
  let lastHandled = '';
  let cancelled = false;

  const tick = () => {
    if (cancelled) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const alias = params.get(UPEEK_QUERY.property);

    if (alias && `${window.location.pathname}?${alias}` !== lastHandled) {
      lastHandled = `${window.location.pathname}?${alias}`;
      void focusProperty(alias);
    }
  };

  const interval = window.setInterval(tick, 400);
  window.addEventListener('popstate', tick);
  tick();

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    window.removeEventListener('popstate', tick);
  };
}

const PULSE_STYLE_ID = 'peek-pulse-style';
const PULSE_CSS = `
@keyframes peek-pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(53, 68, 177, 0.55); }
  70%  { box-shadow: 0 0 0 12px rgba(53, 68, 177, 0); }
  100% { box-shadow: 0 0 0 0 rgba(53, 68, 177, 0); }
}
.peek-pulse {
  animation: peek-pulse-ring 1.1s ease-out 3;
  border-radius: 6px;
}
`;

async function focusProperty(alias: string): Promise<void> {
  const element = await waitForProperty(alias);
  if (!element) {
    return;
  }

  if (!document.getElementById(PULSE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = PULSE_STYLE_ID;
    style.textContent = PULSE_CSS;
    document.head.append(style);
  }

  element.scrollIntoView({ block: 'center', behavior: 'smooth' });
  element.classList.add('peek-pulse');
  window.setTimeout(() => element.classList.remove('peek-pulse'), 4000);
}

/**
 * Polls for the property element. A MutationObserver would be tidier, but the backoffice renders
 * properties inside nested shadow roots, and a single observer cannot see across those boundaries.
 */
function waitForProperty(alias: string, timeoutMs = 8000): Promise<HTMLElement | undefined> {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const attempt = () => {
      const found = findInShadowRoots(document.body, `[data-mark="property:${alias}"], [alias="${alias}"]`);
      if (found) {
        resolve(found);
        return;
      }

      if (Date.now() > deadline) {
        resolve(undefined);
        return;
      }

      window.setTimeout(attempt, 200);
    };

    attempt();
  });
}

function findInShadowRoots(root: ParentNode, selector: string, depth = 0): HTMLElement | undefined {
  if (depth > 12) {
    return undefined;
  }

  const direct = root.querySelector<HTMLElement>(selector);
  if (direct) {
    return direct;
  }

  for (const element of root.querySelectorAll('*')) {
    if (element.shadowRoot) {
      const found = findInShadowRoots(element.shadowRoot, selector, depth + 1);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}
