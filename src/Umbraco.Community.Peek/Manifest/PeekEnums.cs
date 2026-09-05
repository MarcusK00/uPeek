using System.Text.Json.Serialization;

namespace Umbraco.Community.Peek.Manifest;

/// <summary>Where a candidate value physically lives, which is what the overlay colours by.</summary>
/// <remarks>
///     Serialised by name, not by ordinal. The TypeScript half of Peek switches on these values, and
///     a numeric wire format would turn every reorder of this enum into a silent client-side bug.
/// </remarks>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PeekSourceKind
{
    /// <summary>A property on the node that owns this URL. Blue.</summary>
    OwnedProperty = 0,

    /// <summary>An item inside a Block List, Block Grid or rich text block. Purple.</summary>
    Block = 1,

    /// <summary>
    ///     A reusable Element from the Library, or content reached through a picker. Amber —
    ///     not a warning that something is wrong, a warning that the blast radius is bigger
    ///     than the page you are looking at.
    /// </summary>
    Shared = 2,

    /// <summary>A media item.</summary>
    Media = 3,
}

/// <remarks>
///     Serialised by name, not by ordinal. The TypeScript half of Peek switches on these values, and
///     a numeric wire format would turn every reorder of this enum into a silent client-side bug.
/// </remarks>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PeekNodeKind
{
    Document = 0,
    Element = 1,
    Media = 2,
}

/// <summary>What the matcher concluded about a candidate.</summary>
/// <remarks>
///     Serialised by name, not by ordinal. The TypeScript half of Peek switches on these values, and
///     a numeric wire format would turn every reorder of this enum into a silent client-side bug.
/// </remarks>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PeekMatchState
{
    /// <summary>The property has no value for this culture, so there is nothing to look for.</summary>
    Empty = 0,

    /// <summary>
    ///     Has a value Peek is able to search for, and nothing has searched yet. This is what the
    ///     manifest endpoint returns: the overlay matches against the live DOM itself, so the server
    ///     must not pretend to know whether the value reached the page.
    /// </summary>
    Candidate = 5,

    /// <summary>Found exactly once in the rendered output.</summary>
    Rendered = 1,

    /// <summary>
    ///     Found more than once, or the same text belongs to more than one candidate. Peek lists
    ///     every possibility rather than guessing.
    /// </summary>
    Ambiguous = 2,

    /// <summary>
    ///     A matcher looked for this value in the output and did not find it. The signature of a dead
    ///     property — but see <see cref="PeekEntry.Unmatchable" /> before believing it.
    /// </summary>
    NotRendered = 3,

    /// <summary>
    ///     Has a value that the matcher is not allowed to look for: too short, purely numeric, or
    ///     a type that never reaches the page as literal text. Never counts towards orphan evidence.
    /// </summary>
    Unmatchable = 4,
}

/// <remarks>
///     Serialised by name, not by ordinal. The TypeScript half of Peek switches on these values, and
///     a numeric wire format would turn every reorder of this enum into a silent client-side bug.
/// </remarks>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PeekPublishState
{
    Published = 0,
    DraftChangesPending = 1,
    Unpublished = 2,
    NotApplicable = 3,
}
