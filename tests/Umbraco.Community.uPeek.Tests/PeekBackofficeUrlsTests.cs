using NUnit.Framework;
using Umbraco.Community.uPeek.Inspection;

namespace Umbraco.Community.uPeek.Tests;

/// <summary>
///     The deep link is the feature that separates uPeek from an edit link, so its shape is pinned.
/// </summary>
[TestFixture]
public class PeekBackofficeUrlsTests
{
    private static readonly Guid Key = Guid.Parse("87017cf6-8f88-4dcf-ac38-681d4ec44c4f");

    private readonly PeekBackofficeUrls _urls = new();

    [Test]
    public void Document_workspace_without_hints_is_a_plain_workspace_url()
        => Assert.That(
            _urls.DocumentWorkspace(Key),
            Is.EqualTo($"/umbraco/section/content/workspace/document/edit/{Key}"));

    [Test]
    public void Document_workspace_carries_the_culture_and_property_hints()
    {
        // Without these the link only gets you to the node, which is the level of help that already
        // exists in the ecosystem. The entry point reads them and pulses the field.
        var url = _urls.DocumentWorkspace(Key, "da-DK", "seoKeywords");

        Assert.That(url, Does.Contain("upeekCulture=da-DK"));
        Assert.That(url, Does.Contain("upeekProperty=seoKeywords"));
    }

    [Test]
    public void Hints_are_url_encoded()
    {
        var url = _urls.DocumentWorkspace(Key, "da-DK", "weird alias&value");

        Assert.That(url, Does.Contain("upeekProperty=weird%20alias%26value"));
        Assert.That(url, Does.Not.Contain("weird alias&value"));
    }

    [Test]
    public void Element_workspace_points_at_the_library_section()
    {
        // Umbraco 18 moved reusable Elements into their own section, and a link into the content
        // section would simply not resolve.
        Assert.That(_urls.ElementWorkspace(Key), Does.StartWith("/umbraco/section/library/workspace/element/edit/"));
    }

    [Test]
    public void Media_workspace_points_at_the_media_section()
        => Assert.That(_urls.MediaWorkspace(Key), Does.StartWith("/umbraco/section/media/workspace/media/edit/"));

    [Test]
    public void Media_workspace_never_carries_a_culture()
    {
        // Media is invariant; a culture hint would be meaningless and the workspace would ignore it.
        Assert.That(_urls.MediaWorkspace(Key, "umbracoFile"), Does.Not.Contain("upeekCulture"));
    }

    [Test]
    public void Usage_views_link_to_the_pathname_declared_in_the_client_manifests()
    {
        // These pathnames are declared in Client/src/workspace-views/*/manifest.ts. If one side
        // changes, the link silently lands on the default tab instead.
        Assert.That(_urls.DocumentTypeUsage(Key), Does.EndWith("/view/upeek-usage"));
        Assert.That(_urls.MediaUsage(Key), Does.EndWith("/view/upeek-usage"));
    }
}
