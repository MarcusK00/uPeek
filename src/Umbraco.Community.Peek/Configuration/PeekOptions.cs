using System.ComponentModel.DataAnnotations;

namespace Umbraco.Community.Peek.Configuration;

/// <summary>
///     Bound from the <c>Peek</c> configuration section. Every default here is chosen so that
///     installing the package changes nothing for anonymous visitors.
/// </summary>
public sealed class PeekOptions
{
    /// <summary>Master switch. When false Peek registers nothing into the request pipeline.</summary>
    public bool Enabled { get; set; } = true;

    public PeekInspectorOptions Inspector { get; set; } = new();

    public PeekMatchingOptions Matching { get; set; } = new();

    public PeekSamplingOptions Sampling { get; set; } = new();
}

public sealed class PeekInspectorOptions
{
    /// <summary>Inject the overlay bootstrap for authenticated backoffice users.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    ///     Backoffice sections a user must have access to before Peek will tell them anything.
    ///     Structural information about the content model is still information.
    /// </summary>
    public string[] RequiredSections { get; set; } = ["content"];

    /// <summary>How deep to follow pickers and nested elements away from the routed page.</summary>
    [Range(1, 10)]
    public int MaxDepth { get; set; } = 4;

    /// <summary>Hard ceiling on candidates per page, so a pathological page cannot hang a request.</summary>
    [Range(50, 20000)]
    public int MaxCandidates { get; set; } = 2500;
}

public sealed class PeekMatchingOptions
{
    /// <summary>
    ///     Values shorter than this are never matched. "Read more" is bad enough; "12" is worse.
    ///     Short values still appear in the manifest, flagged as unmatchable.
    /// </summary>
    [Range(1, 200)]
    public int MinimumValueLength { get; set; } = 4;

    /// <summary>Values that are purely numeric are excluded from text matching by default.</summary>
    public bool MatchNumericValues { get; set; }

    /// <summary>Truncation length for the value preview shown on the hover card.</summary>
    [Range(20, 2000)]
    public int PreviewLength { get; set; } = 180;
}

public sealed class PeekSamplingOptions
{
    /// <summary>
    ///     Off by default: it costs a response buffer plus an HTML parse on sampled requests, and
    ///     it is only meaningful once someone has decided to run an audit.
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>Fraction of eligible page views to observe, 0.0 - 1.0.</summary>
    [Range(0.0, 1.0)]
    public double SampleRate { get; set; } = 0.05;

    /// <summary>How often the in-memory buffer is drained to storage.</summary>
    public TimeSpan FlushInterval { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>Observations older than this are pruned on flush.</summary>
    [Range(1, 3650)]
    public int RetentionDays { get; set; } = 60;

    /// <summary>
    ///     The report refuses to render orphan verdicts below these thresholds. A confident-looking
    ///     report built on four page views is the fastest way to lose a customer.
    /// </summary>
    [Range(1, 365)]
    public int MinimumWindowDays { get; set; } = 14;

    [Range(1, 1000000)]
    public int MinimumObservedPageViews { get; set; } = 500;

    /// <summary>
    ///     Properties that render outside page requests — email templates, sitemaps, RSS, structured
    ///     data, scheduled jobs. Page-view sampling cannot see these, so they are never reported as
    ///     orphans. Format: <c>documentTypeAlias.propertyAlias</c>, or <c>*.propertyAlias</c>.
    /// </summary>
    public string[] RendersOutsidePageRequests { get; set; } = [];

    /// <summary>Upper bound on the in-memory buffer before observations are dropped.</summary>
    [Range(100, 1000000)]
    public int MaxBufferedObservations { get; set; } = 20000;
}
