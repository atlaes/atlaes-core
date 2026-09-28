/**
 * Shared content model for the GPR marketing pages.
 *
 * Text blocks carry plain text (`x`) plus a list of spans that mark the
 * substrings to render as links (`a`) or bold (`b`). Spans are matched by
 * text, not by offset, so token substitution (`{{M-04.sentence}}`) can run
 * on `x` before the spans are applied. Token references are resolved at
 * render time by `resolveTokens()` in `content/tokens.ts`; a literal Q marker
 * or an unresolved reference fails `pnpm --filter gpr check:content`.
 */

export type SpanKind = 'a' | 'b';

export interface Span {
  k: SpanKind;
  /** The exact substring of the block text this span covers. */
  x: string;
  /** Absolute or site-relative href; only for `k: 'a'`. */
  href?: string;
}

export interface RichText {
  x: string;
  sp?: Span[];
}

export type Block =
  | ({ t: 'p' } & RichText)
  | { t: 'h3'; x: string }
  | { t: 'note'; x: string }
  | { t: 'ul'; items: RichText[] }
  | { t: 'ol'; items: RichText[] }
  | { t: 'table'; rows: string[][] }
  /** Pill CTA row (handoff "CTA" / "links" components); first item primary. */
  | { t: 'cta'; items: Array<{ label: string; href: string }> }
  /** Review wall — the homepage reviews snapshot (`components/marketing/home/Reviews`). */
  | { t: 'reviews' };

export interface FaqItem {
  q: string;
  a: string;
  /** false = visible on the page but excluded from the FAQPage schema. */
  inSchema?: boolean;
}

/** The six jump-menu anchors shared by every country page. */
export type JumpAnchor =
  | 'do-i-qualify'
  | 'what-we-do'
  | 'journeys'
  | 'getting-paid'
  | 'certified-signatures'
  | 'faq';

export type CountryArchetype =
  /** Citizenship page, "Do I qualify" first (Argentina, NZ, Nigeria, …). */
  | 'citizenship'
  /** Citizenship page with the 60-month H2 before the service section. */
  | 'citizenship-60-first'
  /** Residence page: citizenship table instead of "Do I qualify". */
  | 'residence'
  /** Indonesia: citizenship and residence audiences on one page. */
  | 'hybrid'
  /** August 2026 handoffs (USA, India, Canada, …): sections in handoff order. */
  | 'august';

export type CountrySectionKind =
  | 'qualify'
  | 'citizenship-table'
  | 'residence'
  | 'service'
  | 'intake'
  | 'sixty-month'
  | 'waiting-period'
  | 'local-scheme'
  | 'journeys'
  | 'years'
  | 'amount'
  | 'office'
  | 'payout'
  | 'certification'
  | 'dual-citizenship'
  | 'family'
  /** August pages: fee section. */
  | 'cost'
  /** August pages: processing-time section. */
  | 'timing'
  /** August pages: the on-page FAQ H2, rendered in place from `faq`. */
  | 'faq'
  /** August pages: reviews / client-story sections. */
  | 'reviews'
  | 'other';

export interface CountrySection {
  /** HTML id of the H2. Equals the jump anchor when the section is one. */
  id: string;
  kind: CountrySectionKind;
  h2: string;
  blocks: Block[];
}

export interface CountryPageData {
  slug: string;
  /** Title tag, exactly as given in the handoff. */
  title: string;
  /** Meta description, exactly as given in the handoff. */
  meta: string;
  /** H1 text including the leading flag emoji, exactly as given. */
  h1: string;
  archetype: CountryArchetype;
  /** Handoff version line, for the report only. */
  version: string;
  hero: Block[];
  /** Trust-bar sentence; token reference resolved at render. */
  trust: string;
  /** Five hero bullets without the leading check mark. */
  bullets: string[];
  sections: CountrySection[];
  /** Visible FAQ. Empty on August pages without an on-page FAQ section. */
  faq: FaqItem[];
  /**
   * FAQPage schema items when they differ from the visible FAQ (August
   * handoffs word Appendix B separately). Falls back to `faq`.
   */
  schemaFaq?: FaqItem[];
  /** "Ready to claim?" paragraphs; the last one is the ID-02 disclaimer. */
  close: Block[];
  /** Closing H2 when the handoff has its own ("Ready to claim?" otherwise). */
  closeTitle?: string;
  /** false = the last close block is ordinary copy, not the ID-02 note. */
  closeDisclaimer?: boolean;
  /** Jump-menu anchor → section id. Missing anchors are skipped. */
  anchors: Partial<Record<JumpAnchor, string>>;
  schema: {
    serviceName: string;
    audienceType: string;
    /** Service description with the M-04 sentence as a token reference. */
    description: string;
  };
}
