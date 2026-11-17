using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace Umbraco.Community.uPeek.Observations.Persistence;

/// <summary>
///     Daily rollup of "was this property a candidate on an observed page view, and did it reach the
///     output". Aggregated before it is written: a site doing 12k views a month must not produce 12k
///     rows, and the report never asks a question that needs per-request granularity.
/// </summary>
[TableName(PeekPropertyObservationDto.TableName)]
[PrimaryKey(nameof(Id), AutoIncrement = true)]
[ExplicitColumns]
public sealed class PeekPropertyObservationDto
{
    public const string TableName = "upeekPropertyObservation";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = true)]
    public int Id { get; set; }

    /// <summary>Date only. Kept as a DateTime because SQLite and SQL Server disagree about dates.</summary>
    [Column("day")]
    [Index(IndexTypes.NonClustered, Name = "IX_upeekPropertyObservation_day")]
    public DateTime Day { get; set; }

    [Column("contentTypeKey")]
    public Guid ContentTypeKey { get; set; }

    [Column("contentTypeAlias")]
    [Length(255)]
    public string ContentTypeAlias { get; set; } = string.Empty;

    [Column("propertyAlias")]
    [Length(255)]
    public string PropertyAlias { get; set; } = string.Empty;

    /// <summary>Empty string rather than null, so the unique index behaves the same on every provider.</summary>
    [Column("culture")]
    [Length(20)]
    [Index(IndexTypes.UniqueNonClustered,
        Name = "IX_upeekPropertyObservation_unique",
        ForColumns = "day,contentTypeKey,propertyAlias,culture")]
    public string Culture { get; set; } = string.Empty;

    /// <summary>Page views on which this property was a candidate at all.</summary>
    [Column("observedCount")]
    public long ObservedCount { get; set; }

    /// <summary>Of those, the views where it reached the rendered output.</summary>
    [Column("renderedCount")]
    public long RenderedCount { get; set; }

    /// <summary>Views where it had a value but uPeek was not allowed to look for it.</summary>
    [Column("unmatchableCount")]
    public long UnmatchableCount { get; set; }

    /// <summary>Views where the property had no value for this culture.</summary>
    [Column("emptyCount")]
    public long EmptyCount { get; set; }
}

/// <summary>
///     Where a property was last seen rendering. This is what turns "0 observed renders" into an
///     answerable question in the other direction: given a property, which URLs show it?
/// </summary>
[TableName(PeekRenderLocationDto.TableName)]
[PrimaryKey(nameof(Id), AutoIncrement = true)]
[ExplicitColumns]
public sealed class PeekRenderLocationDto
{
    public const string TableName = "upeekRenderLocation";

    [Column("id")]
    [PrimaryKeyColumn(AutoIncrement = true)]
    public int Id { get; set; }

    [Column("contentTypeKey")]
    public Guid ContentTypeKey { get; set; }

    [Column("propertyAlias")]
    [Length(255)]
    public string PropertyAlias { get; set; } = string.Empty;

    [Column("culture")]
    [Length(20)]
    public string Culture { get; set; } = string.Empty;

    [Column("nodeKey")]
    [Index(IndexTypes.UniqueNonClustered,
        Name = "IX_upeekRenderLocation_unique",
        ForColumns = "contentTypeKey,propertyAlias,culture,nodeKey")]
    public Guid NodeKey { get; set; }

    [Column("url")]
    [Length(1000)]
    public string Url { get; set; } = string.Empty;

    [Column("lastSeen")]
    public DateTime LastSeen { get; set; }

    [Column("seenCount")]
    public long SeenCount { get; set; }
}

/// <summary>
///     The denominator. Without it "0 renders" is meaningless, so the report refuses to draw
///     conclusions until this table says enough traffic has been seen.
/// </summary>
[TableName(PeekSampleDayDto.TableName)]
[PrimaryKey(nameof(Day), AutoIncrement = false)]
[ExplicitColumns]
public sealed class PeekSampleDayDto
{
    public const string TableName = "upeekSampleDay";

    [Column("day")]
    [PrimaryKeyColumn(AutoIncrement = false)]
    public DateTime Day { get; set; }

    /// <summary>Page views uPeek saw and was eligible to sample.</summary>
    [Column("eligibleViews")]
    public long EligibleViews { get; set; }

    /// <summary>Of those, the ones actually parsed and matched.</summary>
    [Column("sampledViews")]
    public long SampledViews { get; set; }
}
