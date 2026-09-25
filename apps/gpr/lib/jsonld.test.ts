import { describe, expect, it } from 'vitest';
import { countryPageList } from '../content/countries';
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
  it('renders all fifteen countries', () => {
    expect(countryPageList.length).toBe(15);
  });

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
      expect(s.indexOf(t('M-04.mean'))).not.toBe(-1);
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
