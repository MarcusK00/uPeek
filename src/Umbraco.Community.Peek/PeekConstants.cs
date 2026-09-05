namespace Umbraco.Community.Peek;

/// <summary>
///     Well-known names shared between the C# and TypeScript halves of Peek.
///     Anything here that changes has a counterpart in <c>Client/src/constants.ts</c>.
/// </summary>
public static class PeekConstants
{
    public const string PackageName = "Peek";

    /// <summary>Alias of the Peek backoffice OpenAPI document, and the Management API route prefix.</summary>
    public const string ApiName = "peek";

    /// <summary>Where the built client bundles live once the package is installed.</summary>
    public const string PluginPath = "/App_Plugins/Peek";

    /// <summary>Configuration section bound to <see cref="Configuration.PeekOptions" />.</summary>
    public const string ConfigSection = "Peek";

    /// <summary>
    ///     Routes for the front-end inspector. These are deliberately NOT part of the Management API:
    ///     the overlay runs on the public site, where the backoffice cookie is available but the
    ///     backoffice bearer token is not. See <c>docs/ARCHITECTURE.md</c> ("Two API surfaces").
    /// </summary>
    public static class InspectorRoutes
    {
        public const string Base = "/umbraco/peek/inspect";
        public const string Manifest = Base + "/manifest";
        public const string Usage = Base + "/usage";
    }

    public static class Overlay
    {
        public const string ScriptPath = PluginPath + "/peek.overlay.js";

        /// <summary>Element id of the bootstrap JSON blob injected before <c>&lt;/body&gt;</c>.</summary>
        public const string BootstrapElementId = "peek-bootstrap";
    }

    /// <summary>
    ///     The colour language from the UI spec. Emitted with the manifest so the overlay and the
    ///     backoffice reports cannot drift apart.
    /// </summary>
    public static class Legend
    {
        public const string Owned = "owned";
        public const string Block = "block";
        public const string Shared = "shared";
        public const string Unattributed = "unattributed";
        public const string Ambiguous = "ambiguous";
    }
}
