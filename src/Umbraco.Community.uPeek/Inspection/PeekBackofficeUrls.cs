using Constants = Umbraco.Cms.Core.Constants;

namespace Umbraco.Community.uPeek.Inspection;

/// <summary>
///     Every backoffice deep link uPeek produces is built here, so that when the backoffice changes
///     its client-side route shape there is exactly one file to fix.
/// </summary>
/// <remarks>
///     <para>
///         The <c>peek*</c> query parameters are read by the uPeek backoffice entry point, which
///         waits for the workspace to hydrate, switches to the right variant and tab, scrolls the
///         property into view and pulses it. Without them the link only gets you to the node, which
///         is the level of help that already exists in the ecosystem.
///     </para>
///     <para>
///         The backoffice path is <c>Constants.System.UmbracoPathSegment</c> rather than a setting:
///         as of Umbraco 14 the backoffice is a SPA served from a fixed path, and the old
///         <c>Global:UmbracoPath</c> knob is gone.
///     </para>
/// </remarks>
public sealed class PeekBackofficeUrls
{
    private const string BackofficePath = "/" + Constants.System.UmbracoPathSegment;

    public string DocumentWorkspace(Guid key, string? culture = null, string? propertyAlias = null)
        => Workspace("content", "document", key, culture, propertyAlias);

    public string ElementWorkspace(Guid key, string? culture = null, string? propertyAlias = null)
        => Workspace("library", "element", key, culture, propertyAlias);

    public string MediaWorkspace(Guid key, string? propertyAlias = null)
        => Workspace("media", "media", key, culture: null, propertyAlias);

    public string DocumentTypeUsage(Guid key)
        => $"{BackofficePath}/section/settings/workspace/document-type/edit/{key}/view/upeek-usage";

    public string MediaUsage(Guid key)
        => $"{BackofficePath}/section/media/workspace/media/edit/{key}/view/upeek-usage";

    private static string Workspace(string section, string entityType, Guid key, string? culture, string? propertyAlias)
    {
        var url = $"{BackofficePath}/section/{section}/workspace/{entityType}/edit/{key}";

        var query = new List<string>();
        if (string.IsNullOrWhiteSpace(culture) is false)
        {
            query.Add($"upeekCulture={Uri.EscapeDataString(culture)}");
        }

        if (string.IsNullOrWhiteSpace(propertyAlias) is false)
        {
            query.Add($"upeekProperty={Uri.EscapeDataString(propertyAlias)}");
        }

        return query.Count == 0 ? url : $"{url}?{string.Join('&', query)}";
    }
}
