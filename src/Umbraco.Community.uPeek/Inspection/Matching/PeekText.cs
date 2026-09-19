using System.Text;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

namespace Umbraco.Community.uPeek.Inspection.Matching;

/// <summary>
///     Text normalisation shared by the server matcher (sampling) and the browser overlay
///     (interactive highlighting). The TypeScript port lives in
///     <c>Client/src/overlay/matching/text.ts</c> and MUST stay in step with this file, or the
///     coverage number the overlay shows will disagree with the orphan report.
/// </summary>
public static class PeekText
{
    private static readonly HtmlParser Parser = new();

    /// <summary>
    ///     Collapse all whitespace runs to a single space and trim. Deliberately NOT lower-cased:
    ///     casing is preserved so the value shown on the hover card is the value the editor typed.
    ///     Comparison is done case-insensitively instead, because CSS text-transform is common.
    /// </summary>
    public static string Normalise(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length);
        var pendingSpace = false;

        foreach (var ch in value)
        {
            // Non-breaking space is whitespace as far as a reader is concerned, but not to char.IsWhiteSpace
            // in every runtime, so normalise it explicitly.
            if (char.IsWhiteSpace(ch) || ch == '\u00a0' || ch == '\u200b')
            {
                pendingSpace = builder.Length > 0;
                continue;
            }

            if (pendingSpace)
            {
                builder.Append(' ');
                pendingSpace = false;
            }

            builder.Append(ch);
        }

        return builder.ToString();
    }

    public static bool Equals(string? a, string? b)
        => string.Equals(Normalise(a), Normalise(b), StringComparison.OrdinalIgnoreCase);

    /// <summary>
    ///     True when the value is something uPeek is allowed to hunt for in the DOM. Returns the
    ///     reason when it is not, so the UI can say "not looked for" rather than "not found".
    /// </summary>
    public static string? UnmatchableReason(string? normalised, int minimumLength, bool allowNumeric)
    {
        if (string.IsNullOrEmpty(normalised))
        {
            return "empty";
        }

        if (normalised.Length < minimumLength)
        {
            return "tooShort";
        }

        if (!allowNumeric && normalised.All(c => char.IsDigit(c) || c is '.' or ',' or '-' or ' ' or '%'))
        {
            return "numeric";
        }

        return null;
    }

    /// <summary>
    ///     Turn a rich text value into the fragments it will actually appear as in the DOM: one per
    ///     block-level element. Matching an RTE property as a single string would fail on every site
    ///     that has more than one paragraph in a body field, and would then report it as an orphan.
    /// </summary>
    public static IReadOnlyList<string> SplitHtmlIntoFragments(string? html, int minimumLength)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return [];
        }

        IDocument document;
        try
        {
            document = Parser.ParseDocument($"<body>{html}</body>");
        }
        catch (Exception)
        {
            // A value that will not parse is not worth failing a page render over.
            return [];
        }

        var fragments = new List<string>();
        var body = document.Body;
        if (body is null)
        {
            return [];
        }

        CollectBlockText(body, fragments, minimumLength);

        // A value with no block structure at all (e.g. "<em>hi</em> there") still needs one fragment.
        if (fragments.Count == 0)
        {
            var whole = Normalise(body.TextContent);
            if (whole.Length >= minimumLength)
            {
                fragments.Add(whole);
            }
        }

        return fragments.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static readonly HashSet<string> BlockLevel = new(StringComparer.OrdinalIgnoreCase)
    {
        "p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "td", "th",
        "figcaption", "dt", "dd", "pre", "section", "article", "aside",
    };

    private static void CollectBlockText(IElement element, List<string> fragments, int minimumLength)
    {
        foreach (var child in element.Children)
        {
            // A block-level element is a fragment only when it is the innermost one. The check has
            // to look at every descendant, not just direct children: `<div><ul><li>` puts two
            // levels between the wrapper and the text, and treating the div as a leaf would glue
            // every list item into one unmatchable run.
            if (BlockLevel.Contains(child.LocalName) && ContainsBlockDescendant(child) is false)
            {
                var text = Normalise(child.TextContent);
                if (text.Length >= minimumLength)
                {
                    fragments.Add(text);
                }

                continue;
            }

            CollectBlockText(child, fragments, minimumLength);
        }
    }

    private static bool ContainsBlockDescendant(IElement element)
        => element.Children.Any(child =>
            BlockLevel.Contains(child.LocalName) || ContainsBlockDescendant(child));

    /// <summary>Strip markup down to readable text, for the hover card preview.</summary>
    public static string StripHtml(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        try
        {
            return Normalise(Parser.ParseDocument($"<body>{html}</body>").Body?.TextContent);
        }
        catch (Exception)
        {
            return Normalise(html);
        }
    }

    public static string? Truncate(string? value, int max)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= max ? value : value[..max].TrimEnd() + "\u2026";
    }
}
