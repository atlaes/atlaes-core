/**
 * SEO validation for blog posts. Runs live in the editor
 * (POST /api/admin/blog/validate) and again on publish: any `error` check
 * blocks publishing, `warning`s are advice. The admin shows every check.
 */
import {
  blockTexts,
  countWords,
  inlineLinks,
  plainText,
  type BlogBlock,
  type BlogCta,
  type BlogFaqItem,
  type BlogSite,
} from './content';

export type SeoLevel = 'error' | 'warning' | 'ok';
export type SeoGroup = 'basics' | 'keyword' | 'content' | 'links' | 'media';

export interface SeoCheck {
  id: string;
  group: SeoGroup;
  level: SeoLevel;
  message: string;
}

export interface SeoReport {
  /** 0–100: share of passed checks, errors weighing double. */
  score: number;
  canPublish: boolean;
  wordCount: number;
  checks: SeoCheck[];
}

export interface SeoInput {
  site: BlogSite;
  slug: string;
  title: string;
  seoTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string | null;
  focusKeyword?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  blocks: BlogBlock[];
  faq: BlogFaqItem[];
  ctas: BlogCta[];
}

export interface SeoContext {
  /** Other posts on the same site (the post itself excluded). */
  siblings: { slug: string; seoTitle: string }[];
}

export const SEO_LIMITS = {
  titleMin: 30,
  titleMax: 60,
  metaMin: 70,
  metaMax: 160,
  excerptMax: 300,
  wordsMin: 300,
  wordsGood: 600,
  paragraphWordsMax: 150,
  densityMin: 0.5,
  densityMax: 3,
} as const;

/**
 * Hand-built pages the dynamic post route can never reach: on GPR a
 * static /post/<slug> page wins over /post/[slug].
 */
export const RESERVED_SLUGS: Record<BlogSite, readonly string[]> = {
  gpr: [
    'brexit',
    'german-pension-refund-waiting-period',
    'german-social-security-number',
    'how-to-get-a-german-pension-refund',
    'which-german-pension-office-handles-your-claim',
  ],
  vbl: [],
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function containsKeyword(text: string, keyword: string): boolean {
  return norm(text).includes(norm(keyword));
}

function occurrences(text: string, keyword: string): number {
  const hay = norm(text);
  const needle = norm(keyword);
  if (!needle) return 0;
  let count = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
    count += 1;
  }
  return count;
}

/** http(s) URLs, site-relative paths and in-page anchors. */
export function isValidHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (href.startsWith('#') && href.length > 1) return true;
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(href)) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const isInternal = (href: string, site: BlogSite) =>
  href.startsWith('/') ||
  href.startsWith('#') ||
  (site === 'vbl' && /^https?:\/\/(www\.)?companypension\.de/.test(href)) ||
  (site === 'gpr' &&
    /^https?:\/\/(www\.)?germanypensionrefund\.com/.test(href));

export function validatePost(input: SeoInput, ctx: SeoContext): SeoReport {
  const checks: SeoCheck[] = [];
  const add = (id: string, group: SeoGroup, level: SeoLevel, message: string) =>
    checks.push({ id, group, level, message });

  const L = SEO_LIMITS;
  const seoTitle = (input.seoTitle || input.title).trim();
  const meta = (input.metaDescription ?? '').trim();
  const keyword = (input.focusKeyword ?? '').trim();
  const texts = input.blocks.flatMap(blockTexts);
  const wordCount = countWords(input.blocks, input.faq);

  // -- Basics --------------------------------------------------------------
  if (!input.title.trim()) {
    add('title', 'basics', 'error', 'Add a title (the H1 of the page).');
  } else {
    add('title', 'basics', 'ok', 'The post has a title.');
  }

  if (!seoTitle) {
    add('seo-title-length', 'basics', 'error', 'Add an SEO title.');
  } else if (seoTitle.length < L.titleMin || seoTitle.length > L.titleMax) {
    add(
      'seo-title-length',
      'basics',
      'warning',
      `SEO title is ${seoTitle.length} characters; aim for ${L.titleMin}–${L.titleMax} so Google shows it in full.`
    );
  } else {
    add(
      'seo-title-length',
      'basics',
      'ok',
      `SEO title length is good (${seoTitle.length}).`
    );
  }

  const duplicateTitle = ctx.siblings.find(
    (s) => seoTitle && norm(s.seoTitle) === norm(seoTitle)
  );
  if (duplicateTitle) {
    add(
      'seo-title-unique',
      'basics',
      'warning',
      `Another post (/${duplicateTitle.slug}) uses the same SEO title.`
    );
  } else if (seoTitle) {
    add('seo-title-unique', 'basics', 'ok', 'The SEO title is unique.');
  }

  if (!meta) {
    add(
      'meta-length',
      'basics',
      'error',
      'Add a meta description (the text under the title in search results).'
    );
  } else if (meta.length < L.metaMin || meta.length > L.metaMax) {
    add(
      'meta-length',
      'basics',
      'warning',
      `Meta description is ${meta.length} characters; aim for ${L.metaMin}–${L.metaMax}.`
    );
  } else {
    add(
      'meta-length',
      'basics',
      'ok',
      `Meta description length is good (${meta.length}).`
    );
  }

  if ((input.excerpt ?? '').length > L.excerptMax) {
    add(
      'excerpt-length',
      'basics',
      'warning',
      `Excerpt is longer than ${L.excerptMax} characters.`
    );
  }

  if (!input.slug) {
    add('slug', 'basics', 'error', 'Add a URL slug.');
  } else if (!SLUG_PATTERN.test(input.slug)) {
    add(
      'slug',
      'basics',
      'error',
      'Slug may only use lowercase letters, digits and single hyphens (e.g. "pension-refund-guide").'
    );
  } else if (RESERVED_SLUGS[input.site].includes(input.slug)) {
    add(
      'slug',
      'basics',
      'error',
      'This slug belongs to an existing hand-built page; choose another.'
    );
  } else if (ctx.siblings.some((s) => s.slug === input.slug)) {
    add('slug', 'basics', 'error', 'Another post already uses this slug.');
  } else if (input.slug.length > 75) {
    add('slug', 'basics', 'warning', 'Keep the slug under 75 characters.');
  } else {
    add('slug', 'basics', 'ok', 'The slug is valid and unique.');
  }

  if (input.canonicalUrl && !/^https:\/\/\S+$/.test(input.canonicalUrl)) {
    add(
      'canonical',
      'basics',
      'error',
      'Canonical URL must be a full https:// address.'
    );
  }

  if (input.noindex) {
    add(
      'noindex',
      'basics',
      'warning',
      'The post is set to noindex: search engines will not list it.'
    );
  }

  // -- Focus keyword ---------------------------------------------------------
  if (!keyword) {
    add(
      'keyword',
      'keyword',
      'warning',
      'Set a focus keyword to get keyword checks.'
    );
  } else {
    const firstParagraph = input.blocks.find((b) => b.t === 'p');
    const h2s = input.blocks.filter(
      (b): b is Extract<BlogBlock, { t: 'h2' }> => b.t === 'h2'
    );
    const slugKeyword = norm(keyword).replace(/[^a-z0-9]+/g, '-');
    const places: [string, boolean, string][] = [
      ['keyword-title', containsKeyword(seoTitle, keyword), 'SEO title'],
      ['keyword-h1', containsKeyword(input.title, keyword), 'title (H1)'],
      ['keyword-meta', containsKeyword(meta, keyword), 'meta description'],
      [
        'keyword-slug',
        !!slugKeyword && input.slug.includes(slugKeyword),
        'slug',
      ],
      [
        'keyword-intro',
        !!firstParagraph &&
          firstParagraph.t === 'p' &&
          containsKeyword(plainText(firstParagraph.md), keyword),
        'first paragraph',
      ],
      [
        'keyword-subheading',
        h2s.some((h) => containsKeyword(h.text, keyword)),
        'a subheading (H2)',
      ],
    ];
    for (const [id, found, where] of places) {
      add(
        id,
        'keyword',
        found ? 'ok' : 'warning',
        found
          ? `Focus keyword appears in the ${where}.`
          : `Use the focus keyword in the ${where}.`
      );
    }

    if (wordCount > 0) {
      const body = texts.map(plainText).join(' ');
      const keywordWords = keyword.split(/\s+/).length;
      const density =
        ((occurrences(body, keyword) * keywordWords) / wordCount) * 100;
      const rounded = Math.round(density * 10) / 10;
      if (density < L.densityMin) {
        add(
          'keyword-density',
          'keyword',
          'warning',
          `Keyword density is ${rounded}%; aim for ${L.densityMin}–${L.densityMax}%.`
        );
      } else if (density > L.densityMax) {
        add(
          'keyword-density',
          'keyword',
          'warning',
          `Keyword density is ${rounded}%, which reads as keyword stuffing; aim for ${L.densityMin}–${L.densityMax}%.`
        );
      } else {
        add(
          'keyword-density',
          'keyword',
          'ok',
          `Keyword density is good (${rounded}%).`
        );
      }
    }
  }

  // -- Content ---------------------------------------------------------------
  if (wordCount === 0) {
    add('words', 'content', 'error', 'The post has no body text.');
  } else if (wordCount < L.wordsMin) {
    add(
      'words',
      'content',
      'warning',
      `${wordCount} words; posts under ${L.wordsMin} words rarely rank. Aim for ${L.wordsGood}+.`
    );
  } else if (wordCount < L.wordsGood) {
    add(
      'words',
      'content',
      'ok',
      `${wordCount} words; ${L.wordsGood}+ is better for competitive topics.`
    );
  } else {
    add('words', 'content', 'ok', `${wordCount} words.`);
  }

  const headings = input.blocks.filter((b) => b.t === 'h2' || b.t === 'h3');
  const firstH2 = input.blocks.findIndex((b) => b.t === 'h2');
  const firstH3 = input.blocks.findIndex((b) => b.t === 'h3');
  if (headings.length === 0) {
    add(
      'headings',
      'content',
      'warning',
      'Break the post up with subheadings (H2).'
    );
  } else if (firstH3 !== -1 && (firstH2 === -1 || firstH3 < firstH2)) {
    add(
      'headings',
      'content',
      'warning',
      'An H3 comes before the first H2; start sections with an H2.'
    );
  } else {
    add('headings', 'content', 'ok', 'Subheadings are in order.');
  }

  if (headings.some((h) => (h.t === 'h2' || h.t === 'h3') && !h.text.trim())) {
    add('headings-empty', 'content', 'error', 'A subheading is empty.');
  }

  const longParagraphs = input.blocks.filter(
    (b) =>
      b.t === 'p' &&
      plainText(b.md).split(/\s+/).filter(Boolean).length > L.paragraphWordsMax
  ).length;
  if (longParagraphs > 0) {
    add(
      'paragraphs',
      'content',
      'warning',
      `${longParagraphs} paragraph(s) are over ${L.paragraphWordsMax} words; split them for readability.`
    );
  }

  const faqIncomplete = input.faq.some((f) => !f.q.trim() || !f.a.trim());
  if (faqIncomplete) {
    add(
      'faq',
      'content',
      'error',
      'Every FAQ needs both a question and an answer.'
    );
  } else if (input.faq.length > 0) {
    add(
      'faq',
      'content',
      'ok',
      `${input.faq.length} FAQ(s) will be marked up for Google (FAQPage).`
    );
  }

  // -- Links -----------------------------------------------------------------
  const links = [
    ...texts.flatMap(inlineLinks),
    ...input.faq.flatMap((f) => inlineLinks(f.a)),
    ...input.ctas.map((c) => ({ label: c.label, href: c.href })),
  ];
  const badLinks = links.filter((l) => !isValidHref(l.href));
  if (badLinks.length > 0) {
    add(
      'links-valid',
      'links',
      'error',
      `Fix ${badLinks.length} invalid link(s): ${badLinks
        .slice(0, 3)
        .map((l) => `"${l.label}" → ${l.href}`)
        .join(', ')}. Use https://… or a path starting with /.`
    );
  }
  if (input.ctas.some((c) => !c.label.trim())) {
    add('cta-label', 'links', 'error', 'A call-to-action button has no label.');
  }
  const vague = links.filter((l) =>
    /^(click )?here$|^read more$|^this$|^link$|^hier( klicken)?$/i.test(
      l.label.trim()
    )
  );
  if (vague.length > 0) {
    add(
      'links-anchor',
      'links',
      'warning',
      'Avoid link text like "click here"; describe the destination.'
    );
  }
  const internal = links.filter((l) => isInternal(l.href, input.site));
  const external = links.filter(
    (l) => isValidHref(l.href) && !isInternal(l.href, input.site)
  );
  add(
    'links-internal',
    'links',
    internal.length > 0 ? 'ok' : 'warning',
    internal.length > 0
      ? `${internal.length} internal link(s).`
      : 'Link to at least one other page on the site.'
  );
  add(
    'links-external',
    'links',
    external.length > 0 ? 'ok' : 'warning',
    external.length > 0
      ? `${external.length} outbound link(s).`
      : 'Cite at least one official source (e.g. the DRV or the VBL).'
  );

  // -- Media -----------------------------------------------------------------
  if (!input.coverImageUrl) {
    add(
      'cover',
      'media',
      'warning',
      'Add a cover image; it is used for link previews on social media.'
    );
  } else if (!isValidHref(input.coverImageUrl)) {
    add('cover', 'media', 'error', 'The cover image URL is not valid.');
  } else if (!(input.coverImageAlt ?? '').trim()) {
    add('cover', 'media', 'error', 'Describe the cover image in its alt text.');
  } else {
    add('cover', 'media', 'ok', 'Cover image has alt text.');
  }

  const images = input.blocks.filter(
    (b): b is Extract<BlogBlock, { t: 'img' }> => b.t === 'img'
  );
  if (images.some((i) => !i.url || !isValidHref(i.url))) {
    add('images-url', 'media', 'error', 'An image has no valid URL.');
  }
  if (images.some((i) => !i.alt.trim())) {
    add('images-alt', 'media', 'error', 'Every image needs alt text.');
  } else if (images.length > 0) {
    add('images-alt', 'media', 'ok', 'All images have alt text.');
  }

  const errors = checks.filter((c) => c.level === 'error').length;
  const warnings = checks.filter((c) => c.level === 'warning').length;
  const passed = checks.filter((c) => c.level === 'ok').length;
  const weight = passed + warnings + errors * 2;
  const score = weight === 0 ? 0 : Math.round((passed / weight) * 100);
  return { score, canPublish: errors === 0, wordCount, checks };
}
