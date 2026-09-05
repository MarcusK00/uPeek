/**
 * Names shared with the C# side. The counterpart is `PeekConstants.cs`; changing one without the
 * other is the classic way to ship a package that works on the author's machine only.
 */

export const PEEK_ALIAS = 'Umbraco.Community.Peek';

/** Management API base. Mirrors `[BackOfficeRoute("peek/api/v{version:apiVersion}")]`. */
export const PEEK_API_BASE = '/umbraco/peek/api/v1';

/** Front-end inspector routes, mirroring `PeekConstants.InspectorRoutes`. */
export const PEEK_INSPECT_BASE = '/umbraco/peek/inspect';

/** Query parameters `PeekBackofficeUrls` appends to a workspace deep link. */
export const PEEK_QUERY = {
  property: 'peekProperty',
  culture: 'peekCulture',
} as const;

/** Workspace view aliases, referenced by `PeekBackofficeUrls.DocumentTypeUsage` / `MediaUsage`. */
export const PEEK_VIEW_PATHNAME = 'peek-usage';
