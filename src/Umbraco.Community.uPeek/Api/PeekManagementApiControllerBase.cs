using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Common.Filters;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Cms.Web.Common.Routing;

namespace Umbraco.Community.uPeek.Api;

/// <summary>
///     Base for the backoffice-facing half of uPeek's API: the usage views, the reports and the
///     reverse lookup. Authenticated the way every Management API endpoint is — bearer token issued
///     to the backoffice SPA.
/// </summary>
/// <remarks>
///     The front-end overlay cannot use these endpoints, because it runs on the public site and has
///     no backoffice token. It talks to <see cref="Inspection.PeekInspectorController" /> instead,
///     which authenticates against the backoffice cookie. See docs/ARCHITECTURE.md.
/// </remarks>
[ApiController]
[BackOfficeRoute(PeekConstants.ApiName + "/api/v{version:apiVersion}")]
[Authorize(Policy = AuthorizationPolicies.SectionAccessContentOrMedia)]
[MapToApi(PeekConstants.ApiName)]
[JsonOptionsName(Umbraco.Cms.Core.Constants.JsonOptionsNames.BackOffice)]
public abstract class PeekManagementApiControllerBase : ControllerBase
{
}
