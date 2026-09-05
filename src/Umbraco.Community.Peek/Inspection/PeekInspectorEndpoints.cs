using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Community.Peek.Configuration;
using Umbraco.Community.Peek.Reporting;

namespace Umbraco.Community.Peek.Inspection;

/// <summary>
///     The front-end inspector API, called by the overlay running on the public site.
/// </summary>
/// <remarks>
///     <para>
///         These are minimal-API endpoints rather than MVC controllers, for two reasons. Umbraco does
///         not call <c>MapControllers()</c>, so an attribute-routed controller registered by a
///         package is simply never reachable; and calling it from a package would risk
///         double-mapping every attribute-routed controller in the host application.
///     </para>
///     <para>
///         This is also deliberately NOT part of the Management API. The overlay lives on the public
///         site, where the backoffice bearer token does not exist but the backoffice auth cookie does
///         (Umbraco issues it with <c>Path=/</c>). So these endpoints authorise through
///         <see cref="IPeekAuthorizer" />, which validates that cookie and then checks real section
///         access — not merely "has a session".
///     </para>
/// </remarks>
public static class PeekInspectorEndpoints
{
    public static void MapPeekInspector(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup(PeekConstants.InspectorRoutes.Base)
            .WithTags(PeekConstants.PackageName)
            .ExcludeFromDescription();

        group.MapGet("/manifest", ManifestAsync);
        group.MapGet("/usage", UsageAsync);
    }

    /// <summary>Everything Peek knows about one page.</summary>
    private static async Task<IResult> ManifestAsync(
        HttpContext context,
        IPeekAuthorizer authorizer,
        IPeekManifestService manifestService,
        IOptionsMonitor<PeekOptions> options,
        Guid key,
        string? culture = null,
        string? segment = null,
        bool preview = false)
    {
        // 404 rather than 401 throughout: an anonymous visitor should not be able to learn that Peek
        // is installed, let alone probe it for content keys.
        if (options.CurrentValue.Inspector.Enabled is false)
        {
            return Results.NotFound();
        }

        if (await authorizer.AuthorizeAsync(context) is null)
        {
            return Results.NotFound();
        }

        var manifest = await manifestService.BuildAsync(key, culture, segment, preview);
        if (manifest is null)
        {
            return Results.NotFound();
        }

        context.Response.Headers.CacheControl = "no-store";
        return Results.Ok(manifest);
    }

    /// <summary>
    ///     Hard references to a node, for the overlay's "shared — used on N pages" badge. Surfaced at
    ///     the point of confusion rather than buried in a backoffice report, because "edit this and
    ///     you change 12 pages" is the single most expensive misunderstanding on a modern Umbraco
    ///     site.
    /// </summary>
    private static async Task<IResult> UsageAsync(
        HttpContext context,
        IPeekAuthorizer authorizer,
        IPeekReportService reportService,
        Guid key,
        string? entityType = null)
    {
        if (await authorizer.AuthorizeAsync(context) is null)
        {
            return Results.NotFound();
        }

        var objectType = string.Equals(entityType, "media", StringComparison.OrdinalIgnoreCase)
            ? UmbracoObjectTypes.Media
            : UmbracoObjectTypes.Document;

        context.Response.Headers.CacheControl = "no-store";
        return Results.Ok(await reportService.GetReferencesAsync(key, objectType));
    }
}
