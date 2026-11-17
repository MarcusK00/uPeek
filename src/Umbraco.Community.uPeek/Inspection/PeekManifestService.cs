using System.Diagnostics;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Community.uPeek.Configuration;
using Umbraco.Community.uPeek.Manifest;
using Umbraco.Extensions;

namespace Umbraco.Community.uPeek.Inspection;

public interface IPeekManifestService
{
    /// <summary>
    ///     Builds the manifest for one page. The page is addressed by key rather than by URL: the
    ///     overlay receives the key from the bootstrap the middleware injected during the page
    ///     render, so uPeek never has to re-route a URL and risk disagreeing with what was rendered.
    /// </summary>
    Task<PeekPageManifest?> BuildAsync(Guid pageKey, string? culture, string? segment, bool preview);
}

/// <inheritdoc />
public sealed class PeekManifestService : IPeekManifestService
{
    private readonly IPublishedContentCache _contentCache;
    private readonly PeekCandidateCollector _collector;
    private readonly IOptionsMonitor<PeekOptions> _options;

    public PeekManifestService(
        IPublishedContentCache contentCache,
        PeekCandidateCollector collector,
        IOptionsMonitor<PeekOptions> options)
    {
        _contentCache = contentCache;
        _collector = collector;
        _options = options;
    }

    public async Task<PeekPageManifest?> BuildAsync(Guid pageKey, string? culture, string? segment, bool preview)
    {
        var page = await _contentCache.GetByIdAsync(pageKey, preview);
        if (page is null)
        {
            return null;
        }

        var stopwatch = Stopwatch.StartNew();
        var candidates = _collector.Collect(page, culture, segment);
        stopwatch.Stop();

        var warnings = candidates.Warnings.ToList();
        if (candidates.Truncated)
        {
            warnings.Add(
                $"Stopped after {_options.CurrentValue.Inspector.MaxCandidates} values. " +
                "Some content on this page will show as unattributed.");
        }

        return new PeekPageManifest
        {
            Url = page.Url(culture: culture),
            Culture = culture,
            Segment = segment,
            Preview = preview,
            BuildDurationMs = stopwatch.ElapsedMilliseconds,
            Page = candidates.Page,
            Nodes = candidates.Nodes,
            Entries = candidates.Entries,
            Warnings = warnings,
            Matching = _options.CurrentValue.Matching,
            Truncated = candidates.Truncated,
        };
    }
}
