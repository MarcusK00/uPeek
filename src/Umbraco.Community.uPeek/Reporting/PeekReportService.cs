using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Community.uPeek.Configuration;
using Umbraco.Community.uPeek.Inspection;
using Umbraco.Community.uPeek.Observations;
using Umbraco.Community.uPeek.Observations.Persistence;
using Umbraco.Community.uPeek.Reporting.Models;
using Umbraco.Extensions;

namespace Umbraco.Community.uPeek.Reporting;

public interface IPeekReportService
{
    Task<PeekSamplingStatus> GetSamplingStatusAsync();

    Task<PeekDocumentTypeUsage?> GetDocumentTypeUsageAsync(Guid contentTypeKey);

    Task<PeekMediaUsage?> GetMediaUsageAsync(Guid mediaKey);

    Task<PeekOrphanReport> GetOrphanReportAsync();

    Task<PeekReverseLookup?> GetReverseLookupAsync(Guid contentTypeKey, string propertyAlias, string? culture);

    /// <summary>Hard references to a node — used for the overlay's "shared, used on N pages" badge.</summary>
    Task<IReadOnlyList<PeekReference>> GetReferencesAsync(Guid nodeKey, UmbracoObjectTypes objectType);
}

/// <inheritdoc />
public sealed class PeekReportService : IPeekReportService
{
    private readonly IPeekObservationRepository _repository;
    private readonly IPeekObservationBuffer _buffer;
    private readonly IContentTypeService _contentTypeService;
    private readonly IMediaService _mediaService;
    private readonly ITrackedReferencesService _trackedReferencesService;
    private readonly IPublishedUrlProvider _urlProvider;
    private readonly PeekBackofficeUrls _backofficeUrls;
    private readonly IOptionsMonitor<PeekOptions> _options;

    /// <summary>
    ///     Reference lists are shown in a panel, not paged. Past a couple of hundred the answer to
    ///     "can I delete this" is already an emphatic no.
    /// </summary>
    private const int MaxReferences = 200;

    public PeekReportService(
        IPeekObservationRepository repository,
        IPeekObservationBuffer buffer,
        IContentTypeService contentTypeService,
        IMediaService mediaService,
        ITrackedReferencesService trackedReferencesService,
        IPublishedUrlProvider urlProvider,
        PeekBackofficeUrls backofficeUrls,
        IOptionsMonitor<PeekOptions> options)
    {
        _repository = repository;
        _buffer = buffer;
        _contentTypeService = contentTypeService;
        _mediaService = mediaService;
        _trackedReferencesService = trackedReferencesService;
        _urlProvider = urlProvider;
        _backofficeUrls = backofficeUrls;
        _options = options;
    }

    public async Task<PeekSamplingStatus> GetSamplingStatusAsync()
    {
        var sampling = _options.CurrentValue.Sampling;
        var days = await _repository.GetSampleDaysAsync();

        return new PeekSamplingStatus
        {
            Enabled = sampling.Enabled,
            SampleRate = sampling.SampleRate,
            DaysCollected = days.Count,
            MinimumWindowDays = sampling.MinimumWindowDays,
            EligibleViews = days.Sum(d => d.EligibleViews),
            SampledViews = days.Sum(d => d.SampledViews),
            MinimumObservedPageViews = sampling.MinimumObservedPageViews,
            PendingFlush = _buffer.PendingCount,
            FirstObservedOn = days.Count == 0 ? null : days.Min(d => d.Day),
            LastObservedOn = days.Count == 0 ? null : days.Max(d => d.Day),
        };
    }

    public async Task<PeekDocumentTypeUsage?> GetDocumentTypeUsageAsync(Guid contentTypeKey)
    {
        var contentType = _contentTypeService.Get(contentTypeKey);
        if (contentType is null)
        {
            return null;
        }

        var status = await GetSamplingStatusAsync();
        var observations = await _repository.GetPropertyObservationsAsync(contentTypeKey);
        var byProperty = observations
            .GroupBy(o => o.PropertyAlias, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        var properties = contentType.CompositionPropertyTypes
            .Select(propertyType => BuildPropertyUsage(
                contentType.Alias,
                propertyType.Alias,
                propertyType.Name,
                propertyType.PropertyEditorAlias,
                propertyType.Variations.VariesByCulture(),
                byProperty.GetValueOrDefault(propertyType.Alias) ?? [],
                status))
            .OrderBy(p => p.Verdict == PeekVerdict.Rendering)
            .ThenBy(p => p.PropertyAlias, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new PeekDocumentTypeUsage
        {
            ContentTypeKey = contentTypeKey,
            Alias = contentType.Alias,
            Name = contentType.Name,
            Icon = contentType.Icon,
            Sampling = status,
            Properties = properties,
        };
    }

    public async Task<PeekMediaUsage?> GetMediaUsageAsync(Guid mediaKey)
    {
        var media = _mediaService.GetById(mediaKey);
        if (media is null)
        {
            return null;
        }

        var references = await GetReferencesAsync(mediaKey, UmbracoObjectTypes.Media);
        var status = await GetSamplingStatusAsync();

        string? url = null;
        try
        {
            url = _urlProvider.GetMediaUrl(mediaKey);
        }
        catch (Exception)
        {
            // A media item with no umbracoFile has no URL. Not an error.
        }

        return new PeekMediaUsage
        {
            MediaKey = mediaKey,
            Name = media.Name,
            Url = url,
            ReferencedBy = references,
            ObservedRenders = 0,
            Sampling = status,
        };
    }

    public async Task<IReadOnlyList<PeekReference>> GetReferencesAsync(Guid nodeKey, UmbracoObjectTypes objectType)
    {
        var attempt = await _trackedReferencesService.GetPagedRelationsForItemAsync(
            nodeKey,
            objectType,
            skip: 0,
            take: MaxReferences,
            filterMustBeIsDependency: false);

        if (attempt.Success is false || attempt.Result is null)
        {
            // The node is gone, or is a type that does not participate in relation tracking. Either
            // way "no references found" is the honest answer, not an error the editor can act on.
            return [];
        }

        return attempt.Result.Items
            .Select(item => new PeekReference
            {
                NodeKey = item.NodeKey,
                Name = item.NodeName,
                ContentTypeAlias = item.ContentTypeAlias,
                ContentTypeName = item.ContentTypeName,
                ContentTypeIcon = item.ContentTypeIcon,
                Published = item.NodePublished,
                EditUrl = EditUrlForRelation(item),
            })
            .ToList();
    }

    public async Task<PeekOrphanReport> GetOrphanReportAsync()
    {
        var status = await GetSamplingStatusAsync();
        var observations = await _repository.GetPropertyObservationsAsync(contentTypeKey: null);

        var rows = observations
            .GroupBy(o => (o.ContentTypeKey, o.PropertyAlias))
            .Select(group => BuildOrphanRow(group.Key.ContentTypeKey, group.Key.PropertyAlias, group.ToList(), status))
            .Where(row => row is not null)
            .Select(row => row!)
            .OrderBy(row => row.Verdict switch
            {
                PeekVerdict.HasContentNeverObserved => 0,
                PeekVerdict.AlwaysEmpty => 1,
                PeekVerdict.NotMeasurable => 2,
                PeekVerdict.ExcludedFromReporting => 3,
                _ => 4,
            })
            .ThenByDescending(row => row.ObservedCount)
            .ToList();

        return new PeekOrphanReport { Sampling = status, Rows = rows };
    }

    public async Task<PeekReverseLookup?> GetReverseLookupAsync(
        Guid contentTypeKey,
        string propertyAlias,
        string? culture)
    {
        if (_contentTypeService.Get(contentTypeKey) is null)
        {
            return null;
        }

        var status = await GetSamplingStatusAsync();
        var locations = await _repository.GetRenderLocationsAsync(contentTypeKey, propertyAlias, culture);

        return new PeekReverseLookup
        {
            ContentTypeKey = contentTypeKey,
            PropertyAlias = propertyAlias,
            Sampling = status,
            Locations = locations
                .OrderByDescending(location => location.LastSeen)
                .Select(location => new PeekRenderLocation
                {
                    NodeKey = location.NodeKey,
                    Name = null,
                    Url = location.Url,
                    Culture = location.Culture,
                    SeenCount = location.SeenCount,
                    LastSeen = location.LastSeen,
                    EditUrl = _backofficeUrls.DocumentWorkspace(
                        location.NodeKey,
                        string.IsNullOrEmpty(location.Culture) ? null : location.Culture,
                        propertyAlias),
                })
                .ToList(),
        };
    }

    private PeekPropertyUsage BuildPropertyUsage(
        string contentTypeAlias,
        string propertyAlias,
        string? propertyName,
        string? editorAlias,
        bool variesByCulture,
        IReadOnlyList<PeekPropertyObservationDto> rows,
        PeekSamplingStatus status)
    {
        var excluded = IsExcluded(contentTypeAlias, propertyAlias);

        var cultures = rows
            .GroupBy(row => row.Culture, StringComparer.OrdinalIgnoreCase)
            .Select(group => new PeekCultureUsage
            {
                Culture = group.Key,
                ObservedCount = group.Sum(row => row.ObservedCount),
                RenderedCount = group.Sum(row => row.RenderedCount),
                UnmatchableCount = group.Sum(row => row.UnmatchableCount),
                EmptyCount = group.Sum(row => row.EmptyCount),
                LastObservedOn = group.Max(row => row.Day),
                Verdict = VerdictFor(
                    group.Sum(row => row.ObservedCount),
                    group.Sum(row => row.RenderedCount),
                    group.Sum(row => row.UnmatchableCount),
                    group.Sum(row => row.EmptyCount),
                    excluded,
                    status),
            })
            .OrderBy(usage => usage.Culture, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var overall = cultures.Count == 0
            ? excluded ? PeekVerdict.ExcludedFromReporting : PeekVerdict.InsufficientData
            : cultures.Any(c => c.Verdict == PeekVerdict.Rendering)
                ? PeekVerdict.Rendering
                : cultures
                    .OrderBy(c => c.Verdict switch
                    {
                        PeekVerdict.HasContentNeverObserved => 0,
                        PeekVerdict.AlwaysEmpty => 1,
                        PeekVerdict.NotMeasurable => 2,
                        PeekVerdict.ExcludedFromReporting => 3,
                        _ => 4,
                    })
                    .First().Verdict;

        return new PeekPropertyUsage
        {
            PropertyAlias = propertyAlias,
            PropertyName = propertyName,
            EditorAlias = editorAlias,
            VariesByCulture = variesByCulture,
            Verdict = overall,
            Cultures = cultures,
        };
    }

    private PeekOrphanRow? BuildOrphanRow(
        Guid contentTypeKey,
        string propertyAlias,
        IReadOnlyList<PeekPropertyObservationDto> rows,
        PeekSamplingStatus status)
    {
        var contentType = _contentTypeService.Get(contentTypeKey);
        var contentTypeAlias = contentType?.Alias ?? rows[0].ContentTypeAlias;
        var propertyType = contentType?.CompositionPropertyTypes
            .FirstOrDefault(p => string.Equals(p.Alias, propertyAlias, StringComparison.OrdinalIgnoreCase));

        var excluded = IsExcluded(contentTypeAlias, propertyAlias);

        var observed = rows.Sum(row => row.ObservedCount);
        var rendered = rows.Sum(row => row.RenderedCount);

        var verdict = VerdictFor(
            observed,
            rendered,
            rows.Sum(row => row.UnmatchableCount),
            rows.Sum(row => row.EmptyCount),
            excluded,
            status);

        var deadCultures = rows
            .GroupBy(row => row.Culture, StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Sum(row => row.RenderedCount) == 0 &&
                            group.Sum(row => row.ObservedCount) > group.Sum(row => row.EmptyCount))
            .Select(group => group.Key)
            .ToList();

        return new PeekOrphanRow
        {
            ContentTypeKey = contentTypeKey,
            ContentTypeAlias = contentTypeAlias,
            ContentTypeName = contentType?.Name,
            ContentTypeIcon = contentType?.Icon,
            PropertyAlias = propertyAlias,
            PropertyName = propertyType?.Name,
            Verdict = verdict,
            ObservedCount = observed,
            RenderedCount = rendered,
            DeadCultures = deadCultures,
            UsageUrl = _backofficeUrls.DocumentTypeUsage(contentTypeKey),
        };
    }

    private static PeekVerdict VerdictFor(
        long observed,
        long rendered,
        long unmatchable,
        long empty,
        bool excluded,
        PeekSamplingStatus status)
    {
        if (excluded)
        {
            return PeekVerdict.ExcludedFromReporting;
        }

        if (rendered > 0)
        {
            // One confirmed render is enough to clear a property, regardless of sample size.
            return PeekVerdict.Rendering;
        }

        if (status.HasEnoughData is false)
        {
            return PeekVerdict.InsufficientData;
        }

        var withValue = observed - empty;
        if (withValue <= 0)
        {
            return PeekVerdict.AlwaysEmpty;
        }

        // If every observation with a value was one uPeek could not look for, the absence of a match
        // says nothing at all. Reporting it as an orphan would be a lie with a number attached.
        return unmatchable >= withValue ? PeekVerdict.NotMeasurable : PeekVerdict.HasContentNeverObserved;
    }

    private bool IsExcluded(string contentTypeAlias, string propertyAlias)
        => _options.CurrentValue.Sampling.RendersOutsidePageRequests.Any(pattern =>
        {
            var parts = pattern.Split('.', 2);
            if (parts.Length != 2)
            {
                return string.Equals(pattern, propertyAlias, StringComparison.OrdinalIgnoreCase);
            }

            var typeMatches = parts[0] == "*" ||
                              string.Equals(parts[0], contentTypeAlias, StringComparison.OrdinalIgnoreCase);
            return typeMatches && string.Equals(parts[1], propertyAlias, StringComparison.OrdinalIgnoreCase);
        });

    private string? EditUrlForRelation(RelationItemModel item)
        => item.NodeType switch
        {
            "media" => _backofficeUrls.MediaWorkspace(item.NodeKey),
            "document" => _backofficeUrls.DocumentWorkspace(item.NodeKey),
            _ => null,
        };
}
