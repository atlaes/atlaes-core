import { describe, expect, it } from 'vitest';
import {
  countWords,
  parseInline,
  renderBlocks,
  renderFaq,
  slugify,
  type BlogBlock,
} from './content';
import {
  isValidHref,
  validatePost,
  type SeoContext,
  type SeoInput,
} from './seo';

const words = (n: number, word = 'pension') =>
  Array.from({ length: n }, (_, i) => (i % 10 === 0 ? word : 'text')).join(' ');

function goodPost(overrides: Partial<SeoInput> = {}): SeoInput {
  return {
    site: 'vbl',
    slug: 'vbl-refund-guide',
    title: 'VBL refund guide for people leaving Germany',
    seoTitle: 'VBL refund guide: how to get your contributions back',
    metaDescription:
      'Left public-sector work in Germany? This VBL refund guide explains who qualifies, the waiting time and how to apply.',
    focusKeyword: 'VBL refund',
    coverImageUrl: 'https://cdn.example.com/cover.png',
    coverImageAlt: 'A VBL statement on a desk',
    noindex: false,
    blocks: [
      {
        t: 'p',
        md: 'A **VBL refund** pays back your own contributions. See [how it works](/how-it-works).',
      },
      { t: 'h2', text: 'Who qualifies for a VBL refund' },
      { t: 'p', md: words(120, 'refund') },
      { t: 'p', md: words(120, 'refund') },
      {
        t: 'p',
        md: `${words(110, 'refund')} Source: [VBL](https://www.vbl.de).`,
      },
      { t: 'h3', text: 'Waiting time' },
      { t: 'p', md: 'The VBL refund needs a waiting time of 24 months.' },
    ],
    faq: [{ q: 'How long does it take?', a: 'Usually **3 months**.' }],
    ctas: [{ label: 'Check eligibility', href: '/get-started' }],
    ...overrides,
  };
}

const ctx: SeoContext = { siblings: [] };
const levelOf = (input: SeoInput, id: string, c = ctx) =>
  validatePost(input, c).checks.find((check) => check.id === id)?.level;

describe('inline syntax', () => {
  it('turns bold and links into spans matched by text', () => {
    expect(
      parseInline('Get **your money** back: [start here](/get-started).')
    ).toEqual({
      x: 'Get your money back: start here.',
      sp: [
        { k: 'b', x: 'your money' },
        { k: 'a', x: 'start here', href: '/get-started' },
      ],
    });
  });

  it('leaves HTML as plain text', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual({
      x: '<script>alert(1)</script>',
      sp: [],
    });
  });

  it('slugifies German text', () => {
    expect(slugify('Rentenbeitragserstattung für Ärzte & Großeltern')).toBe(
      'rentenbeitragserstattung-fur-arzte-grosseltern'
    );
  });

  it('renders unique h2 ids and the FAQ marker', () => {
    const blocks: BlogBlock[] = [
      { t: 'h2', text: 'Next steps' },
      { t: 'h2', text: 'Next steps' },
    ];
    expect(renderBlocks(blocks, true)).toEqual([
      { t: 'h2', x: 'Next steps', id: 'next-steps' },
      { t: 'h2', x: 'Next steps', id: 'next-steps-2' },
      { t: 'faq' },
    ]);
  });

  it('renders FAQ answers as plain text plus paragraphs', () => {
    expect(renderFaq([{ q: 'Q?', a: 'One **two**.\n\nThree.' }])).toEqual([
      {
        q: 'Q?',
        a: 'One two.\n\nThree.',
        blocks: [
          { t: 'p', x: 'One two.', sp: [{ k: 'b', x: 'two' }] },
          { t: 'p', x: 'Three.', sp: [] },
        ],
      },
    ]);
  });

  it('counts words without the markup', () => {
    expect(
      countWords(
        [{ t: 'p', md: '**One** [two](/x) three' }],
        [{ q: 'Four?', a: 'five' }]
      )
    ).toBe(5);
  });
});

describe('href validation', () => {
  it.each([
    ['/get-started', true],
    ['#faq', true],
    ['https://www.vbl.de', true],
    ['mailto:info@companypension.de', true],
    ['javascript:alert(1)', false],
    ['//evil.example', false],
    ['www.vbl.de', false],
    ['', false],
  ])('%s → %s', (href, ok) => {
    expect(isValidHref(href)).toBe(ok);
  });
});

describe('validatePost', () => {
  it('passes a well-formed post', () => {
    const report = validatePost(goodPost(), ctx);
    expect(report.canPublish).toBe(true);
    expect(
      report.checks.filter((c) => c.level !== 'ok').map((c) => c.id)
    ).toEqual([]);
    expect(report.score).toBe(100);
  });

  it('blocks publishing without a meta description or body', () => {
    const report = validatePost(
      goodPost({ metaDescription: '', blocks: [], faq: [] }),
      ctx
    );
    expect(report.canPublish).toBe(false);
    const errors = report.checks
      .filter((c) => c.level === 'error')
      .map((c) => c.id);
    expect(errors).toEqual(expect.arrayContaining(['meta-length', 'words']));
  });

  it('rejects bad, reserved and duplicate slugs', () => {
    expect(levelOf(goodPost({ slug: 'Bad Slug' }), 'slug')).toBe('error');
    expect(levelOf(goodPost({ slug: 'a--b' }), 'slug')).toBe('error');
    expect(levelOf(goodPost({ site: 'gpr', slug: 'brexit' }), 'slug')).toBe(
      'error'
    );
    expect(
      levelOf(goodPost(), 'slug', {
        siblings: [{ slug: 'vbl-refund-guide', seoTitle: 'Other' }],
      })
    ).toBe('error');
  });

  it('warns on a duplicate SEO title', () => {
    expect(
      levelOf(goodPost(), 'seo-title-unique', {
        siblings: [
          {
            slug: 'other',
            seoTitle: 'VBL refund guide: how to get your contributions back',
          },
        ],
      })
    ).toBe('warning');
  });

  it('warns on title and description lengths', () => {
    expect(levelOf(goodPost({ seoTitle: 'Short' }), 'seo-title-length')).toBe(
      'warning'
    );
    expect(
      levelOf(goodPost({ metaDescription: 'x'.repeat(200) }), 'meta-length')
    ).toBe('warning');
  });

  it('checks where the focus keyword appears', () => {
    const report = validatePost(goodPost({ focusKeyword: 'ZVK payout' }), ctx);
    const warned = report.checks
      .filter((c) => c.group === 'keyword' && c.level === 'warning')
      .map((c) => c.id);
    expect(warned).toEqual([
      'keyword-title',
      'keyword-h1',
      'keyword-meta',
      'keyword-slug',
      'keyword-intro',
      'keyword-subheading',
      'keyword-density',
    ]);
    expect(levelOf(goodPost({ focusKeyword: null }), 'keyword')).toBe(
      'warning'
    );
  });

  it('flags keyword stuffing', () => {
    const stuffed = goodPost({
      blocks: [
        ...goodPost().blocks,
        { t: 'p', md: Array(80).fill('VBL refund').join(' ') },
      ],
    });
    expect(levelOf(stuffed, 'keyword-density')).toBe('warning');
  });

  it('blocks unsafe links and images without alt text', () => {
    const report = validatePost(
      goodPost({
        blocks: [
          ...goodPost().blocks,
          { t: 'p', md: '[win](javascript:alert(1))' },
          { t: 'img', url: 'https://cdn.example.com/a.png', alt: ' ' },
        ],
        coverImageAlt: '',
      }),
      ctx
    );
    const errors = report.checks
      .filter((c) => c.level === 'error')
      .map((c) => c.id);
    expect(errors).toEqual(
      expect.arrayContaining(['links-valid', 'cover', 'images-alt'])
    );
  });

  it('warns on heading order, vague links and missing links', () => {
    const post = goodPost({
      blocks: [
        { t: 'h3', text: 'Intro' },
        { t: 'p', md: `${words(320)} [click here](/x)` },
      ],
      ctas: [],
      faq: [],
    });
    expect(levelOf(post, 'headings')).toBe('warning');
    expect(levelOf(post, 'links-anchor')).toBe('warning');
    expect(levelOf(post, 'links-external')).toBe('warning');
  });

  it('requires complete FAQs and warns on noindex', () => {
    expect(levelOf(goodPost({ faq: [{ q: 'Q?', a: '' }] }), 'faq')).toBe(
      'error'
    );
    expect(levelOf(goodPost({ noindex: true }), 'noindex')).toBe('warning');
  });
});
