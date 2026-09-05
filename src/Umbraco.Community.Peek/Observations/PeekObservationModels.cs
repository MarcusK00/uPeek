using Umbraco.Community.Peek.Manifest;

namespace Umbraco.Community.Peek.Observations;

/// <summary>What one sampled page view told us. Aggregated into daily rollups on flush.</summary>
public sealed class PeekPageObservation
{
    public required DateTime ObservedAt { get; init; }

    public required string Url { get; init; }

    public string? Culture { get; init; }

    public required IReadOnlyList<PeekPropertyOutcome> Properties { get; init; }
}

/// <summary>One property's fate on one sampled page view.</summary>
public readonly record struct PeekPropertyOutcome(
    Guid NodeKey,
    Guid ContentTypeKey,
    string ContentTypeAlias,
    string PropertyAlias,
    string Culture,
    PeekMatchState State);

/// <summary>Everything drained from the buffer in one flush.</summary>
public sealed class PeekObservationSnapshot
{
    public required IReadOnlyList<PeekPageObservation> Observations { get; init; }

    /// <summary>Page views that were eligible for sampling, whether or not they were sampled.</summary>
    public required long EligibleViews { get; init; }

    /// <summary>Observations dropped because the buffer was full.</summary>
    public required long Dropped { get; init; }
}
