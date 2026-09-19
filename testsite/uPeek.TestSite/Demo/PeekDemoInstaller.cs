using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.ContentEditing;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Extensions;
using static uPeek.TestSite.Demo.PeekDemoAliases;

namespace uPeek.TestSite.Demo;

/// <summary>
///     Builds a content model on first boot that is deliberately shaped to exercise everything uPeek
///     claims to do:
///     <list type="bullet">
///         <item>plain properties on the page that owns the URL (blue in the overlay);</item>
///         <item>values nested inside a Block List, so the breadcrumb has something to say (purple);</item>
///         <item>a picked node rendering somebody else's content on this page (amber);</item>
///         <item>two cultures, so per-culture reporting has two answers to give;</item>
///         <item>
///             a <c>seoKeywords</c> property that every page fills in and no template renders — the
///             row the usage report exists to surface.
///         </item>
///     </list>
/// </summary>
/// <remarks>
///     This lives in the test site, not in the package. Nothing here ships to a real installation.
/// </remarks>
public sealed class PeekDemoInstaller : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    private readonly IContentTypeService _contentTypeService;
    private readonly IDataTypeService _dataTypeService;
    private readonly IContentService _contentService;
    private readonly ILanguageService _languageService;
    private readonly ITemplateService _templateService;
    private readonly IDomainService _domainService;
    private readonly PropertyEditorCollection _propertyEditors;
    private readonly IConfigurationEditorJsonSerializer _configurationSerializer;
    private readonly IJsonSerializer _jsonSerializer;
    private readonly IShortStringHelper _shortStringHelper;
    private readonly IWebHostEnvironment _hostEnvironment;
    private readonly IRuntimeState _runtimeState;
    private readonly ILogger<PeekDemoInstaller> _logger;

    public PeekDemoInstaller(
        IContentTypeService contentTypeService,
        IDataTypeService dataTypeService,
        IContentService contentService,
        ILanguageService languageService,
        ITemplateService templateService,
        IDomainService domainService,
        PropertyEditorCollection propertyEditors,
        IConfigurationEditorJsonSerializer configurationSerializer,
        IJsonSerializer jsonSerializer,
        IShortStringHelper shortStringHelper,
        IWebHostEnvironment hostEnvironment,
        IRuntimeState runtimeState,
        ILogger<PeekDemoInstaller> logger)
    {
        _contentTypeService = contentTypeService;
        _dataTypeService = dataTypeService;
        _contentService = contentService;
        _languageService = languageService;
        _templateService = templateService;
        _domainService = domainService;
        _propertyEditors = propertyEditors;
        _configurationSerializer = configurationSerializer;
        _jsonSerializer = jsonSerializer;
        _shortStringHelper = shortStringHelper;
        _hostEnvironment = hostEnvironment;
        _runtimeState = runtimeState;
        _logger = logger;
    }

    public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        if (_runtimeState.Level < RuntimeLevel.Run)
        {
            return;
        }

        if (_contentTypeService.Get(DocumentTypes.HomePage) is not null)
        {
            return;
        }

        try
        {
            _logger.LogInformation("Building the uPeek demo content model.");

            await EnsureLanguageAsync();

            var hero = await CreateElementTypeAsync(
                ElementTypes.HeroBlock,
                "Hero block",
                "icon-picture",
                [
                    (Properties.Heading, "Heading", Constants.DataTypes.Guids.TextstringGuid, true),
                    (Properties.Subheading, "Subheading", Constants.DataTypes.Guids.TextstringGuid, true),
                ]);

            var text = await CreateElementTypeAsync(
                ElementTypes.TextBlock,
                "Text block",
                "icon-article",
                [
                    (Properties.Title, "Title", Constants.DataTypes.Guids.TextstringGuid, true),
                    (Properties.BodyText, "Body text", Constants.DataTypes.Guids.RichtextEditorGuid, true),
                ]);

            var cta = await CreateElementTypeAsync(
                ElementTypes.CallToActionBlock,
                "Call to action",
                "icon-tab",
                [
                    (Properties.Label, "Label", Constants.DataTypes.Guids.TextstringGuid, true),
                    // Invariant on purpose: the overlay should be able to say "editing this changes
                    // every language", which is only demonstrable if something actually is invariant.
                    (Properties.Link, "Link", Constants.DataTypes.Guids.TextstringGuid, false),
                ]);

            var blockDataType = await CreateBlockListDataTypeAsync(hero, text, cta);

            var sharedContent = await CreateDocumentTypeAsync(
                DocumentTypes.SharedContent,
                "Shared content",
                "icon-share",
                templateAlias: null,
                allowedAtRoot: true,
                [
                    (Properties.FooterText, "Footer text", Constants.DataTypes.Guids.RichtextEditorGuid, true),
                    (Properties.ContactEmail, "Contact email", Constants.DataTypes.Guids.TextstringGuid, false),
                ]);

            var homePage = await CreateDocumentTypeAsync(
                DocumentTypes.HomePage,
                "Home page",
                "icon-home",
                templateAlias: DocumentTypes.HomePage,
                allowedAtRoot: true,
                [
                    (Properties.PageTitle, "Page title", Constants.DataTypes.Guids.TextstringGuid, true),
                    (Properties.Introduction, "Introduction", Constants.DataTypes.Guids.TextareaGuid, true),
                    (Properties.ContentBlocks, "Content blocks", blockDataType.Key, true),
                    (Properties.SharedFooter, "Shared footer", Constants.DataTypes.Guids.ContentPickerGuid, false),
                    (Properties.SeoKeywords, "SEO keywords", Constants.DataTypes.Guids.TextstringGuid, true),
                ]);

            var landingPage = await CreateDocumentTypeAsync(
                DocumentTypes.LandingPage,
                "Landing page",
                "icon-documents",
                templateAlias: DocumentTypes.LandingPage,
                allowedAtRoot: false,
                [
                    (Properties.PageTitle, "Page title", Constants.DataTypes.Guids.TextstringGuid, true),
                    (Properties.Introduction, "Introduction", Constants.DataTypes.Guids.TextareaGuid, true),
                    (Properties.ContentBlocks, "Content blocks", blockDataType.Key, true),
                    (Properties.SeoKeywords, "SEO keywords", Constants.DataTypes.Guids.TextstringGuid, true),
                ]);

            await AllowChildrenAsync(homePage, landingPage, sharedContent);

            var home = CreateContent(homePage, landingPage, sharedContent, hero, text, cta);
            await AssignDomainsAsync(home);

            _logger.LogInformation("uPeek demo content model created.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "The uPeek demo installer failed. The site will still run, without demo content.");
        }
    }

    // ------------------------------------------------------------------ schema

    private async Task EnsureLanguageAsync()
    {
        if (await _languageService.GetAsync(DemoLanguage) is not null)
        {
            return;
        }

        var language = new Language(DemoLanguage, "Dansk (Danmark)");
        var result = await _languageService.CreateAsync(language, Constants.Security.SuperUserKey);
        if (result.Success is false)
        {
            _logger.LogWarning("Could not create the {Language} language: {Status}.", DemoLanguage, result.Status);
        }
    }

    private async Task<IDataType> CreateBlockListDataTypeAsync(params IContentType[] elementTypes)
    {
        var existing = await _dataTypeService.GetAsync(DataTypes.DemoBlockList);
        if (existing is not null)
        {
            return existing;
        }

        var editor = _propertyEditors[Constants.PropertyEditors.Aliases.BlockList]
                     ?? throw new InvalidOperationException("The Block List property editor is not registered.");

        var dataType = new DataType(editor, _configurationSerializer)
        {
            Name = DataTypes.DemoBlockList,
            DatabaseType = ValueStorageType.Ntext,
            ConfigurationData = new Dictionary<string, object>
            {
                ["blocks"] = elementTypes
                    .Select(elementType => new Dictionary<string, object>
                    {
                        ["contentElementTypeKey"] = elementType.Key.ToString(),
                        ["label"] = $"{{= {LabelPropertyFor(elementType.Alias)} }}",
                    })
                    .ToArray(),
            },
        };

        var result = await _dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);
        if (result.Success is false)
        {
            throw new InvalidOperationException($"Could not create the demo Block List data type: {result.Status}.");
        }

        return result.Result!;
    }

    private static string LabelPropertyFor(string elementAlias) => elementAlias switch
    {
        ElementTypes.HeroBlock => Properties.Heading,
        ElementTypes.TextBlock => Properties.Title,
        _ => Properties.Label,
    };

    private Task<IContentType> CreateElementTypeAsync(
        string alias,
        string name,
        string icon,
        (string Alias, string Name, Guid DataTypeKey, bool VariesByCulture)[] properties)
        => CreateContentTypeAsync(alias, name, icon, properties, isElement: true, templateAlias: null, allowedAtRoot: false);

    private Task<IContentType> CreateDocumentTypeAsync(
        string alias,
        string name,
        string icon,
        string? templateAlias,
        bool allowedAtRoot,
        (string Alias, string Name, Guid DataTypeKey, bool VariesByCulture)[] properties)
        => CreateContentTypeAsync(alias, name, icon, properties, isElement: false, templateAlias, allowedAtRoot);

    private async Task<IContentType> CreateContentTypeAsync(
        string alias,
        string name,
        string icon,
        (string Alias, string Name, Guid DataTypeKey, bool VariesByCulture)[] properties,
        bool isElement,
        string? templateAlias,
        bool allowedAtRoot)
    {
        var existing = _contentTypeService.Get(alias);
        if (existing is not null)
        {
            return existing;
        }

        var contentType = new ContentType(_shortStringHelper, -1)
        {
            Alias = alias,
            Name = name,
            Icon = icon,
            IsElement = isElement,
            AllowedAsRoot = allowedAtRoot,
            Variations = isElement || properties.Any(p => p.VariesByCulture)
                ? ContentVariation.Culture
                : ContentVariation.Nothing,
        };

        var group = new PropertyGroup(isPublishing: true)
        {
            Name = "Content",
            Alias = "content",
            SortOrder = 0,
        };

        var sortOrder = 0;
        foreach (var (propertyAlias, propertyName, dataTypeKey, varies) in properties)
        {
            var dataType = await _dataTypeService.GetAsync(dataTypeKey)
                           ?? throw new InvalidOperationException($"Data type {dataTypeKey} was not found.");

            group.PropertyTypes!.Add(new PropertyType(_shortStringHelper, dataType, propertyAlias)
            {
                Name = propertyName,
                SortOrder = sortOrder++,
                Variations = varies ? ContentVariation.Culture : ContentVariation.Nothing,
            });
        }

        contentType.PropertyGroups.Add(group);

        if (templateAlias is not null)
        {
            var template = await EnsureTemplateAsync(templateAlias, name);
            if (template is not null)
            {
                contentType.AllowedTemplates = [template];
                contentType.SetDefaultTemplate(template);
            }
        }

        await SaveContentTypeAsync(contentType);
        return contentType;
    }

    /// <summary>
    ///     Registers a template with Umbraco using the Razor already sitting in <c>Views/</c>.
    /// </summary>
    /// <remarks>
    ///     A .cshtml file on disk is not a template as far as Umbraco is concerned — templates are
    ///     database records, and a content type can only point at one of those. Rather than embed
    ///     Razor in a C# string literal, this reads the real view file so the markup keeps its
    ///     tooling, syntax highlighting and diffs.
    /// </remarks>
    private async Task<ITemplate?> EnsureTemplateAsync(string alias, string name)
    {
        var existing = await _templateService.GetAsync(alias);
        if (existing is not null)
        {
            return existing;
        }

        var path = System.IO.Path.Combine(_hostEnvironment.ContentRootPath, "Views", $"{alias}.cshtml");
        if (System.IO.File.Exists(path) is false)
        {
            _logger.LogWarning("No view file at {Path}; {Alias} will render with no template.", path, alias);
            return null;
        }

        var content = await System.IO.File.ReadAllTextAsync(path);
        var result = await _templateService.CreateAsync(name, alias, content, Constants.Security.SuperUserKey);

        if (result.Success is false)
        {
            _logger.LogWarning("Could not create the {Alias} template: {Status}.", alias, result.Status);
            return null;
        }

        return result.Result;
    }

    private async Task AllowChildrenAsync(IContentType parent, params IContentType[] children)
    {
        parent.AllowedContentTypes = children
            .Select((child, index) => new ContentTypeSort(child.Key, index, child.Alias))
            .ToArray();

        await SaveContentTypeAsync(parent);
    }

    private async Task SaveContentTypeAsync(IContentType contentType)
    {
        var result = contentType.HasIdentity
            ? await _contentTypeService.UpdateAsync(contentType, Constants.Security.SuperUserKey)
            : await _contentTypeService.CreateAsync(contentType, Constants.Security.SuperUserKey);

        if (result.Success is false)
        {
            throw new InvalidOperationException(
                $"Could not save the {contentType.Alias} content type: {result.Result}.");
        }
    }

    // ------------------------------------------------------------------ content

    private IContent CreateContent(
        IContentType homePageType,
        IContentType landingPageType,
        IContentType sharedContentType,
        IContentType heroType,
        IContentType textType,
        IContentType ctaType)
    {
        // A single root, so routing has no ambiguity to resolve. The shared node lives under Home
        // and has no template, so it never renders a page of its own — it only ever appears as
        // somebody else's footer, which is exactly the "amber, shared" case uPeek exists to flag.
        var home = _contentService.Create("Home", Constants.System.Root, homePageType.Alias);
        home.SetCultureName("Home", "en-US");
        home.SetCultureName("Forside", DemoLanguage);
        home.SetValue(Properties.PageTitle, "Where does this text come from?", "en-US");
        home.SetValue(Properties.PageTitle, "Hvor kommer denne tekst fra?", DemoLanguage);
        home.SetValue(
            Properties.Introduction,
            "Arm uPeek and hover anything on this page. It will tell you the node, the property alias, the culture and who last touched it.",
            "en-US");
        home.SetValue(
            Properties.Introduction,
            "Aktivér uPeek og hold musen over hvad som helst på denne side.",
            DemoLanguage);

        // Filled in diligently on every page, rendered by no template anywhere. This is the row the
        // usage report is built to find.
        home.SetValue(Properties.SeoKeywords, "umbraco, content inspector, devtools, cms", "en-US");
        home.SetValue(Properties.SeoKeywords, "umbraco, indholdsinspektor, cms", DemoLanguage);

        home.SetValue(Properties.ContentBlocks, BuildHomeBlocks(heroType, textType, ctaType), "en-US");
        home.SetValue(Properties.ContentBlocks, BuildHomeBlocksDanish(heroType, textType), DemoLanguage);

        _contentService.Save(home);
        _contentService.Publish(home, ["*"]);

        var shared = _contentService.Create("Shared content", home.Id, sharedContentType.Alias);
        shared.SetCultureName("Shared content", "en-US");
        shared.SetCultureName("Delt indhold", DemoLanguage);
        shared.SetValue(
            Properties.FooterText,
            "<p>uPeek is a demo site. Nothing here is real.</p><p>Every word on this page came from a content property, and uPeek can tell you which one.</p>",
            "en-US");
        shared.SetValue(
            Properties.FooterText,
            "<p>uPeek er et demowebsted. Intet her er virkeligt.</p><p>Hvert ord på denne side kommer fra en indholdsegenskab.</p>",
            DemoLanguage);

        // Excluded from orphan reporting in appsettings: it is the kind of value that renders in an
        // email template rather than on a page, and page-view sampling is blind to those.
        shared.SetValue(Properties.ContactEmail, "hello@peek.local");
        _contentService.Save(shared);
        _contentService.Publish(shared, ["*"]);

        home.SetValue(Properties.SharedFooter, shared.GetUdi().ToString());
        _contentService.Save(home);
        _contentService.Publish(home, ["*"]);

        var landing = _contentService.Create("Solutions", home.Id, landingPageType.Alias);
        landing.SetCultureName("Solutions", "en-US");
        landing.SetCultureName("Løsninger", DemoLanguage);
        landing.SetValue(Properties.PageTitle, "Solutions", "en-US");
        landing.SetValue(Properties.PageTitle, "Løsninger", DemoLanguage);
        landing.SetValue(
            Properties.Introduction,
            "A second page on a different doctype, so the usage report has more than one row to talk about.",
            "en-US");

        // Deliberately left empty for da-DK, so the per-culture breakdown has a real difference to
        // report rather than a symmetrical one.
        landing.SetValue(Properties.SeoKeywords, "solutions, services, consulting", "en-US");
        landing.SetValue(Properties.ContentBlocks, BuildLandingBlocks(textType), "en-US");

        _contentService.Save(landing);
        _contentService.Publish(landing, ["*"]);

        return home;
    }

    /// <summary>
    ///     Binds a culture to a path so the variant content can actually be routed.
    /// </summary>
    /// <remarks>
    ///     Without this, culture-variant content has no URL at all and every front-end request 404s.
    ///     Path-based domains (<c>/en</c>, <c>/da</c>) keep the demo runnable on localhost without
    ///     needing a hosts file entry.
    /// </remarks>
    private async Task AssignDomainsAsync(IContent home)
    {
        var result = await _domainService.UpdateDomainsAsync(
            home.Key,
            new DomainsUpdateModel
            {
                DefaultIsoCode = "en-US",
                Domains =
                [
                    new DomainModel { DomainName = "/en", IsoCode = "en-US" },
                    new DomainModel { DomainName = "/da", IsoCode = DemoLanguage },
                ],
            });

        if (result.Success is false)
        {
            _logger.LogWarning("Could not assign demo domains: {Status}.", result.Status);
        }
    }

    private string BuildHomeBlocks(IContentType heroType, IContentType textType, IContentType ctaType)
    {
        var hero = NewBlock(heroType, "en-US",
            (Properties.Heading, "Devtools for your content"),
            (Properties.Subheading, "Hover anything on your site, see exactly where it lives."));

        var text = NewBlock(textType, "en-US",
            (Properties.Title, "Why this is hard today"),
            (Properties.BodyText,
                "<p>Right now the answer is: guess the node, grep the templates, or ask the developer who built it three years ago and left.</p>" +
                "<p>Block-based content makes it worse, because the text you are looking at may live four levels below the page that owns the URL.</p>"));

        var cta = NewBlock(ctaType, "en-US", (Properties.Label, "Read the architecture notes"));

        // The link is invariant, so it is set with no culture at all. The overlay should show this
        // one as "all languages".
        cta.Values.Add(new BlockPropertyValue { Alias = Properties.Link, Value = "/docs/architecture" });

        return Serialize([hero, text, cta], "en-US");
    }

    private string BuildHomeBlocksDanish(IContentType heroType, IContentType textType)
    {
        var hero = NewBlock(heroType, DemoLanguage,
            (Properties.Heading, "Devtools til dit indhold"),
            (Properties.Subheading, "Hold musen over hvad som helst, og se hvor det bor."));

        var text = NewBlock(textType, DemoLanguage,
            (Properties.Title, "Hvorfor er det svært i dag?"),
            (Properties.BodyText,
                "<p>Svaret er i dag: gæt på noden, søg i templates, eller spørg udvikleren der byggede det for tre år siden.</p>"));

        return Serialize([hero, text], DemoLanguage);
    }

    private string BuildLandingBlocks(IContentType textType)
    {
        var text = NewBlock(textType, "en-US",
            (Properties.Title, "One doctype, two pages"),
            (Properties.BodyText, "<p>The usage report aggregates by document type, not by page.</p>"));

        return Serialize([text], "en-US");
    }

    private static BlockItemData NewBlock(
        IContentType elementType,
        string culture,
        params (string Alias, string Value)[] values)
    {
        var block = new BlockItemData(Guid.NewGuid(), elementType.Key, elementType.Alias);

        foreach (var (alias, value) in values)
        {
            block.Values.Add(new BlockPropertyValue
            {
                Alias = alias,
                Value = value,
                Culture = culture,
            });
        }

        return block;
    }

    /// <summary>
    ///     Serialises a Block List value. Note <c>Expose</c>: since Umbraco 14 a block is only
    ///     rendered for a culture that explicitly exposes it, and forgetting this produces an empty
    ///     block list with no error anywhere.
    /// </summary>
    private string Serialize(BlockItemData[] blocks, string culture)
    {
        var value = new BlockListValue(blocks.Select(block => new BlockListLayoutItem(block.Key)))
        {
            ContentData = blocks.ToList(),
            SettingsData = [],
            Expose = blocks
                .Select(block => new BlockItemVariation(block.Key, culture, null))
                .ToList(),
        };

        return _jsonSerializer.Serialize(value);
    }
}
