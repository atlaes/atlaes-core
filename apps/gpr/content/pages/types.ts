/**
 * Content model for the Stream H2 rules pages (/other-countries,
 * /former-yugoslavia): the country-page shape (hero, trust bar, at-a-glance
 * bullets, sections in data order, visible FAQ, close) with free-form rail
 * labels and optional review cards. Text reuses `Block`/`Span` from
 * `content/types.ts`; quarterly figures are token references.
 */
import type { Block, FaqItem } from '@/content/types';

export interface Crumb {
  label: string;
  href: string;
}

export interface Cta {
  label: string;
  href: string;
}

export interface RulesSection {
  /** HTML id of the H2 (anchor target). */
  id: string;
  /** Rail label (design element). */
  label: string;
  h2: string;
  blocks: Block[];
  tone?: 'plain' | 'surface' | 'tint';
}

export interface ReviewQuote {
  name: string;
  /** Date as shown on the page, e.g. "AUG/28/2026". */
  date?: string;
  title: string;
  text: string;
}

export interface RulesPageData {
  path: string;
  title: string;
  meta: string;
  crumbs: Crumb[];
  eyebrow: string;
  h1: string;
  hero: Block[];
  cta: Cta;
  glanceLabel: string;
  /** Trust-bar sentence (token reference). */
  trust: string;
  bullets: string[];
  jump: Array<{ href: string; label: string }>;
  sections: RulesSection[];
  /** Review cards rendered after the section (or 'faq') named in `after`. */
  reviews?: {
    after: string;
    label: string;
    h2: string;
    intro: Block;
    items: ReviewQuote[];
  };
  /** Section id after which the FAQ renders; last when omitted. */
  faqAfter?: string;
  faqH2: string;
  faq: FaqItem[];
  closeH2: string;
  close: Block[];
  closeCta: Cta;
  disclaimer: string;
  schema: {
    serviceName: string;
    audienceType: string;
    description: string;
  };
}
