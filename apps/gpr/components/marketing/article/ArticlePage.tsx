import type { ReactNode } from 'react';
import type { ArticleData, Crumb } from '@/content/articles/types';
import { REVIEWER } from '@/content/site';
import { resolveTokens } from '@/content/tokens';
import { JsonLd } from '../ui/JsonLd';
import { Pill } from '../ui/Pill';
import { Rail } from '../ui/Section';
import { SmartLink } from '../ui/SmartLink';
import { ArticleBlocks } from './ArticleBlocks';
import { ArticleToc, type TocItem } from './ArticleToc';
import { processingStats } from './ProcessingTimeChart';
import { articleJsonLd } from './jsonld';
import './article.css';

export const ARTICLE_UI = {
  en: {
    onThisPage: 'On this page',
    reviewed: 'Reviewed by:',
    breadcrumb: 'Breadcrumb',
  },
  de: {
    onThisPage: 'Auf dieser Seite',
    reviewed: 'Geprüft von:',
    breadcrumb: 'Navigationspfad',
  },
};

const PROCESSING_PATH = '/german-pension-refund-processing-time';

export interface ArticleHeroProps {
  lang: 'en' | 'de';
  crumbs: Crumb[];
  eyebrow: string;
  h1: string;
  showReviewer?: boolean;
  reviewLine?: string;
  /** Extra hero content below the reviewer line (processing-time tiles). */
  children?: ReactNode;
}

/**
 * Article hero (V0100 frame 928:12808): breadcrumb, "›› EYEBROW", H1 (960
 * wide), JK avatar + reviewer line, 1px bottom hairline and the oversized
 * 6 % "››" deco on the right.
 */
export function ArticleHero({
  lang,
  crumbs,
  eyebrow,
  h1,
  showReviewer,
  reviewLine,
  children,
}: ArticleHeroProps) {
  const ui = ARTICLE_UI[lang];
  const initials = REVIEWER.name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('');
  // A by-line that already names the author ("By Johannes Kühn, …") is
  // shown on its own, as in the article frames (e.g. 928:14822).
  const named = showReviewer && !(reviewLine && /^(By|Von) /.test(reviewLine));
  return (
    <header className="mk-art-hero">
      <span className="mk-art-deco" aria-hidden="true">
        ››
      </span>
      <div className="mk-art-hero-inner">
        <nav className="mk-art-crumbs" aria-label={ui.breadcrumb}>
          <ol>
            {crumbs.map((c, i) => (
              <li key={i}>
                {c.href ? (
                  <SmartLink href={c.href} darkClassName="mk-dark">
                    {c.label}
                  </SmartLink>
                ) : (
                  <span
                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <p className="mk-art-eyebrow">
          <span aria-hidden="true">›› </span>
          {eyebrow.toUpperCase()}
        </p>
        <h1 className="mk-art-h1">{resolveTokens(h1)}</h1>
        {showReviewer || reviewLine ? (
          <p className="mk-art-review">
            {showReviewer ? (
              <span className="mk-art-avatar" aria-hidden="true">
                {initials}
              </span>
            ) : null}
            <span className="mk-art-review-text">
              {named ? `${ui.reviewed} ${REVIEWER.name}` : null}
              {named && reviewLine ? ' · ' : null}
              {reviewLine ? resolveTokens(reviewLine) : null}
            </span>
          </p>
        ) : null}
        {children}
      </div>
    </header>
  );
}

export interface ArticleLayoutProps {
  lang: 'en' | 'de';
  rail: string;
  toc: TocItem[];
  children: ReactNode;
}

/**
 * Article body (V0100 frame 928:12816): 280px rail ("›› 01 — LABEL" + "On
 * this page" nav) + 64 gap + 760px column (inside the 936 body slot).
 */
export function ArticleLayout({
  lang,
  rail,
  toc,
  children,
}: ArticleLayoutProps) {
  const ui = ARTICLE_UI[lang];
  return (
    <div className="mk-art-layout">
      <aside className="mk-art-rail">
        <Rail index={1} label={rail} />
        <ArticleToc items={toc} label={ui.onThisPage} />
      </aside>
      <div className="mk-art-col">{children}</div>
    </div>
  );
}

/** Processing-time hero extras (Figma 790:10005 + 790:10018). */
function ProcessingHeroExtras({ intro }: { intro: ReactNode[] }) {
  const stats = processingStats();
  return (
    <>
      <ul className="mk-art-stats">
        {stats.map((s) => (
          <li key={s.id} className="mk-art-stat">
            <span className="mk-art-stat-l">{s.label}</span>
            <span className="mk-art-stat-v">{s.value}</span>
            <span className="mk-art-stat-l">{s.foot}</span>
          </li>
        ))}
      </ul>
      {intro.length === 2 ? (
        <div className="mk-art-intro">
          <div className="mk-art-intro-main">{intro[1]}</div>
          <div className="mk-art-intro-box">{intro[0]}</div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Shared template for the forms guides, the downloads directory and the
 * articles: hero (breadcrumb, eyebrow, H1, reviewer line), left rail with
 * "On this page" built from the H2s, 760px column, FAQ, official downloads,
 * sources line and pill CTAs. JSON-LD via `articleJsonLd`.
 */
export function ArticlePage({ data }: { data: ArticleData }) {
  const toc: TocItem[] = data.blocks
    .filter((b): b is Extract<typeof b, { t: 'h2' }> => b.t === 'h2')
    .map((b) => ({ id: b.id, label: resolveTokens(b.x) }));
  if (
    data.faq.length &&
    data.faqTitle &&
    data.blocks.some((b) => b.t === 'faq')
  ) {
    const at = data.blocks.findIndex((b) => b.t === 'faq');
    const before = data.blocks.slice(0, at).filter((b) => b.t === 'h2').length;
    toc.splice(before, 0, { id: 'faq', label: data.faqTitle });
  }

  // Processing-time page: the two lead paragraphs move into the hero
  // (Figma 790:10018) next to the stat tiles.
  const processing = data.path === PROCESSING_PATH;
  const leadCount = processing
    ? Math.min(
        2,
        data.blocks.findIndex((b) => b.t !== 'p') === -1
          ? data.blocks.length
          : data.blocks.findIndex((b) => b.t !== 'p')
      )
    : 0;
  const lead = data.blocks.slice(0, leadCount);
  const body = data.blocks.slice(leadCount);

  return (
    <article
      className={
        'mk-art mk-art-' + data.kind + (processing ? ' mk-art-ptime' : '')
      }
      lang={data.lang === 'en' ? undefined : data.lang}
    >
      <JsonLd graph={articleJsonLd(data)} />

      <ArticleHero
        lang={data.lang}
        crumbs={data.crumbs}
        eyebrow={data.eyebrow}
        h1={data.h1}
        showReviewer={data.showReviewer}
        reviewLine={data.reviewLine}
      >
        {processing ? (
          <ProcessingHeroExtras
            intro={lead.map((b, i) => (
              <ArticleBlocks
                key={i}
                blocks={[b]}
                path={data.path}
                lang={data.lang}
              />
            ))}
          />
        ) : null}
      </ArticleHero>

      <ArticleLayout lang={data.lang} rail={data.rail} toc={toc}>
        <ArticleBlocks
          blocks={body}
          path={data.path}
          lang={data.lang}
          faq={data.faq}
          faqTitle={data.faqTitle}
        />
        {data.cta.length ? (
          <div
            className={
              'mk-cta-row mk-art-cta' +
              (data.cta.length === 1 ? ' mk-art-cta-single' : '')
            }
          >
            {data.cta.map((c, i) => (
              <Pill
                key={c.href + i}
                href={c.href}
                size="lg"
                variant={i === 0 ? 'primary' : 'secondary'}
              >
                {c.label}
              </Pill>
            ))}
          </div>
        ) : null}
      </ArticleLayout>
    </article>
  );
}
