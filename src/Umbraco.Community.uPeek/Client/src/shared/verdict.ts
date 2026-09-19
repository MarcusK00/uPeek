import type { PeekVerdict } from '../api/types.js';

/**
 * How each verdict is described to a human.
 *
 * The wording matters more than the code around it. uPeek never says "delete this" — it says what it
 * observed and how confident it is. An orphan report that is confidently wrong once (a property that
 * only renders in an order-confirmation email, or a sitemap, or a culture nobody visited during the
 * sample window) destroys trust in every other row.
 */
export interface VerdictPresentation {
  label: string;
  tone: 'positive' | 'warning' | 'danger' | 'neutral';
  description: string;
}

export const VERDICTS: Record<PeekVerdict, VerdictPresentation> = {
  Rendering: {
    label: 'Rendering',
    tone: 'positive',
    description: 'Observed reaching the page.',
  },
  HasContentNeverObserved: {
    label: '0 observed renders',
    tone: 'danger',
    description:
      'Editors are filling this in and it was never seen in any output. Worth investigating — not proof it is unused.',
  },
  AlwaysEmpty: {
    label: 'Always empty',
    tone: 'warning',
    description: 'No editor has put anything in this property on any page uPeek observed.',
  },
  NotMeasurable: {
    label: 'Not measurable',
    tone: 'neutral',
    description:
      'Has content, but of a kind uPeek cannot search the page for — too short, numeric, or not literal text. Absence of a match means nothing here.',
  },
  ExcludedFromReporting: {
    label: 'Excluded',
    tone: 'neutral',
    description:
      'Marked in configuration as rendering outside page requests — email templates, sitemaps, feeds, scheduled jobs. Page-view sampling is blind to these by construction.',
  },
  InsufficientData: {
    label: 'Collecting',
    tone: 'neutral',
    description: 'Not enough traffic observed yet to say anything about this property.',
  },
};

export function verdictColour(verdict: PeekVerdict): string {
  switch (VERDICTS[verdict].tone) {
    case 'positive':
      return 'positive';
    case 'danger':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'default';
  }
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/** DD-MM-YYYY, per the Danish default this package is written against. */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}
