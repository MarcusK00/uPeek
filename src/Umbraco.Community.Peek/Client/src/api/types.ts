/**
 * Response shapes for Peek's Management API. Mirrors `Reporting/Models/PeekReportModels.cs`.
 *
 * Hand-written rather than generated, so the repository builds from a clean checkout without first
 * needing a running site to scrape an OpenAPI document from. `npm run generate-client` prints the
 * command to regenerate these against a live site if you would rather have them derived.
 */

export type PeekVerdict =
  | 'InsufficientData'
  | 'Rendering'
  | 'HasContentNeverObserved'
  | 'AlwaysEmpty'
  | 'NotMeasurable'
  | 'ExcludedFromReporting';

export interface PeekSamplingStatus {
  enabled: boolean;
  sampleRate: number;
  daysCollected: number;
  minimumWindowDays: number;
  eligibleViews: number;
  sampledViews: number;
  minimumObservedPageViews: number;
  pendingFlush: number;
  firstObservedOn: string | null;
  lastObservedOn: string | null;
  hasEnoughData: boolean;
  progress: number;
}

export interface PeekCultureUsage {
  culture: string;
  observedCount: number;
  renderedCount: number;
  unmatchableCount: number;
  emptyCount: number;
  verdict: PeekVerdict;
  lastObservedOn: string | null;
}

export interface PeekPropertyUsage {
  propertyAlias: string;
  propertyName: string | null;
  editorAlias: string | null;
  variesByCulture: boolean;
  verdict: PeekVerdict;
  cultures: PeekCultureUsage[];
  totalObserved: number;
  totalRendered: number;
}

export interface PeekDocumentTypeUsage {
  contentTypeKey: string;
  alias: string;
  name: string | null;
  icon: string | null;
  sampling: PeekSamplingStatus;
  properties: PeekPropertyUsage[];
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

export interface PeekMediaUsage {
  mediaKey: string;
  name: string | null;
  url: string | null;
  referencedBy: PeekReference[];
  observedRenders: number;
  sampling: PeekSamplingStatus;
  isReferenced: boolean;
}

export interface PeekOrphanRow {
  contentTypeKey: string;
  contentTypeAlias: string;
  contentTypeName: string | null;
  contentTypeIcon: string | null;
  propertyAlias: string;
  propertyName: string | null;
  verdict: PeekVerdict;
  observedCount: number;
  renderedCount: number;
  deadCultures: string[];
  usageUrl: string | null;
}

export interface PeekOrphanReport {
  sampling: PeekSamplingStatus;
  rows: PeekOrphanRow[];
}

export interface PeekRenderLocation {
  nodeKey: string;
  name: string | null;
  url: string;
  culture: string;
  seenCount: number;
  lastSeen: string;
  editUrl: string | null;
}

export interface PeekReverseLookup {
  contentTypeKey: string;
  propertyAlias: string;
  sampling: PeekSamplingStatus;
  locations: PeekRenderLocation[];
}
