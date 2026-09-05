using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using Umbraco.Community.Peek.Configuration;
using Umbraco.Community.Peek.Manifest;

namespace Umbraco.Community.Peek.Inspection.Matching;

/// <summary>
///     Decides which candidate values actually reached the rendered output.
/// </summary>
/// <remarks>
///     <para>
///         This runs server-side, on sampled requests, to feed the usage report. The interactive
///         overlay runs the equivalent logic in the browser against the live DOM — which is not the
///         same thing, and deliberately so: the overlay should attribute content that client-side
///         code produced, whereas the report should only count what the server actually emitted.
///     </para>
///     <para>
///         Matching is scored, not boolean. An exact hit on a whole text node is strong evidence; a
///         substring hit inside a longer run is weaker; several candidates claiming the same text is
///         no evidence at all about which one it was. The report only ever counts "this property
///         reached the page", which all three answer equally well.
///     </para>
/// </remarks>
public sealed class PeekMatcher
{
    private static readonly HtmlParser Parser = new();

    private static readonly HashSet<string> Invisible = new(StringComparer.OrdinalIgnoreCase)
    {
        "script", "style", "noscript", "template", "head", "title", "meta", "link",
    };

    public PeekMatchResult Match(IReadOnlyList<PeekEntry> entries, string html, PeekMatchingOptions options)
    {
        IDocument document;
        try
        {
            document = Parser.ParseDocument(html);
        }
        catch (Exception)
        {
            return PeekMatchResult.Empty;
        }

        var harvest = Collect(document, options.MinimumValueLength);
        var textNodes = harvest.Visible;

        var exact = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < textNodes.Count; i++)
        {
            if (exact.TryGetValue(textNodes[i], out var bucket))
            {
                bucket.Add(i);
            }
            else
            {
                exact[textNodes[i]] = [i];
            }
        }

        // One flat haystack for substring probes. Joined with a separator that cannot occur in
        // normalised text, so a fragment cannot accidentally match across two unrelated nodes.
        var haystack = string.Join("␟", textNodes);
        var attributeHaystack = string.Join("␟", harvest.Attributes);

        var states = new Dictionary<string, PeekMatchState>(entries.Count);
        var attributed = new HashSet<int>();

        foreach (var entry in entries)
        {
            if (entry.State is PeekMatchState.Empty or PeekMatchState.Unmatchable)
            {
                states[entry.Id] = entry.State;
                continue;
            }

            if (entry.SourceKind == PeekSourceKind.Media)
            {
                states[entry.Id] = MatchMedia(entry, html);
                continue;
            }

            states[entry.Id] = MatchText(entry, exact, haystack, attributeHaystack, attributed);
        }

        return new PeekMatchResult
        {
            States = states,
            AttributedTextNodes = attributed.Count,
            TotalTextNodes = textNodes.Count,
        };
    }

    private static PeekMatchState MatchText(
        PeekEntry entry,
        Dictionary<string, List<int>> exact,
        string haystack,
        string attributeHaystack,
        HashSet<int> attributed)
    {
        var hits = 0;
        var ambiguous = false;

        foreach (var fragment in entry.MatchTexts)
        {
            if (exact.TryGetValue(fragment, out var indexes))
            {
                hits++;
                if (indexes.Count > 1)
                {
                    ambiguous = true;
                }

                foreach (var index in indexes)
                {
                    attributed.Add(index);
                }

                continue;
            }

            // The value is present but split across inline markup, or wrapped in a longer run of
            // text. Still rendered — just not cleanly separable.
            if (haystack.Contains(fragment, StringComparison.OrdinalIgnoreCase))
            {
                hits++;
                continue;
            }

            // Reached the page as a link target, a form action or a meta tag rather than as prose.
            // That is rendering, and reporting it as an orphan would be wrong — but it is not
            // visible text, so it deliberately does not count towards coverage.
            if (attributeHaystack.Contains(fragment, StringComparison.OrdinalIgnoreCase))
            {
                hits++;
            }
        }

        if (hits == 0)
        {
            return PeekMatchState.NotRendered;
        }

        return ambiguous ? PeekMatchState.Ambiguous : PeekMatchState.Rendered;
    }

    private static PeekMatchState MatchMedia(PeekEntry entry, string html)
    {
        if (string.IsNullOrWhiteSpace(entry.MediaUrl))
        {
            return PeekMatchState.Unmatchable;
        }

        // Crop and resize parameters are appended to the same base path, so a plain containment
        // check is both sufficient and resistant to querystring rewriting.
        return html.Contains(entry.MediaUrl, StringComparison.OrdinalIgnoreCase)
            ? PeekMatchState.Rendered
            : PeekMatchState.NotRendered;
    }

    /// <summary>Attributes whose text a reader can see. These count towards coverage.</summary>
    private static readonly string[] VisibleAttributes = ["alt", "title", "aria-label", "placeholder"];

    /// <summary>
    ///     Attributes that carry content without displaying it. A value found only here is rendering
    ///     — a link target, a form action, a meta description — but it is not visible text, so
    ///     counting it towards coverage would flatter the number.
    /// </summary>
    private static readonly string[] HiddenAttributes = ["href", "src", "srcset", "action", "poster", "content", "value"];

    private readonly record struct Harvest(List<string> Visible, List<string> Attributes);

    private static Harvest Collect(IDocument document, int minimumLength)
    {
        var harvest = new Harvest([], []);

        // Head is skipped for visible text but scanned for attributes, so a value that only ever
        // renders into a meta tag is correctly reported as rendering rather than as an orphan.
        if (document.Head is not null)
        {
            WalkAttributes(document.Head, harvest.Attributes, minimumLength);
        }

        if (document.Body is not null)
        {
            Walk(document.Body, harvest, minimumLength);
        }

        return harvest;
    }

    private static void Walk(INode node, Harvest harvest, int minimumLength)
    {
        foreach (var child in node.ChildNodes)
        {
            switch (child)
            {
                case IText text:
                    var normalised = PeekText.Normalise(text.Data);
                    if (normalised.Length >= minimumLength)
                    {
                        harvest.Visible.Add(normalised);
                    }

                    break;

                case IElement element when Invisible.Contains(element.LocalName) is false:
                    AddAttributes(element, VisibleAttributes, harvest.Visible, minimumLength);
                    AddAttributes(element, HiddenAttributes, harvest.Attributes, minimumLength);
                    Walk(element, harvest, minimumLength);
                    break;
            }
        }
    }

    private static void WalkAttributes(INode node, List<string> target, int minimumLength)
    {
        foreach (var child in node.ChildNodes)
        {
            if (child is not IElement element)
            {
                continue;
            }

            AddAttributes(element, HiddenAttributes, target, minimumLength);
            AddAttributes(element, VisibleAttributes, target, minimumLength);
            WalkAttributes(element, target, minimumLength);
        }
    }

    private static void AddAttributes(IElement element, string[] names, List<string> target, int minimumLength)
    {
        foreach (var name in names)
        {
            var value = PeekText.Normalise(element.GetAttribute(name));
            if (value.Length >= minimumLength)
            {
                target.Add(value);
            }
        }
    }
}

public sealed class PeekMatchResult
{
    public static readonly PeekMatchResult Empty = new();

    public IReadOnlyDictionary<string, PeekMatchState> States { get; init; }
        = new Dictionary<string, PeekMatchState>();

    public int AttributedTextNodes { get; init; }

    public int TotalTextNodes { get; init; }

    /// <summary>
    ///     Fraction of visible text on the page that Peek could attribute to a content property.
    ///     Always displayed. A tool that silently hides its own gaps is one that gets caught out
    ///     once and abandoned.
    /// </summary>
    public double Coverage => TotalTextNodes == 0 ? 0d : (double)AttributedTextNodes / TotalTextNodes;
}
