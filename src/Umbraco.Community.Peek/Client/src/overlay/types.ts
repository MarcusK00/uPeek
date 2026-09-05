/**
 * Wire types shared with the C# side. These mirror `Manifest/PeekPageManifest.cs` and
 * `Inspection/PeekOverlayMiddleware.cs`; the `version` fields exist so a stale cached overlay
 * fails loudly instead of rendering nonsense.
 */

export type PeekSourceKind = 'OwnedProperty' | 'Block' | 'Shared' | 'Media';

export type PeekMatchState =
  | 'Empty'
  | 'Candidate'
  | 'Rendered'
  | 'Ambiguous'
  | 'NotRendered'
  | 'Unmatchable';

export type PeekNodeKind = 'Document' | 'Element' | 'Media';

export type PeekPublishState = 'Published' | 'DraftChangesPending' | 'Unpublished' | 'NotApplicable';

export interface PeekBootstrap {
  version: number;
  pageKey: string | null;
  pageId: number | null;
  pageName: string | null;
  documentTypeAlias: string | null;
  templateAlias: string | null;
  culture: string | null;
  segment: string | null;
  preview: boolean;
  url: string | null;
  viewerName: string | null;
  manifestUrl: string;
  usageUrl: string;
}

export interface PeekBreadcrumbSegment {
  label: string;
  propertyAlias?: string | null;
  index?: number | null;
  nodeKey?: string | null;
  icon?: string | null;
}

export interface PeekNodeRef {
  key: string;
  id: number;
  name: string | null;
  kind: PeekNodeKind;
  contentTypeAlias: string;
  contentTypeName: string | null;
  contentTypeKey: string | null;
  contentTypeIcon: string | null;
  isElement: boolean;
  url: string | null;
  editUrl: string | null;
  publishState: PeekPublishState;
  updateDate: string | null;
  lastEditedBy: string | null;
  cultures: string[];
}

export interface PeekEntry {
  id: string;
  nodeKey: string;
  propertyAlias: string;
  propertyName: string | null;
  editorAlias: string | null;
  culture: string | null;
  segment: string | null;
  sourceKind: PeekSourceKind;
  breadcrumb: PeekBreadcrumbSegment[];
  valuePreview: string | null;
  matchTexts: string[];
  mediaUrl: string | null;
  state: PeekMatchState;
  unmatchable: string | null;
  invariantAcrossCultures: boolean;
  editUrl: string | null;
}

export interface PeekMatchingOptions {
  minimumValueLength: number;
  matchNumericValues: boolean;
  previewLength: number;
}

export interface PeekPageManifest {
  version: number;
  url: string;
  culture: string | null;
  segment: string | null;
  preview: boolean;
  generatedAt: string;
  buildDurationMs: number;
  page: PeekNodeRef | null;
  nodes: PeekNodeRef[];
  entries: PeekEntry[];
  warnings: string[];
  matching: PeekMatchingOptions;
  truncated: boolean;
}

export interface PeekReference {
  nodeKey: string;
  name: string | null;
  contentTypeAlias: string | null;
  contentTypeName: string | null;
  contentTypeIcon: string | null;
  published: boolean | null;
  editUrl: string | null;
}

/** A resolved region: one DOM element attributed to one or more entries. */
export interface PeekRegion {
  element: HTMLElement;
  entries: PeekEntry[];
  /** Highest-confidence match kind that produced this region. */
  confidence: 'exact' | 'partial' | 'media' | 'attribute';
}
