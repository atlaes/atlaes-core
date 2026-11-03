import { describe, expect, it } from 'vitest';
import { resolveTokens } from '../content/tokens';
import { articleJsonLd } from '../components/marketing/article/jsonld';
import { cmsPostToArticle, inertText, type CmsPost } from './blog-api';

const Q = '[' + 'Q]';

function post(over: Partial<CmsPost> = {}): CmsPost {
  return {
    site: 'gpr',
    slug: 'claim-tips',
    path: '/post/claim-tips',
    lang: 'en',
    title: 'Five claim tips',
    seoTitle: 'Five German Pension Refund Claim Tips',
    metaDescription: 'Practical tips for a smooth refund claim.',
    excerpt: 'Tips.',
    coverImageUrl: 'https://api.example.com/api/blog/images/a.webp',
    coverImageAlt: 'A refund form',
    authorName: null,
    canonicalUrl: null,
    noindex: false,
    publishedAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-20T12:30:00.000Z',
    readingMinutes: 3,
    blocks: [
      {
        t: 'p',
        x: 'Read the guide first.',
        sp: [{ k: 'a', x: 'the guide', href: '/blog' }],
      },
      { t: 'h2', x: 'Documents', id: 'documents' },
      { t: 'img', url: 'https://x.test/i.png', alt: 'Form', caption: 'V0901' },
      { t: 'faq' },
    ],
    faq: [
      {
        q: 'How long?',
        a: 'About **six** months.',
        blocks: [
          {
            t: 'p',
            x: 'About six months.',
            sp: [{ k: 'b', x: 'six' }],
          },
        ],
      },
    ],
    ctas: [{ label: 'Check eligibility', href: '/check/3-step' }],
    ...over,
  };
}

describe('cmsPostToArticle', () => {
  it('maps a CMS post onto the article template', () => {
    const a = cmsPostToArticle(post());
    expect(a).toMatchObject({
      path: '/post/claim-tips',
      kind: 'post',
      lang: 'en',
      title: 'Five German Pension Refund Claim Tips',
      meta: 'Practical tips for a smooth refund claim.',
      h1: 'Five claim tips',
      headline: 'Five claim tips',
      rail: 'Article',
      reviewLine: 'Updated: 20 October 2026',
      datePublished: '2026-10-01',
      dateModified: '2026-10-20',
      imageUrl: 'https://api.example.com/api/blog/images/a.webp',
      faqTitle: 'Frequently asked questions',
      faqInSchema: true,
      cta: [{ label: 'Check eligibility', href: '/check/3-step' }],
    });
    expect(a.crumbs).toEqual([
      { label: 'Home', href: '/' },
      { label: 'News', href: '/blog' },
      { label: 'Five claim tips' },
    ]);
    expect(a.blocks.map((b) => b.t)).toEqual(['p', 'h2', 'img', 'faq']);
    expect(a.blocks[2]).toEqual({
      t: 'img',
      url: 'https://x.test/i.png',
      alt: 'Form',
      caption: 'V0901',
    });
    expect(a.faq[0].blocks?.[0]).toMatchObject({
      t: 'p',
      x: 'About six months.',
    });
  });

  it('falls back to the title and omits the FAQ schema without FAQs', () => {
    const a = cmsPostToArticle(
      post({ seoTitle: '', faq: [], coverImageUrl: null, blocks: [] })
    );
    expect(a.title).toBe('Five claim tips');
    expect(a.faqInSchema).toBe(false);
    expect(a.faqTitle).toBeUndefined();
    expect(a.imageUrl).toBeUndefined();
  });

  it('uses German UI strings for German posts', () => {
    const a = cmsPostToArticle(post({ lang: 'de' }));
    expect(a.lang).toBe('de');
    expect(a.reviewLine).toBe('Aktualisiert: 20. Oktober 2026');
    expect(a.crumbs[0].label).toBe('Startseite');
  });

  it('keeps token-like user text from throwing in resolveTokens', () => {
    const nasty = `Use {{X-99.nope}} and ${Q} literally`;
    expect(() => resolveTokens(nasty)).toThrow();
    const a = cmsPostToArticle(
      post({
        title: nasty,
        blocks: [{ t: 'p', x: nasty, sp: [{ k: 'b', x: '{{X-99.nope}}' }] }],
        faq: [{ q: nasty, a: nasty, blocks: [] }],
      })
    );
    const p = a.blocks[0] as { x: string; sp: { x: string }[] };
    expect(() => resolveTokens(a.h1)).not.toThrow();
    expect(() => resolveTokens(p.x)).not.toThrow();
    expect(p.x.indexOf(p.sp[0].x)).toBeGreaterThan(-1);
    expect(() => articleJsonLd(a)).not.toThrow();
    expect(inertText('plain text')).toBe('plain text');
  });
});
