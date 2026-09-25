import { describe, expect, it } from 'vitest';
import { resolveTokens } from '../../../content/tokens';
import { REVIEWS } from '../../../content/reviews';
import type { Block, RichText } from '../../../content/types';
import { homeGraph, serializeJsonLd } from '../../../lib/jsonld';
import {
  ABOUT,
  ARTICLES,
  ARTICLES_FOOTER,
  COMPANY_PENSION,
  ELIGIBILITY,
  FAQ,
  FAQ_FOOTER,
  FAQ_SCHEMA,
  HERO,
  HOME_META,
  HOME_SCHEMA,
  HOW_MUCH,
  INTRO,
  LAW_FIRM,
  MANAGED,
  QUALIFY,
  REVIEWS_SECTION,
  STAT_MICROCOPY,
  STAT_TILES,
  VIDEO,
} from './home-content';
import {
  HIW_FAQ,
  HIW_FAQ_SCHEMA,
  HIW_SECTIONS,
} from '../../../app/(marketing)/how-it-works/content';

const Q = '[' + 'Q]';

function richTexts(blocks: Block[]): RichText[] {
  const out: RichText[] = [];
  blocks.forEach((b) => {
    if (b.t === 'p') out.push(b);
    else if (b.t === 'ul' || b.t === 'ol') b.items.forEach((i) => out.push(i));
  });
  return out;
}

const HOME_BLOCKS: Block[] = [
  ...INTRO.blocks,
  ...ELIGIBILITY.blocks,
  ...MANAGED.blocks,
  ...MANAGED.after,
  ...COMPANY_PENSION.blocks,
  ...LAW_FIRM.blocks,
  ...VIDEO.blocks,
  ...QUALIFY.intro,
  ...QUALIFY.sixtyMonth,
  ...QUALIFY.rest,
  ...HOW_MUCH.blocks,
  ...ABOUT.blocks,
];
FAQ.forEach((f) => HOME_BLOCKS.push(...f.blocks));

const HIW_BLOCKS: Block[] = [];
HIW_SECTIONS.forEach((s) => {
  HIW_BLOCKS.push(...s.blocks);
  if (s.after) HIW_BLOCKS.push(...s.after);
});
HIW_FAQ.forEach((f) => HIW_BLOCKS.push(...f.blocks));

const ALL_RICH: RichText[] = [
  ...richTexts(HOME_BLOCKS),
  ...richTexts(HIW_BLOCKS),
  ...STAT_TILES.map((s) => s.caption),
  STAT_MICROCOPY,
  REVIEWS_SECTION.header,
  REVIEWS_SECTION.footer,
  FAQ_FOOTER,
  ARTICLES_FOOTER,
];

describe('homepage + how-it-works copy', () => {
  it('resolves every token reference and carries no Q marker', () => {
    ALL_RICH.forEach((r) => {
      const text = resolveTokens(r.x);
      expect(text).not.toContain('{{');
      expect(text).not.toContain(Q);
    });
    STAT_TILES.forEach((s) => {
      expect(resolveTokens(s.figure)).not.toContain('{{');
      expect(s.caption.x.length).toBeGreaterThan(0);
    });
    expect(HOME_META.description).not.toContain('{{');
    expect(HOME_META.ogDescription).not.toContain('{{');
  });

  it('finds every link / bold span in the resolved text', () => {
    ALL_RICH.forEach((r) => {
      const text = resolveTokens(r.x);
      (r.sp || []).forEach((sp) => {
        expect(text, `span "${sp.x}" in "${text.slice(0, 60)}"`).toContain(
          sp.x
        );
      });
    });
  });

  it('carries the figures the sheet marks as quarterly', () => {
    expect(HOME_META.description).toContain('€11,572');
    expect(HOME_META.ogDescription).toContain('more than three quarters');
    const intro = resolveTokens(INTRO.blocks[2].x);
    expect(intro).toContain('24 August 2026');
    expect(intro).toContain('under €200 to over €53,000');
    expect(resolveTokens(STAT_TILES[1].figure)).toBe('76.3% within 90 days');
    expect(resolveTokens(REVIEWS_SECTION.header.x)).toContain(
      '4.98 out of 5 on ProvenExpert, based on 1,252 reviews, including 1,007 reviews aggregated from three other sources (checked 25 August 2026)'
    );
    expect(resolveTokens(MANAGED.blocks[2].x)).toContain('40.5 days');
  });

  it('has the sheet counts: 3 bullets, 3 tiles, 9 + 8 FAQs, 10 reviews, 3 articles', () => {
    expect(HERO.bullets).toHaveLength(3);
    expect(HERO.bullets[2]).toContain('including VAT');
    expect(STAT_TILES).toHaveLength(3);
    expect(FAQ).toHaveLength(9);
    expect(FAQ_SCHEMA).toHaveLength(9);
    expect(HIW_FAQ).toHaveLength(8);
    expect(HIW_FAQ_SCHEMA).toHaveLength(8);
    expect(REVIEWS).toHaveLength(10);
    expect(ARTICLES).toHaveLength(3);
  });

  it('builds the home graph with the ATLAES organisation and nine questions', () => {
    const g = homeGraph({
      serviceName: HOME_SCHEMA.serviceName,
      serviceDescription: HOME_SCHEMA.serviceDescription,
      faq: FAQ_SCHEMA,
    });
    const org = g['@graph'][0] as Record<string, unknown>;
    expect(org['@type']).toBe('Organization');
    expect(org.legalName).toBe('ATLAES GmbH');
    expect(org.vatID).toBe('DE352845957');
    expect(org.foundingDate).toBe('2022');
    const site = g['@graph'][1] as Record<string, unknown>;
    expect(site.datePublished).toBe('2015');
    const faq = g['@graph'][3] as { mainEntity: unknown[] };
    expect(faq.mainEntity).toHaveLength(9);
    const json = serializeJsonLd(g);
    expect(json).not.toContain('{{');
    expect(json).not.toContain(Q);
    expect(json).not.toContain('AggregateRating');
  });
});
