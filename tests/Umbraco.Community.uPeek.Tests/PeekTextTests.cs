using NUnit.Framework;
using Umbraco.Community.uPeek.Inspection.Matching;

namespace Umbraco.Community.uPeek.Tests;

/// <summary>
///     Pins the normalisation rules.
/// </summary>
/// <remarks>
///     These cases are duplicated in <c>Client/src/overlay/matching/text.ts</c>, which must behave
///     identically. If the two drift, the coverage number the overlay shows will disagree with the
///     usage report, and a tool that contradicts itself is worse than either answer alone.
/// </remarks>
[TestFixture]
public class PeekTextTests
{
    [TestCase(null, "")]
    [TestCase("", "")]
    [TestCase("   ", "")]
    [TestCase("hello", "hello")]
    [TestCase("  hello  ", "hello")]
    [TestCase("hello    world", "hello world")]
    [TestCase("hello\n\t world", "hello world")]
    [TestCase("hello world", "hello world")]
    [TestCase("hello​world", "hello world")]
    public void Normalise_collapses_whitespace(string? input, string expected)
        => Assert.That(PeekText.Normalise(input), Is.EqualTo(expected));

    [Test]
    public void Normalise_preserves_casing()
    {
        // Casing is kept so the hover card shows what the editor typed. Comparison is done
        // case-insensitively instead, because CSS text-transform is common.
        Assert.That(PeekText.Normalise("Løsninger Til Alle"), Is.EqualTo("Løsninger Til Alle"));
    }

    [Test]
    public void Equals_ignores_case_and_whitespace()
    {
        Assert.That(PeekText.Equals("  Hello   World ", "hello world"), Is.True);
        Assert.That(PeekText.Equals("hello", "hello there"), Is.False);
    }

    [TestCase("", 4, false, "empty")]
    [TestCase("abc", 4, false, "tooShort")]
    [TestCase("1234", 4, false, "numeric")]
    [TestCase("12,50 %", 4, false, "numeric")]
    [TestCase("1234", 4, true, null)]
    [TestCase("Kontakt os", 4, false, null)]
    public void UnmatchableReason_explains_why_a_value_is_not_searched(
        string value,
        int minimumLength,
        bool allowNumeric,
        string? expected)
        => Assert.That(PeekText.UnmatchableReason(value, minimumLength, allowNumeric), Is.EqualTo(expected));

    [Test]
    public void SplitHtmlIntoFragments_splits_rich_text_per_block_element()
    {
        // An RTE value never appears in the DOM as one contiguous run of text. Matching it whole
        // would report every multi-paragraph body field as an orphan.
        var fragments = PeekText.SplitHtmlIntoFragments(
            "<p>First paragraph here.</p><p>Second paragraph here.</p>",
            minimumLength: 4);

        Assert.That(fragments, Is.EqualTo(new[] { "First paragraph here.", "Second paragraph here." }));
    }

    [Test]
    public void SplitHtmlIntoFragments_keeps_inline_markup_within_one_fragment()
    {
        var fragments = PeekText.SplitHtmlIntoFragments(
            "<p>Some <strong>bold</strong> text.</p>",
            minimumLength: 4);

        Assert.That(fragments, Is.EqualTo(new[] { "Some bold text." }));
    }

    [Test]
    public void SplitHtmlIntoFragments_descends_into_wrappers()
    {
        var fragments = PeekText.SplitHtmlIntoFragments(
            "<div><ul><li>One item here</li><li>Two items here</li></ul></div>",
            minimumLength: 4);

        Assert.That(fragments, Is.EqualTo(new[] { "One item here", "Two items here" }));
    }

    [Test]
    public void SplitHtmlIntoFragments_falls_back_to_the_whole_value_when_there_is_no_block_structure()
    {
        var fragments = PeekText.SplitHtmlIntoFragments("<em>Just</em> inline text", minimumLength: 4);

        Assert.That(fragments, Is.EqualTo(new[] { "Just inline text" }));
    }

    [Test]
    public void SplitHtmlIntoFragments_drops_fragments_below_the_minimum_length()
    {
        var fragments = PeekText.SplitHtmlIntoFragments("<p>Long enough value</p><p>ok</p>", minimumLength: 4);

        Assert.That(fragments, Is.EqualTo(new[] { "Long enough value" }));
    }

    [Test]
    public void SplitHtmlIntoFragments_deduplicates()
    {
        var fragments = PeekText.SplitHtmlIntoFragments("<p>Same text</p><p>Same text</p>", minimumLength: 4);

        Assert.That(fragments, Has.Count.EqualTo(1));
    }

    [Test]
    public void StripHtml_returns_readable_text()
        => Assert.That(
            PeekText.StripHtml("<p>Hello <strong>there</strong></p>"),
            Is.EqualTo("Hello there"));

    [Test]
    public void Truncate_appends_an_ellipsis_only_when_it_cuts()
    {
        Assert.That(PeekText.Truncate("short", 20), Is.EqualTo("short"));
        Assert.That(PeekText.Truncate("a much longer value", 6), Is.EqualTo("a much…"));
    }
}
