using Umbraco.Community.uPeek.Configuration;

namespace Umbraco.Community.uPeek.Manifest;

/// <summary>
///     Everything uPeek knows about one rendered page, in one payload.
///     The overlay matches this against the live DOM; a headless front end gets the identical
///     shape from the Delivery-API-side endpoint and runs the same matching code.
/// </summary>
public sealed class PeekPageManifest
{
    /// <summary>Bumped when the shape changes, so an old cached overlay fails loudly.</summary>
    public int Version { get; init; } = 1;

    public required string Url { get; init; }

    public string? Culture { get; init; }

    public string? Segment { get; init; }

    public bool Preview { get; init; }

    public DateTimeOffset GeneratedAt { get; init; } = DateTimeOffset.UtcNow;

    public long BuildDurationMs { get; init; }

    public PeekNodeRef? Page { get; init; }

    /// <summary>Node metadata, referenced by key from <see cref="Entries" /> so it is not repeated.</summary>
    public IReadOnlyList<PeekNodeRef> Nodes { get; init; } = [];

    /// <summary>One entry per candidate property value found by walking out from the page.</summary>
    public IReadOnlyList<PeekEntry> Entries { get; init; } = [];

    /// <summary>Non-fatal things that limit what the overlay can tell the user.</summary>
    public IReadOnlyList<string> Warnings { get; init; } = [];

    /// <summary>Matching rules, sent to the client so both halves normalise text identically.</summary>
    public PeekMatchingOptions Matching { get; init; } = new();

    /// <summary>True when the walk hit <see cref="PeekInspectorOptions.MaxCandidates" />.</summary>
    public bool Truncated { get; init; }
}

/// <summary>A node (document, element or media item) referenced by one or more entries.</summary>
public sealed class PeekNodeRef
{
    public required Guid Key { get; init; }

    public required int Id { get; init; }

    public string? Name { get; init; }

    public required PeekNodeKind Kind { get; init; }

    public required string ContentTypeAlias { get; init; }

    public string? ContentTypeName { get; init; }

    public Guid? ContentTypeKey { get; init; }

    public string? ContentTypeIcon { get; init; }

    public bool IsElement { get; init; }

    /// <summary>Public URL of the node, when it has one.</summary>
    public string? Url { get; init; }

    /// <summary>Deep link into the backoffice workspace for this node.</summary>
    public string? EditUrl { get; init; }

    public PeekPublishState PublishState { get; init; }

    public DateTime? UpdateDate { get; init; }

    public string? LastEditedBy { get; init; }

    public IReadOnlyList<string> Cultures { get; init; } = [];
}

/// <summary>One property value that could appear on the page.</summary>
public sealed record PeekEntry
{
    /// <summary>Stable within a manifest. The overlay uses this as the region id.</summary>
    public required string Id { get; init; }

    public required Guid NodeKey { get; init; }

    public required string PropertyAlias { get; init; }

    public string? PropertyName { get; init; }

    public string? EditorAlias { get; init; }

    public string? Culture { get; init; }

    public string? Segment { get; init; }

    public required PeekSourceKind SourceKind { get; init; }

    /// <summary>
    ///     Homepage -> featureBlocks[2] -> blockTitle. The answer to the question people are
    ///     actually asking, and the reason this is worth building.
    /// </summary>
    public IReadOnlyList<PeekBreadcrumbSegment> Breadcrumb { get; init; } = [];

    /// <summary>Truncated, for the hover card.</summary>
    public string? ValuePreview { get; init; }

    /// <summary>
    ///     The normalised text fragments the client should look for. Usually one, but a rich text
    ///     value is deliberately split per block-level element: an RTE property never appears in the
    ///     DOM as one contiguous run of text, and matching it whole would report it as unrendered.
    ///     Empty when the value is unmatchable.
    /// </summary>
    public IReadOnlyList<string> MatchTexts { get; init; } = [];

    /// <summary>For media entries: the resolved file URL to match against img/src.</summary>
    public string? MediaUrl { get; init; }

    public required PeekMatchState State { get; init; }

    /// <summary>
    ///     Set when the value exists but uPeek is not allowed to look for it (too short, numeric,
    ///     non-textual). Distinguishes "we could not find it" from "we never looked".
    /// </summary>
    public string? Unmatchable { get; init; }

    /// <summary>
    ///     True when the value came from an invariant property on a variant node, i.e. editing it
    ///     changes every culture.
    /// </summary>
    public bool InvariantAcrossCultures { get; init; }

    /// <summary>Deep link straight to this property in the backoffice, with the right variant open.</summary>
    public string? EditUrl { get; init; }
}

/// <summary>One hop in the chain from the page down to the value.</summary>
public sealed class PeekBreadcrumbSegment
{
    public required string Label { get; init; }

    public string? PropertyAlias { get; init; }

    /// <summary>Zero-based index when the hop went through a collection.</summary>
    public int? Index { get; init; }

    /// <summary>Set when the hop crossed into a different node.</summary>
    public Guid? NodeKey { get; init; }

    public string? Icon { get; init; }
}
