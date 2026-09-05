using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Web.Common.ApplicationBuilder;
using Umbraco.Community.Peek.Configuration;
using Umbraco.Community.Peek.Inspection;
using Umbraco.Community.Peek.Inspection.Matching;
using Umbraco.Community.Peek.Observations;
using Umbraco.Community.Peek.Observations.Migrations;
using Umbraco.Community.Peek.Reporting;
using Umbraco.Extensions;

namespace Umbraco.Community.Peek.Composing;

/// <summary>Wires Peek into Umbraco. Everything the package registers is registered here.</summary>
public sealed class PeekComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services
            .AddOptions<PeekOptions>()
            .Bind(builder.Config.GetSection(PeekConstants.ConfigSection))
            .ValidateDataAnnotations();

        builder.Services.TryAddSingleton<PeekBackofficeUrls>();
        builder.Services.TryAddSingleton<PeekMatcher>();
        builder.Services.TryAddSingleton<IPeekObservationBuffer, PeekObservationBuffer>();

        builder.Services.TryAddScoped<PeekCandidateCollector>();
        builder.Services.TryAddScoped<IPeekAuthorizer, PeekAuthorizer>();
        builder.Services.TryAddScoped<IPeekManifestService, PeekManifestService>();
        builder.Services.TryAddScoped<IPeekObservationRecorder, PeekObservationRecorder>();
        builder.Services.TryAddScoped<IPeekObservationRepository, PeekObservationRepository>();
        builder.Services.TryAddScoped<IPeekReportService, PeekReportService>();

        // IMiddleware implementations are resolved per request from DI, which is what lets the
        // middleware take scoped dependencies without the usual captive-dependency trap.
        builder.Services.TryAddScoped<PeekOverlayMiddleware>();

        builder.Services.AddHostedService<PeekObservationFlushService>();

        builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, PeekMigrationHandler>();

        RegisterPipeline(builder);
    }

    private static void RegisterPipeline(IUmbracoBuilder builder)
        => builder.Services.Configure<UmbracoPipelineOptions>(options =>
            options.AddFilter(new UmbracoPipelineFilter(PeekConstants.PackageName)
            {
                // PostPipeline sits after UseUmbracoCore (so IUmbracoContext is alive), after
                // UseRouting and UseAuthentication (so cookie authentication has a handler to call),
                // and still outside the endpoint middleware — so wrapping next() here captures the
                // rendered response while the routed request is still on the HttpContext.
                PostPipeline = app => app.UseMiddleware<PeekOverlayMiddleware>(),

                // The overlay's own endpoints. Mapped here rather than via MapControllers(), which
                // Umbraco never calls and which a package must not call on the host's behalf.
                PostMapEndpoints = PeekInspectorEndpoints.MapPeekInspector,
            }));
}
