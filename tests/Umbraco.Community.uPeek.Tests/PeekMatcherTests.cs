using NUnit.Framework;
using Umbraco.Community.uPeek.Configuration;
using Umbraco.Community.uPeek.Inspection.Matching;
using Umbraco.Community.uPeek.Manifest;

namespace Umbraco.Community.uPeek.Tests;

/// <summary>
///     The matcher decides what the usage report counts as "rendered", so these tests are really
///     about what uPeek is willing to claim. Each case corresponds to a row shape a customer can see.
/// </summary>
[TestFixture]
public class PeekMatcherTests
{
    private readonly PeekMatcher _matcher = new();
    private readonly PeekMatchingOptions _options = new();

    private static PeekEntry Entry(string id, params string[] matchTexts) => new()
    {
        Id = id,
        NodeKey = Guid.NewGuid(),
        PropertyAlias = "alias",
        SourceKind = PeekSourceKind.OwnedProperty,
        State = PeekMatchState.Candidate,
        MatchTexts = matchTexts,
    };

    [Test]
    public void Exact_text_match_is_rendered()
    {
        var result = _matcher.Match(
            [Entry("e1", "Devtools for your content")],
            "<html><body><h1>Devtools for your content</h1></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void Match_is_case_insensitive_and_whitespace_tolerant()
    {
        // A heading with CSS text-transform: uppercase is still the same content.
        var result = _matcher.Match(
            [Entry("e1", "Kontakt os i dag")],
            "<html><body><h1>KONTAKT   OS\n I DAG</h1></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void Value_wrapped_in_a_longer_run_of_text_still_counts_as_rendered()
    {
        var result = _matcher.Match(
            [Entry("e1", "middle part")],
            "<html><body><p>Before the middle part and after.</p></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void The_same_text_appearing_twice_is_ambiguous_rather_than_a_guess()
    {
        // "Read more" eight times on a page. uPeek says "several possible sources" and lists them,
        // rather than confidently pointing at the wrong one.
        var result = _matcher.Match(
            [Entry("e1", "Read more")],
            "<html><body><a>Read more</a><a>Read more</a></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Ambiguous));
    }

    [Test]
    public void A_value_that_never_reaches_the_output_is_not_rendered()
    {
        // The seoKeywords case: filled in by editors, rendered by no template.
        var result = _matcher.Match(
            [Entry("e1", "umbraco, content inspector, devtools")],
            "<html><body><h1>Something else entirely</h1></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.NotRendered));
    }

    [Test]
    public void A_value_rendered_only_into_an_href_counts_as_rendered()
    {
        // Found by running the demo site: a link target is rendering, and calling it an orphan
        // would be a false positive of exactly the kind that destroys trust in the whole report.
        var result = _matcher.Match(
            [Entry("e1", "/docs/architecture")],
            "<html><body><a href=\"/docs/architecture\">Read the notes</a></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void A_value_rendered_only_into_a_meta_tag_counts_as_rendered()
    {
        var result = _matcher.Match(
            [Entry("e1", "A page description for search engines")],
            "<html><head><meta name=\"description\" content=\"A page description for search engines\" /></head><body><p>Body copy here.</p></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void Attribute_only_matches_do_not_inflate_coverage()
    {
        // They are rendering, but they are not visible text, so counting them towards coverage
        // would flatter the number the overlay shows.
        var result = _matcher.Match(
            [Entry("e1", "/docs/architecture")],
            "<html><body><a href=\"/docs/architecture\">Unattributed link text</a></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
        Assert.That(result.AttributedTextNodes, Is.Zero);
        Assert.That(result.Coverage, Is.Zero);
    }

    [Test]
    public void Alt_text_counts_as_visible_content()
    {
        var result = _matcher.Match(
            [Entry("e1", "A photograph of the office")],
            "<html><body><img alt=\"A photograph of the office\" src=\"/media/x.jpg\" /></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
        Assert.That(result.Coverage, Is.EqualTo(1d));
    }

    [Test]
    public void Script_and_style_contents_are_never_treated_as_visible_text()
    {
        var result = _matcher.Match(
            [Entry("e1", "hidden in a script")],
            "<html><body><script>var x = 'hidden in a script';</script><p>Real body text.</p></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.NotRendered));
    }

    [Test]
    public void Empty_and_unmatchable_entries_pass_through_untouched()
    {
        var empty = Entry("e1") with { State = PeekMatchState.Empty };
        var unmatchable = Entry("e2", "12") with { State = PeekMatchState.Unmatchable };

        var result = _matcher.Match([empty, unmatchable], "<html><body><p>Anything.</p></body></html>", _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Empty));
        Assert.That(result.States["e2"], Is.EqualTo(PeekMatchState.Unmatchable));
    }

    [Test]
    public void Coverage_reports_the_fraction_of_visible_text_that_was_attributed()
    {
        var result = _matcher.Match(
            [Entry("e1", "Attributed paragraph")],
            "<html><body><p>Attributed paragraph</p><p>Hard coded in the template</p></body></html>",
            _options);

        Assert.That(result.Coverage, Is.EqualTo(0.5d));
        Assert.That(result.TotalTextNodes, Is.EqualTo(2));
    }

    [Test]
    public void A_media_entry_matches_on_its_url()
    {
        var media = Entry("e1") with
        {
            SourceKind = PeekSourceKind.Media,
            MediaUrl = "/media/abc123/hero.jpg",
        };

        var result = _matcher.Match(
            [media],
            "<html><body><img src=\"/media/abc123/hero.jpg?width=800\" /></body></html>",
            _options);

        // Crop and resize parameters hang off the same base path, so containment is the right test.
        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void An_unreferenced_media_entry_is_not_rendered()
    {
        var media = Entry("e1") with
        {
            SourceKind = PeekSourceKind.Media,
            MediaUrl = "/media/abc123/hero.jpg",
        };

        var result = _matcher.Match([media], "<html><body><p>No images here.</p></body></html>", _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.NotRendered));
    }

    [Test]
    public void Rich_text_split_across_paragraphs_matches_on_any_fragment()
    {
        var entry = Entry("e1", "First paragraph here.", "Second paragraph here.");

        var result = _matcher.Match(
            [entry],
            "<html><body><p>First paragraph here.</p><p>Second paragraph here.</p></body></html>",
            _options);

        Assert.That(result.States["e1"], Is.EqualTo(PeekMatchState.Rendered));
    }

    [Test]
    public void Unparseable_input_degrades_rather_than_throws()
    {
        Assert.DoesNotThrow(() => _matcher.Match([Entry("e1", "value")], string.Empty, _options));
    }
}
