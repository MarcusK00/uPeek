using System.Text.Json.Serialization;

namespace Umbraco.Community.uPeek.Reporting.Models;

/// <summary>
///     What uPeek is willing to say about one property. The language is never "delete this" — an
///     orphan report that is confidently wrong once destroys trust in every other row.
/// </summary>
/// <remarks>
///     Serialised by name, not by ordinal. The TypeScript half of uPeek switches on these values, and
///     a numeric wire format would turn every reorder of this enum into a silent client-side bug.
/// </remarks>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PeekVerdict
{
    /// <summary>Not enough traffic observed yet to say anything. The default, and the safe one.</summary>
    InsufficientData = 0,

    /// <summary>Observed reaching the rendered output.</summary>
    Rendering = 1,

    /// <summary>
    ///     Editors fill it in and it was never observed in any output. The interesting row — and
    ///     still only evidence, not a verdict.
    /// </summary>
    HasContentNeverObserved = 2,

    /// <summary>Never observed, and no editor has ever put anything in it either.</summary>
    AlwaysEmpty = 3,

    /// <summary>
    ///     Has content that uPeek is structurally unable to look for — too short, numeric, or a value
    ///     type that never appears in the DOM as literal text. Never counted as orphan evidence.
    /// </summary>
    NotMeasurable = 4,

    /// <summary>
    ///     Marked in configuration as rendering outside page requests: email templates, sitemaps,
    ///     RSS, structured data, scheduled jobs. Page-view sampling is blind to these by
    ///     construction, which is exactly what makes an unqualified orphan report dangerous.
    /// </summary>
    ExcludedFromReporting = 5,
}

public sealed class PeekSamplingStatus
{
    public required bool Enabled { get; init; }

    public required double SampleRate { get; init; }

    public required int DaysCollected { get; init; }

    public required int MinimumWindowDays { get; init; }

    public required long EligibleViews { get; init; }

    public required long SampledViews { get; init; }

    public required long MinimumObservedPageViews { get; init; }

    public required int PendingFlush { get; init; }

    public DateTime? FirstObservedOn { get; init; }

    public DateTime? LastObservedOn { get; init; }

    /// <summary>
    ///     False until both the window and the volume thresholds are met. While false, every report
    ///     shows progress instead of verdicts. A confident-looking report built on four page views
    ///     is the fastest way to lose a customer.
    /// </summary>
    public bool HasEnoughData => DaysCollected >= MinimumWindowDays && EligibleViews >= MinimumObservedPageViews;

    /// <summary>0-1, for the "collecting…" progress bar.</summary>
    public double Progress => HasEnoughData
        ? 1d
        : Math.Min(
            MinimumWindowDays == 0 ? 1d : (double)DaysCollected / MinimumWindowDays,
            MinimumObservedPageViews == 0 ? 1d : (double)EligibleViews / MinimumObservedPageViews);
}

public sealed class PeekDocumentTypeUsage
{
    public required Guid ContentTypeKey { get; init; }

    public required string Alias { get; init; }

    public string? Name { get; init; }

    public string? Icon { get; init; }

    public required PeekSamplingStatus Sampling { get; init; }

    public required IReadOnlyList<PeekPropertyUsage> Properties { get; init; }
}

public sealed class PeekPropertyUsage
{
    public required string PropertyAlias { get; init; }

    public string? PropertyName { get; init; }

    public string? EditorAlias { get; init; }

    public required bool VariesByCulture { get; init; }

    public required PeekVerdict Verdict { get; init; }

    /// <summary>
    ///     Per-culture, always. On a Danish multilingual site "renders on da-DK but never on en-GB"
    ///     is a real and common finding, and a single collapsed count would hide it.
    /// </summary>
    public required IReadOnlyList<PeekCultureUsage> Cultures { get; init; }

    public long TotalObserved => Cultures.Sum(c => c.ObservedCount);

    public long TotalRendered => Cultures.Sum(c => c.RenderedCount);
}

public sealed class PeekCultureUsage
{
    /// <summary>Empty for invariant properties.</summary>
    public required string Culture { get; init; }

    public required long ObservedCount { get; init; }

    public required long RenderedCount { get; init; }

    public required long UnmatchableCount { get; init; }

    public required long EmptyCount { get; init; }

    public required PeekVerdict Verdict { get; init; }

    public DateTime? LastObservedOn { get; init; }
}

public sealed class PeekMediaUsage
{
    public required Guid MediaKey { get; init; }

    public string? Name { get; init; }

    public string? Url { get; init; }

    /// <summary>
    ///     Hard references from Umbraco's own relation tracking. Unlike render sampling this is
    ///     exact — if it is empty, nothing in the content tree points at this item.
    /// </summary>
    public required IReadOnlyList<PeekReference> ReferencedBy { get; init; }

    /// <summary>Page views on which this item was observed actually reaching the output.</summary>
    public required long ObservedRenders { get; init; }

    public required PeekSamplingStatus Sampling { get; init; }

    public bool IsReferenced => ReferencedBy.Count > 0;
}

public sealed class PeekReference
{
    public required Guid NodeKey { get; init; }

    public string? Name { get; init; }

    public string? ContentTypeAlias { get; init; }

    public string? ContentTypeName { get; init; }

    public string? ContentTypeIcon { get; init; }

    public bool? Published { get; init; }

    public string? EditUrl { get; init; }
}

public sealed class PeekReverseLookup
{
    public required Guid ContentTypeKey { get; init; }

    public required string PropertyAlias { get; init; }

    public required PeekSamplingStatus Sampling { get; init; }

    public required IReadOnlyList<PeekRenderLocation> Locations { get; init; }
}

public sealed class PeekRenderLocation
{
    public required Guid NodeKey { get; init; }

    public string? Name { get; init; }

    public required string Url { get; init; }

    public required string Culture { get; init; }

    public required long SeenCount { get; init; }

    public required DateTime LastSeen { get; init; }

    public string? EditUrl { get; init; }
}

/// <summary>The site-wide orphan report: every property, ranked by how dead it looks.</summary>
public sealed class PeekOrphanReport
{
    public required PeekSamplingStatus Sampling { get; init; }

    public required IReadOnlyList<PeekOrphanRow> Rows { get; init; }
}

public sealed class PeekOrphanRow
{
    public required Guid ContentTypeKey { get; init; }

    public required string ContentTypeAlias { get; init; }

    public string? ContentTypeName { get; init; }

    public string? ContentTypeIcon { get; init; }

    public required string PropertyAlias { get; init; }

    public string? PropertyName { get; init; }

    public required PeekVerdict Verdict { get; init; }

    public required long ObservedCount { get; init; }

    public required long RenderedCount { get; init; }

    /// <summary>Cultures where this property has content but was never observed rendering.</summary>
    public required IReadOnlyList<string> DeadCultures { get; init; }

    public string? UsageUrl { get; init; }
}
