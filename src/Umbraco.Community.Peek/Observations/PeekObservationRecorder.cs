using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Web;
using Umbraco.Community.Peek.Configuration;
using Umbraco.Community.Peek.Inspection;
using Umbraco.Community.Peek.Inspection.Matching;
using Umbraco.Community.Peek.Manifest;

namespace Umbraco.Community.Peek.Observations;

public interface IPeekObservationRecorder
{
    /// <summary>
    ///     Cheap sampling gate, called on every eligible front-end request. Also counts the
    ///     denominator, so it must be called exactly once per request.
    /// </summary>
    bool ShouldObserve(HttpContext httpContext);

    /// <summary>Match the rendered HTML against the page's candidates and buffer the outcome.</summary>
    void Observe(HttpContext httpContext, string html);
}

/// <inheritdoc />
public sealed class PeekObservationRecorder : IPeekObservationRecorder
{
    private readonly IUmbracoContextAccessor _umbracoContextAccessor;
    private readonly PeekCandidateCollector _collector;
    private readonly PeekMatcher _matcher;
    private readonly IPeekObservationBuffer _buffer;
    private readonly IOptionsMonitor<PeekOptions> _options;
    private readonly ILogger<PeekObservationRecorder> _logger;

    public PeekObservationRecorder(
        IUmbracoContextAccessor umbracoContextAccessor,
        PeekCandidateCollector collector,
        PeekMatcher matcher,
        IPeekObservationBuffer buffer,
        IOptionsMonitor<PeekOptions> options,
        ILogger<PeekObservationRecorder> logger)
    {
        _umbracoContextAccessor = umbracoContextAccessor;
        _collector = collector;
        _matcher = matcher;
        _buffer = buffer;
        _options = options;
        _logger = logger;
    }

    public bool ShouldObserve(HttpContext httpContext)
    {
        var sampling = _options.CurrentValue.Sampling;
        if (sampling.Enabled is false)
        {
            return false;
        }

        if (_umbracoContextAccessor.TryGetUmbracoContext(out var umbracoContext) is false ||
            umbracoContext.PublishedRequest?.PublishedContent is null ||
            umbracoContext.InPreviewMode)
        {
            return false;
        }

        _buffer.CountEligibleView();

        return Random.Shared.NextDouble() < sampling.SampleRate;
    }

    public void Observe(HttpContext httpContext, string html)
    {
        try
        {
            if (_umbracoContextAccessor.TryGetUmbracoContext(out var umbracoContext) is false)
            {
                return;
            }

            var request = umbracoContext.PublishedRequest;
            var page = request?.PublishedContent;
            if (page is null)
            {
                return;
            }

            var culture = request?.Culture;
            var candidates = _collector.Collect(page, culture, request?.Segment);
            var result = _matcher.Match(candidates.Entries, html, _options.CurrentValue.Matching);

            var nodes = candidates.Nodes.ToDictionary(node => node.Key);

            var outcomes = new List<PeekPropertyOutcome>(candidates.Entries.Count);
            foreach (var entry in candidates.Entries)
            {
                if (nodes.TryGetValue(entry.NodeKey, out var node) is false || node.ContentTypeKey is null)
                {
                    continue;
                }

                outcomes.Add(new PeekPropertyOutcome(
                    entry.NodeKey,
                    node.ContentTypeKey.Value,
                    node.ContentTypeAlias,
                    entry.PropertyAlias,
                    entry.Culture ?? string.Empty,
                    result.States.GetValueOrDefault(entry.Id, entry.State)));
            }

            _buffer.Add(new PeekPageObservation
            {
                ObservedAt = DateTime.UtcNow,
                Url = httpContext.Request.Path.Value ?? "/",
                Culture = culture,
                Properties = outcomes,
            });
        }
        catch (Exception ex)
        {
            // Sampling is a background concern. It never fails a page.
            _logger.LogWarning(ex, "Peek could not record an observation for {Path}.", httpContext.Request.Path);
        }
    }
}
