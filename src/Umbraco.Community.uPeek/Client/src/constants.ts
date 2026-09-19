/**
 * Names shared with the C# side. The counterpart is `PeekConstants.cs`; changing one without the
 * other is the classic way to ship a package that works on the author's machine only.
 */

export const UPEEK_ALIAS = 'Umbraco.Community.uPeek';

/** Management API base. Mirrors `[BackOfficeRoute("upeek/api/v{version:apiVersion}")]`. */
export const UPEEK_API_BASE = '/umbraco/upeek/api/v1';

/** Front-end inspector routes, mirroring `PeekConstants.InspectorRoutes`. */
export const UPEEK_INSPECT_BASE = '/umbraco/upeek/inspect';

/** Query parameters `PeekBackofficeUrls` appends to a workspace deep link. */
export const UPEEK_QUERY = {
  property: 'upeekProperty',
  culture: 'upeekCulture',
} as const;

/** Workspace view aliases, referenced by `PeekBackofficeUrls.DocumentTypeUsage` / `MediaUsage`. */
export const UPEEK_VIEW_PATHNAME = 'upeek-usage';
