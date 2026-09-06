using System.Collections;
using System.Globalization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Community.Peek.Configuration;
using Umbraco.Community.Peek.Inspection.Matching;
using Umbraco.Community.Peek.Manifest;
using Umbraco.Extensions;

namespace Umbraco.Community.Peek.Inspection;

/// <summary>
///     Walks the published content graph outward from a routed page and produces every property
///     value that could plausibly appear in that page's output.
/// </summary>
/// <remarks>
///     <para>
///         This is deliberately a graph walk rather than an instrumented read log. Umbraco caches
///         converted property values by cache level, so a converter-level hook records a read on a
///         cold cache and nothing at all on a warm one — which would make "never rendered" mean
///         "somebody else's request already warmed this". Walking the graph gives the same answer on
///         every request, at the cost of including values a template never asked for. That is a
///         trade Peek makes on purpose, and it is why the report says "0 observed renders" rather
///         than "unused".
///     </para>
///     <para>
///         The walk is bounded three ways: depth, total candidate count, and a visited set. A
///         content graph with a picker cycle in it must not be able to hang a page render.
///     </para>
/// </remarks>
public sealed class PeekCandidateCollector
{
    private readonly IPublishedUrlProvider _urlProvider;
    private readonly PeekBackofficeUrls _backofficeUrls;
    private readonly IContentTypeService _contentTypeService;
    private readonly IMediaTypeService _mediaTypeService;
    private readonly IUserService _userService;
    private readonly IOptionsMonitor<PeekOptions> _options;
    private readonly ILogger<PeekCandidateCollector> _logger;

    public PeekCandidateCollector(
        IPublishedUrlProvider urlProvider,
        PeekBackofficeUrls backofficeUrls,
        IContentTypeService contentTypeService,
        IMediaTypeService mediaTypeService,
        IUserService userService,
        IOptionsMonitor<PeekOptions> options,
        ILogger<PeekCandidateCollector> logger)
    {
        _urlProvider = urlProvider;
        _backofficeUrls = backofficeUrls;
        _contentTypeService = contentTypeService;
        _mediaTypeService = mediaTypeService;
        _userService = userService;
        _options = options;
        _logger = logger;
    }

    public PeekCandidateSet Collect(IPublishedContent page, string? culture, string? segment)
    {
        var walk = new Walk(this, culture, segment, _options.CurrentValue);
        walk.WalkElement(page, PeekSourceKind.OwnedProperty, breadcrumb: [], depth: 0);

        return new PeekCandidateSet
        {
            Page = walk.NodeFor(page.Key),
            Nodes = walk.Nodes,
            Entries = walk.Entries,
            Truncated = walk.Truncated,
            Warnings = walk.Warnings,
        };
    }

    /// <summary>All mutable state for a single walk, so the collector itself stays thread safe.</summary>
    private sealed class Walk
    {
        private readonly PeekCandidateCollector _owner;
        private readonly string? _culture;
        private readonly string? _segment;
        private readonly PeekOptions _options;
        private readonly Dictionary<Guid, PeekNodeRef> _nodes = [];
        private readonly List<PeekEntry> _entries = [];
        private readonly HashSet<Guid> _visited = [];
        private readonly Dictionary<Guid, (string? Name, string? Icon)> _contentTypeCache = [];
        private readonly Dictionary<int, string?> _userCache = [];
        private readonly List<string> _warnings = [];
        private int _nextId = 1;

        // A block's own IPublishedElement carries no real name, update date or writer — those only
        // exist on the document that hosts it. Tracking the nearest owning document lets a block's
        // node borrow that document's metadata instead of showing Umbraco's defaults for it.
        private Guid _ownerDocumentKey;

        public Walk(PeekCandidateCollector owner, string? culture, string? segment, PeekOptions options)
        {
            _owner = owner;
            _culture = culture;
            _segment = segment;
            _options = options;
        }

        public IReadOnlyList<PeekNodeRef> Nodes => _nodes.Values.ToList();

        public IReadOnlyList<PeekEntry> Entries => _entries;

        public IReadOnlyList<string> Warnings => _warnings;

        public bool Truncated { get; private set; }

        public PeekNodeRef? NodeFor(Guid key) => _nodes.GetValueOrDefault(key);

        private bool AtCapacity => _entries.Count >= _options.Inspector.MaxCandidates;

        public void WalkElement(
            IPublishedElement element,
            PeekSourceKind sourceKind,
            IReadOnlyList<PeekBreadcrumbSegment> breadcrumb,
            int depth)
        {
            if (depth > _options.Inspector.MaxDepth || AtCapacity)
            {
                Truncated = true;
                return;
            }

            // Elements inside blocks are keyed per block instance, so revisiting a key means a
            // genuine cycle rather than legitimate reuse.
            if (!_visited.Add(element.Key))
            {
                return;
            }

            var kind = RegisterNode(element);

            var previousOwner = _ownerDocumentKey;
            if (kind != PeekNodeKind.Element)
            {
                _ownerDocumentKey = element.Key;
            }

            try
            {
                foreach (var propertyType in element.ContentType.PropertyTypes)
                {
                    if (AtCapacity)
                    {
                        Truncated = true;
                        return;
                    }

                    var property = element.GetProperty(propertyType.Alias);
                    if (property is null)
                    {
                        continue;
                    }

                    // Pass the culture only for properties that actually vary by it. Umbraco tolerates
                    // either, but being explicit here is what lets the manifest tell the user that one
                    // value is shared across every language.
                    var variesByCulture = propertyType.Variations.VariesByCulture();
                    var variesBySegment = propertyType.Variations.VariesBySegment();
                    var propertyCulture = variesByCulture ? _culture : null;
                    var propertySegment = variesBySegment ? _segment : null;

                    object? value;
                    try
                    {
                        value = property.GetValue(propertyCulture, propertySegment);
                    }
                    catch (Exception ex)
                    {
                        // A third-party value converter throwing must not take the page down with it.
                        _owner._logger.LogDebug(
                            ex,
                            "Peek could not read {ContentType}.{Property}",
                            element.ContentType.Alias,
                            propertyType.Alias);
                        _warnings.Add($"Could not read {element.ContentType.Alias}.{propertyType.Alias}");
                        continue;
                    }

                    var context = new PropertyContext(
                        element,
                        propertyType,
                        propertyCulture,
                        propertySegment,
                        variesByCulture,
                        sourceKind,
                        breadcrumb);

                    AddValue(value, context, depth);
                }
            }
            finally
            {
                _ownerDocumentKey = previousOwner;
            }
        }

        private void AddValue(object? value, PropertyContext context, int depth)
        {
            switch (value)
            {
                case null:
                    AddTextEntry(null, context, isHtml: false);
                    return;

                case string text:
                    AddTextEntry(text, context, isHtml: false);
                    return;

                case IHtmlEncodedString html:
                    AddTextEntry(html.ToHtmlString(), context, isHtml: true);
                    return;

                case BlockGridModel grid:
                    AddBlockGrid(grid, context, depth);
                    return;

                case BlockListModel list:
                    AddBlockList(list, context, depth);
                    return;

                case MediaWithCrops mediaWithCrops:
                    AddMedia(mediaWithCrops.Content, context, index: null);
                    return;

                case IPublishedContent content:
                    AddContentReference(content, context, depth, index: null);
                    return;

                case IPublishedElement nested:
                    // A single block, or an element picker pointing at a Library element.
                    WalkElement(nested, PeekSourceKind.Shared, Extend(context, index: null, nested), depth + 1);
                    return;

                case IEnumerable<string> strings:
                    AddTextEntry(string.Join(" | ", strings), context, isHtml: false);
                    return;

                case IEnumerable enumerable:
                    AddEnumerable(enumerable, context, depth);
                    return;

                default:
                    AddTextEntry(Convert.ToString(value, CultureInfo.InvariantCulture), context, isHtml: false);
                    return;
            }
        }

        private void AddEnumerable(IEnumerable enumerable, PropertyContext context, int depth)
        {
            var index = 0;
            foreach (var item in enumerable)
            {
                if (AtCapacity)
                {
                    Truncated = true;
                    return;
                }

                switch (item)
                {
                    case MediaWithCrops mediaWithCrops:
                        AddMedia(mediaWithCrops.Content, context, index);
                        break;
                    case IPublishedContent content:
                        AddContentReference(content, context, depth, index);
                        break;
                    case BlockListItem blockListItem:
                        AddBlockItem(blockListItem.Content, blockListItem.Settings, context, index, depth);
                        break;
                    case BlockGridItem blockGridItem:
                        AddGridItem(blockGridItem, context, index, depth);
                        break;
                    case IPublishedElement element:
                        WalkElement(element, PeekSourceKind.Shared, Extend(context, index, element), depth + 1);
                        break;
                }

                index++;
            }
        }

        private void AddBlockList(BlockListModel list, PropertyContext context, int depth)
        {
            for (var i = 0; i < list.Count; i++)
            {
                AddBlockItem(list[i].Content, list[i].Settings, context, i, depth);
            }
        }

        private void AddBlockGrid(BlockGridModel grid, PropertyContext context, int depth)
        {
            for (var i = 0; i < grid.Count; i++)
            {
                AddGridItem(grid[i], context, i, depth);
            }
        }

        private void AddGridItem(BlockGridItem item, PropertyContext context, int index, int depth)
        {
            AddBlockItem(item.Content, item.Settings, context, index, depth);

            foreach (var area in item.Areas)
            {
                var areaCrumb = Extend(context, index, item.Content)
                    .Append(new PeekBreadcrumbSegment { Label = area.Alias, Icon = "icon-layout" })
                    .ToList();

                for (var i = 0; i < area.Count; i++)
                {
                    var areaItem = area[i];
                    WalkElement(
                        areaItem.Content,
                        PeekSourceKind.Block,
                        areaCrumb.Append(CrumbFor(areaItem.Content, i)).ToList(),
                        depth + 1);
                }
            }
        }

        private void AddBlockItem(
            IPublishedElement content,
            IPublishedElement? settings,
            PropertyContext context,
            int index,
            int depth)
        {
            WalkElement(content, PeekSourceKind.Block, Extend(context, index, content), depth + 1);

            if (settings is not null)
            {
                var crumb = Extend(context, index, content)
                    .Append(new PeekBreadcrumbSegment { Label = "settings", Icon = "icon-settings" })
                    .ToList();
                WalkElement(settings, PeekSourceKind.Block, crumb, depth + 1);
            }
        }

        private void AddContentReference(IPublishedContent content, PropertyContext context, int depth, int? index)
        {
            if (content.ItemType == PublishedItemType.Media)
            {
                AddMedia(content, context, index);
                return;
            }

            // A picked document renders somebody else's content on this page. Amber.
            WalkElement(content, PeekSourceKind.Shared, Extend(context, index, content), depth + 1);
        }

        private void AddMedia(IPublishedContent media, PropertyContext context, int? index)
        {
            RegisterNode(media);

            string? url = null;
            try
            {
                url = _owner._urlProvider.GetMediaUrl(media, culture: _culture);
            }
            catch (Exception ex)
            {
                _owner._logger.LogDebug(ex, "Peek could not resolve a media URL for {Key}", media.Key);
            }

            _entries.Add(new PeekEntry
            {
                Id = NextId(),
                NodeKey = context.Owner.Key,
                PropertyAlias = context.PropertyType.Alias,
                PropertyName = context.PropertyType.Alias,
                EditorAlias = context.PropertyType.EditorAlias,
                Culture = context.Culture,
                Segment = context.Segment,
                SourceKind = PeekSourceKind.Media,
                Breadcrumb = Extend(context, index, media),
                ValuePreview = media.Name,
                MediaUrl = url,
                MatchTexts = [],
                State = url is null ? PeekMatchState.Unmatchable : PeekMatchState.Candidate,
                Unmatchable = url is null ? "noUrl" : null,
                InvariantAcrossCultures = !context.VariesByCulture,
                EditUrl = _owner._backofficeUrls.MediaWorkspace(media.Key),
            });
        }

        private void AddTextEntry(string? raw, PropertyContext context, bool isHtml)
        {
            var matching = _options.Matching;
            var display = isHtml ? PeekText.StripHtml(raw) : PeekText.Normalise(raw);

            IReadOnlyList<string> fragments = isHtml
                ? PeekText.SplitHtmlIntoFragments(raw, matching.MinimumValueLength)
                : display.Length == 0
                    ? []
                    : [display];

            var unmatchable = PeekText.UnmatchableReason(
                display,
                matching.MinimumValueLength,
                matching.MatchNumericValues);

            var state = display.Length == 0
                ? PeekMatchState.Empty
                : unmatchable is not null || fragments.Count == 0
                    ? PeekMatchState.Unmatchable
                    : PeekMatchState.Candidate;

            _entries.Add(new PeekEntry
            {
                Id = NextId(),
                NodeKey = context.Owner.Key,
                PropertyAlias = context.PropertyType.Alias,
                PropertyName = context.PropertyType.Alias,
                EditorAlias = context.PropertyType.EditorAlias,
                Culture = context.Culture,
                Segment = context.Segment,
                SourceKind = context.SourceKind,
                Breadcrumb = context.Breadcrumb
                    .Append(new PeekBreadcrumbSegment
                    {
                        Label = context.PropertyType.Alias,
                        PropertyAlias = context.PropertyType.Alias,
                    })
                    .ToList(),
                ValuePreview = PeekText.Truncate(display, matching.PreviewLength),
                MatchTexts = state == PeekMatchState.Candidate ? fragments : [],
                State = state,
                Unmatchable = state == PeekMatchState.Unmatchable ? unmatchable ?? "noFragments" : null,
                InvariantAcrossCultures = !context.VariesByCulture,
                EditUrl = EditUrlFor(context),
            });
        }

        private string? EditUrlFor(PropertyContext context)
        {
            var node = _nodes.GetValueOrDefault(context.Owner.Key);
            return node?.Kind switch
            {
                PeekNodeKind.Document => _owner._backofficeUrls.DocumentWorkspace(
                    context.Owner.Key,
                    context.Culture,
                    context.PropertyType.Alias),
                PeekNodeKind.Element => _owner._backofficeUrls.ElementWorkspace(
                    context.Owner.Key,
                    context.Culture,
                    context.PropertyType.Alias),
                PeekNodeKind.Media => _owner._backofficeUrls.MediaWorkspace(
                    context.Owner.Key,
                    context.PropertyType.Alias),
                _ => null,
            };
        }

        private PeekNodeKind RegisterNode(IPublishedElement element)
        {
            if (_nodes.TryGetValue(element.Key, out var existing))
            {
                return existing.Kind;
            }

            var content = element as IPublishedContent;
            var kind = element.ContentType.ItemType switch
            {
                PublishedItemType.Media => PeekNodeKind.Media,
                PublishedItemType.Content when !element.ContentType.IsElement => PeekNodeKind.Document,
                _ => PeekNodeKind.Element,
            };

            var (typeName, typeIcon) = LookupContentType(element.ContentType.Key, kind);

            // A block (or any other bare IPublishedElement) is not an IPublishedContent, so it has
            // no name, update date or writer of its own — Umbraco hands back defaults for those.
            // Borrow the owning document's instead; that document is the thing someone actually
            // edited.
            var owner = kind == PeekNodeKind.Element ? _nodes.GetValueOrDefault(_ownerDocumentKey) : null;

            _nodes[element.Key] = new PeekNodeRef
            {
                Key = element.Key,
                Id = element.Id,
                Name = content?.Name ?? owner?.Name ?? element.Name,
                Kind = kind,
                ContentTypeAlias = element.ContentType.Alias,
                ContentTypeName = typeName,
                ContentTypeKey = element.ContentType.Key,
                ContentTypeIcon = typeIcon,
                IsElement = element.ContentType.IsElement,
                Url = kind == PeekNodeKind.Document ? SafeUrl(content) : null,
                EditUrl = kind switch
                {
                    PeekNodeKind.Document => _owner._backofficeUrls.DocumentWorkspace(element.Key, _culture),
                    PeekNodeKind.Media => _owner._backofficeUrls.MediaWorkspace(element.Key),
                    _ => _owner._backofficeUrls.ElementWorkspace(element.Key, _culture),
                },
                PublishState = PublishStateFor(element, kind),
                UpdateDate = owner?.UpdateDate ?? element.UpdateDate,
                LastEditedBy = owner?.LastEditedBy ?? LookupUser(element.WriterId),
                Cultures = owner?.Cultures ?? element.Cultures.Keys.ToList(),
            };

            return kind;
        }

        private PeekPublishState PublishStateFor(IPublishedElement element, PeekNodeKind kind)
        {
            if (kind != PeekNodeKind.Document)
            {
                return PeekPublishState.NotApplicable;
            }

            try
            {
                var published = element.IsPublished(_culture);
                var draft = element.IsDraft(_culture);

                // Half the "where does this text come from" questions are really "why isn't my
                // change showing", and this pill answers those instantly.
                return (published, draft) switch
                {
                    (true, true) => PeekPublishState.DraftChangesPending,
                    (true, false) => PeekPublishState.Published,
                    _ => PeekPublishState.Unpublished,
                };
            }
            catch (Exception)
            {
                return PeekPublishState.NotApplicable;
            }
        }

        private string? SafeUrl(IPublishedContent? content)
        {
            if (content is null)
            {
                return null;
            }

            try
            {
                return _owner._urlProvider.GetUrl(content, culture: _culture);
            }
            catch (Exception)
            {
                return null;
            }
        }

        private (string? Name, string? Icon) LookupContentType(Guid key, PeekNodeKind kind)
        {
            if (_contentTypeCache.TryGetValue(key, out var cached))
            {
                return cached;
            }

            (string? Name, string? Icon) result;
            try
            {
                if (kind == PeekNodeKind.Media)
                {
                    var mediaType = _owner._mediaTypeService.Get(key);
                    result = mediaType is null ? (null, null) : (mediaType.Name, mediaType.Icon);
                }
                else
                {
                    var contentType = _owner._contentTypeService.Get(key);
                    result = contentType is null ? (null, null) : (contentType.Name, contentType.Icon);
                }
            }
            catch (Exception)
            {
                result = (null, null);
            }

            _contentTypeCache[key] = result;
            return result;
        }

        private string? LookupUser(int userId)
        {
            if (_userCache.TryGetValue(userId, out var cached))
            {
                return cached;
            }

            string? name;
            try
            {
                name = _owner._userService.GetUserById(userId)?.Name;
            }
            catch (Exception)
            {
                name = null;
            }

            _userCache[userId] = name;
            return name;
        }

        private IReadOnlyList<PeekBreadcrumbSegment> Extend(
            PropertyContext context,
            int? index,
            IPublishedElement target)
            => context.Breadcrumb
                .Append(new PeekBreadcrumbSegment
                {
                    Label = index is null
                        ? context.PropertyType.Alias
                        : $"{context.PropertyType.Alias}[{index}]",
                    PropertyAlias = context.PropertyType.Alias,
                    Index = index,
                    NodeKey = target.Key,
                })
                .ToList();

        private static PeekBreadcrumbSegment CrumbFor(IPublishedElement element, int index) => new()
        {
            Label = $"{element.ContentType.Alias}[{index}]",
            Index = index,
            NodeKey = element.Key,
        };

        private string NextId() => "e" + _nextId++;
    }

    private readonly record struct PropertyContext(
        IPublishedElement Owner,
        IPublishedPropertyType PropertyType,
        string? Culture,
        string? Segment,
        bool VariesByCulture,
        PeekSourceKind SourceKind,
        IReadOnlyList<PeekBreadcrumbSegment> Breadcrumb);
}
