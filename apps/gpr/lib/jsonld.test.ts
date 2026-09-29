import { describe, expect, it } from 'vitest';
import { countryPageList } from '../content/countries';
import { GENERATED_COUNTRY_SLUGS } from '../content/registries/countries';
import { resolveTokens, t } from '../content/tokens';
import {
  asciiEscapedLength,
  byteLength,
  countryPageGraph,
  serializeJsonLd,
  articleGraph,
  collectionPageGraph,
  homeGraph,
  ORGANIZATION_ID,
  PERSON_ID,
} from './jsonld';

const LIMIT = 7000;
const Q = '[' + 'Q]';

describe('country page JSON-LD', () => {
  it('renders every generated country in the registry', () => {
    expect(countryPageList.length).toBeGreaterThanOrEqual(15);
    expect(countryPageList.map((p) => p.slug).sort()).toEqual(
      GENERATED_COUNTRY_SLUGS.slice().sort()
    );
  });

  /** Register means a country schema may cite (M-04 or a cohort row). */
  const MEANS = [
    'M-04',
    'M-05',
    'M-06',
    'M-07',
    'M-09',
    'M-10',
    'M-11',
    'M-21',
  ];

  countryPageList.forEach((page) => {
    it(`${page.slug}: Service + FAQPage under ${LIMIT} chars in every count`, () => {
      const g = countryPageGraph(page);
      const s = serializeJsonLd(g);
      expect(g['@graph'].map((n) => n['@type'])).toEqual([
        'Service',
        'FAQPage',
      ]);
      expect(s.length).toBeLessThan(LIMIT);
      expect(asciiEscapedLength(s)).toBeLessThan(LIMIT);
      expect(byteLength(s)).toBeLessThan(LIMIT);
      expect(s.indexOf(Q)).toBe(-1);
      expect(s.indexOf('{{')).toBe(-1);
      if (page.archetype === 'august') {
        // August handoffs cite a cohort mean, or M-04 (exact or rounded)
        const cited = MEANS.map((id) => t(id + '.mean')).concat([
          t('M-04.meanShort'),
          t('M-04.meanRounded'),
        ]);
        expect(cited.some((v) => s.indexOf(v) !== -1)).toBe(true);
      } else {
        expect(s.indexOf(t('M-04.mean'))).not.toBe(-1);
      }
      const svc = g['@graph'][0] as {
        provider: { '@id': string };
        url: string;
      };
      expect(svc.provider['@id']).toBe(ORGANIZATION_ID);
      expect(svc.url).toBe('https://www.germanypensionrefund.com/' + page.slug);
    });
  });

  it('omits FAQ items flagged inSchema: false', () => {
    const withHidden = countryPageList.filter((p) =>
      p.faq.some((f) => f.inSchema === false)
    );
    expect(withHidden.map((p) => p.slug).sort()).toEqual([
      'mexico',
      'nigeria',
      'pakistan',
    ]);
    withHidden.forEach((p) => {
      const faq = countryPageGraph(p)['@graph'][1] as { mainEntity: unknown[] };
      expect(faq.mainEntity.length).toBe(
        p.faq.filter((f) => f.inSchema !== false).length
      );
    });
  });

  it('August pages take the FAQPage from Appendix B (schemaFaq)', () => {
    const august = countryPageList.filter((p) => p.archetype === 'august');
    expect(august.length).toBeGreaterThan(0);
    august.forEach((p) => {
      expect(p.schemaFaq && p.schemaFaq.length).toBeGreaterThan(0);
      const faq = countryPageGraph(p)['@graph'][1] as { mainEntity: unknown[] };
      expect(faq.mainEntity.length).toBe((p.schemaFaq || []).length);
    });
  });
});

describe('other builders', () => {
  it('article graph carries Person, Article, BreadcrumbList and FAQPage', () => {
    const g = articleGraph({
      path: '/post/example',
      headline: 'Example',
      description: '{{M-04.sentence.meta}}',
      datePublished: '2026-01-01',
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Example', path: '/post/example' },
      ],
      faq: [{ q: 'Q?', a: 'A.' }],
    });
    expect(g['@graph'].map((n) => n['@type'])).toEqual([
      'Person',
      'Article',
      'BreadcrumbList',
      'FAQPage',
    ]);
    const article = g['@graph'][1] as {
      description: string;
      author: { '@id': string };
    };
    expect(article.description).toBe(resolveTokens('{{M-04.sentence.meta}}'));
    expect(article.author['@id']).toBe(PERSON_ID);
  });

  it('collection graph numbers its items', () => {
    const g = collectionPageGraph({
      path: '/download',
      name: 'Downloads',
      description: 'd',
      items: [{ name: 'a' }, { name: 'b' }],
    });
    const list = g['@graph'][1] as { numberOfItems: number };
    expect(list.numberOfItems).toBe(2);
  });

  it('home graph has no AggregateRating', () => {
    const s = serializeJsonLd(
      homeGraph({ serviceName: 's', serviceDescription: 'd', faq: [] })
    );
    expect(s.indexOf('AggregateRating')).toBe(-1);
    expect(s.indexOf('"foundingDate":"2022"')).not.toBe(-1);
    expect(s.indexOf('"datePublished":"2015"')).not.toBe(-1);
  });
});

describe('token store', () => {
  it('throws on unknown references and literal markers', () => {
    expect(() => resolveTokens('{{M-99.mean}}')).toThrow();
    expect(() => resolveTokens('{{M-04.nope}}')).toThrow();
    expect(() => resolveTokens('value ' + Q)).toThrow();
  });
  it('fills nested slots', () => {
    expect(t('M-04.sentence')).toContain('€53,000');
    expect(t('M-15.sentence')).toBe(
      'Over 4.9/5 on ProvenExpert from more than 1,250 reviews'
    );
  });
});
