using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Routing;
using Umbraco.Community.uPeek.Configuration;
using Umbraco.Community.uPeek.Observations;

namespace Umbraco.Community.uPeek.Inspection;

/// <summary>
///     Injects the uPeek bootstrap into front-end HTML responses for authenticated backoffice users,
///     and — when sampling is switched on — hands a copy of the rendered HTML to the observation
///     recorder.
/// </summary>
/// <remarks>
///     <para>
///         For everyone else this middleware does nothing at all: it checks for the backoffice auth
///         cookie, and on a miss it calls the next delegate without so much as wrapping the response
///         stream. Anonymous visitors get byte-identical HTML to a site without uPeek installed.
///     </para>
///     <para>
///         The injected payload is a bootstrap, not the manifest. It carries the page key and
///         culture and nothing else, so arming inspect mode is a separate authenticated call rather
///         than a content dump on every page the editor happens to open.
///     </para>
/// </remarks>
public sealed class PeekOverlayMiddleware : IMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IPeekAuthorizer _authorizer;
    private readonly IUmbracoContextAccessor _umbracoContextAccessor;
    private readonly IPeekObservationRecorder _observationRecorder;
    private readonly IOptionsMonitor<PeekOptions> _options;
    private readonly ILogger<PeekOverlayMiddleware> _logger;

    public PeekOverlayMiddleware(
        IPeekAuthorizer authorizer,
        IUmbracoContextAccessor umbracoContextAccessor,
        IPeekObservationRecorder observationRecorder,
        IOptionsMonitor<PeekOptions> options,
        ILogger<PeekOverlayMiddleware> logger)
    {
        _authorizer = authorizer;
        _umbracoContextAccessor = umbracoContextAccessor;
        _observationRecorder = observationRecorder;
        _options = options;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var options = _options.CurrentValue;

        if (options.Enabled is false || IsCandidateRequest(context) is false)
        {
            await next(context);
            return;
        }

        var viewer = options.Inspector.Enabled
            ? await _authorizer.AuthorizeAsync(context)
            : null;

        var shouldSample = _observationRecorder.ShouldObserve(context);

        if (viewer is null && shouldSample is false)
        {
            // The common path. Nothing is buffered, nothing is rewritten.
            await next(context);
            return;
        }

        var originalBody = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await next(context);
        }
        finally
        {
            context.Response.Body = originalBody;
        }

        buffer.Position = 0;

        if (IsHtmlResponse(context) is false)
        {
            await buffer.CopyToAsync(originalBody, context.RequestAborted);
            return;
        }

        var html = Encoding.UTF8.GetString(buffer.ToArray());

        if (shouldSample)
        {
            // Fire and forget by design: an audit sample must never delay a page.
            _observationRecorder.Observe(context, html);
        }

        if (viewer is not null)
        {
            html = Inject(context, html, viewer);

            // If uPeek changed the bytes, those bytes must not reach a shared cache. Without this a
            // single editor page view can poison the anonymous cache with instrumented markup.
            context.Response.Headers[HeaderNames.CacheControl] = "no-store, no-cache, private, max-age=0";
            context.Response.Headers[HeaderNames.Pragma] = "no-cache";
            context.Response.Headers.Append(HeaderNames.Vary, HeaderNames.Cookie);
        }

        var payload = Encoding.UTF8.GetBytes(html);
        context.Response.ContentLength = payload.Length;
        await originalBody.WriteAsync(payload, context.RequestAborted);
    }

    private string Inject(HttpContext context, string html, PeekViewer viewer)
    {
        var closingBody = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        if (closingBody < 0)
        {
            // A fragment or a hand-rolled response with no body element. Nothing to hang the
            // overlay off, and guessing would corrupt the output.
            return html;
        }

        PeekBootstrap bootstrap;
        try
        {
            bootstrap = BuildBootstrap(context, viewer);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "uPeek could not build the overlay bootstrap for {Path}.", context.Request.Path);
            return html;
        }

        if (bootstrap.PageKey is null)
        {
            // Not an Umbraco-routed page (a custom controller, a static file served through MVC).
            // uPeek has nothing to say about it.
            return html;
        }

        var json = JsonSerializer.Serialize(bootstrap, JsonOptions);
        var snippet =
            $"""
             <script type="application/json" id="{PeekConstants.Overlay.BootstrapElementId}">{json}</script>
             <script type="module" src="{PeekConstants.Overlay.ScriptPath}" defer></script>
             """;

        return html[..closingBody] + snippet + html[closingBody..];
    }

    private PeekBootstrap BuildBootstrap(HttpContext context, PeekViewer viewer)
    {
        // Read the routed request from the HttpContext feature rather than from IUmbracoContext.
        // Both are populated here, but the feature is set by the route value transformer and lives
        // exactly as long as the HttpContext does, which makes it the safer of the two to read
        // after the endpoint has finished executing.
        var request = context.Features.Get<UmbracoRouteValues>()?.PublishedRequest;
        _umbracoContextAccessor.TryGetUmbracoContext(out var umbracoContext);
        request ??= umbracoContext?.PublishedRequest;

        return new PeekBootstrap
        {
            PageKey = request?.PublishedContent?.Key,
            PageId = request?.PublishedContent?.Id,
            PageName = request?.PublishedContent?.Name,
            DocumentTypeAlias = request?.PublishedContent?.ContentType.Alias,
            TemplateAlias = request?.Template?.Alias,
            Culture = request?.Culture,
            Segment = request?.Segment,
            Preview = umbracoContext?.InPreviewMode ?? false,
            Url = context.Request.Path.Value,
            ViewerName = viewer.Name,
            ManifestUrl = PeekConstants.InspectorRoutes.Manifest,
            UsageUrl = PeekConstants.InspectorRoutes.Usage,
        };
    }

    private static bool IsCandidateRequest(HttpContext context)
    {
        if (HttpMethods.IsGet(context.Request.Method) is false)
        {
            return false;
        }

        var path = context.Request.Path;

        // Never instrument the backoffice, the Management API, or static assets.
        return path.StartsWithSegments("/umbraco", StringComparison.OrdinalIgnoreCase) is false &&
               Path.HasExtension(path.Value) is false;
    }

    private static bool IsHtmlResponse(HttpContext context)
        => context.Response.StatusCode is >= 200 and < 300 &&
           context.Response.ContentType?.Contains("text/html", StringComparison.OrdinalIgnoreCase) == true;
}

/// <summary>
///     The small payload injected into a page for an authenticated backoffice user. Deliberately
///     free of content values — arming inspect mode fetches the manifest separately.
/// </summary>
public sealed class PeekBootstrap
{
    public int Version { get; init; } = 1;

    public Guid? PageKey { get; init; }

    public int? PageId { get; init; }

    public string? PageName { get; init; }

    public string? DocumentTypeAlias { get; init; }

    public string? TemplateAlias { get; init; }

    public string? Culture { get; init; }

    public string? Segment { get; init; }

    public bool Preview { get; init; }

    public string? Url { get; init; }

    public string? ViewerName { get; init; }

    public required string ManifestUrl { get; init; }

    public required string UsageUrl { get; init; }
}
