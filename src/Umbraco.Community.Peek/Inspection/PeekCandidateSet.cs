using Umbraco.Community.Peek.Manifest;

namespace Umbraco.Community.Peek.Inspection;

/// <summary>The result of walking out from one page: every value that could appear on it.</summary>
public sealed class PeekCandidateSet
{
    public required PeekNodeRef? Page { get; init; }

    public required IReadOnlyList<PeekNodeRef> Nodes { get; init; }

    public required IReadOnlyList<PeekEntry> Entries { get; init; }

    public required bool Truncated { get; init; }

    public IReadOnlyList<string> Warnings { get; init; } = [];
}
