import { PEEK_API_BASE } from '../constants.js';
import type {
  PeekDocumentTypeUsage,
  PeekMediaUsage,
  PeekOrphanReport,
  PeekReverseLookup,
  PeekSamplingStatus,
} from './types.js';

/**
 * A very small typed client for Peek's Management API.
 *
 * The backoffice entry point installs a token provider on start-up; every call then carries a
 * current bearer token. This is the same token the generated `@hey-api` clients use — Peek just
 * does not need the ~40 generated files to make five GET requests.
 */

type TokenProvider = () => Promise<string>;

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export class PeekApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PeekApiError';
  }
}

async function get<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
  if (!tokenProvider) {
    throw new PeekApiError('Peek API called before the backoffice entry point initialised it.', 0);
  }

  const url = new URL(`${PEEK_API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const token = await tokenProvider();

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new PeekApiError(`Peek API returned ${response.status} for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export const peekApi = {
  status: () => get<PeekSamplingStatus>('/status'),

  documentTypeUsage: (key: string) => get<PeekDocumentTypeUsage>(`/document-type/${key}/usage`),

  mediaUsage: (key: string) => get<PeekMediaUsage>(`/media/${key}/usage`),

  orphans: () => get<PeekOrphanReport>('/report/orphans'),

  reverseLookup: (contentTypeKey: string, propertyAlias: string, culture?: string) =>
    get<PeekReverseLookup>('/report/reverse-lookup', { contentTypeKey, propertyAlias, culture }),
};
