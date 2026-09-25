import type { ArticleData } from '@/content/articles/types';
import { REVIEWER } from '@/content/site';
import { resolveTokens } from '@/content/tokens';
import { JsonLd } from '../ui/JsonLd';
import { Pill } from '../ui/Pill';
import { Rail } from '../ui/Section';
import { SmartLink } from '../ui/SmartLink';
import { ArticleBlocks } from './ArticleBlocks';
import { articleJsonLd } from './jsonld';
import './article.css';

const UI = {
  en: {
    onThisPage: 'On this page',
    reviewed: 'Reviewed by',
    breadcrumb: 'Breadcrumb',
  },
  de: {
    onThisPage: 'Auf dieser Seite',
    reviewed: 'Geprüft von',
    breadcrumb: 'Navigationspfad',
  },
};

/**
 * Shared template for the forms guides, the downloads directory and the
 * articles: hero (breadcrumb, eyebrow, H1, reviewer line), left rail with
 * "On this page" built from the H2s, 760px column, FAQ, official downloads,
 * sources line and pill CTAs. JSON-LD via `articleJsonLd`.
 */
export function ArticlePage({ data }: { data: ArticleData }) {
  const ui = UI[data.lang];
  const toc = data.blocks
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
  const initials = REVIEWER.name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('');

  return (
    <article
      className={'mk-art mk-art-' + data.kind}
      lang={data.lang === 'en' ? undefined : data.lang}
    >
      <JsonLd graph={articleJsonLd(data)} />

      <header className="mk-art-hero">
        <div className="mk-art-hero-inner">
          <nav className="mk-art-crumbs" aria-label={ui.breadcrumb}>
            <ol>
              {data.crumbs.map((c, i) => (
                <li key={i}>
                  {c.href ? (
                    <SmartLink href={c.href} darkClassName="mk-dark">
                      {c.label}
                    </SmartLink>
                  ) : (
                    <span
                      aria-current={
                        i === data.crumbs.length - 1 ? 'page' : undefined
                      }
                    >
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <p className="mk-art-eyebrow">
            <span className="mk-rail-arrows" aria-hidden="true">
              ››
            </span>{' '}
            {data.eyebrow.toUpperCase()}
          </p>
          <h1 className="mk-h1 mk-art-h1">{resolveTokens(data.h1)}</h1>
          {data.showReviewer || data.reviewLine ? (
            <p className="mk-art-review">
              {data.showReviewer ? (
                <>
                  <span className="mk-art-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span>
                    {ui.reviewed} {REVIEWER.name}
                  </span>
                </>
              ) : null}
              {data.reviewLine ? (
                <span>
                  {data.showReviewer ? ' · ' : ''}
                  {resolveTokens(data.reviewLine)}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <span className="mk-art-deco" aria-hidden="true">
          ››
        </span>
      </header>

      <div className="mk-art-layout">
        <aside className="mk-art-rail">
          <Rail index={1} label={data.rail} />
          {toc.length ? (
            <nav className="mk-art-toc" aria-label={ui.onThisPage}>
              <p className="mk-art-toc-label">{ui.onThisPage}</p>
              <ol>
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={'#' + h.id}>{h.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </aside>

        <div className="mk-art-col">
          <ArticleBlocks
            blocks={data.blocks}
            path={data.path}
            lang={data.lang}
            faq={data.faq}
            faqTitle={data.faqTitle}
          />
          {data.cta.length ? (
            <div className="mk-cta-row mk-art-cta">
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
        </div>
      </div>
    </article>
  );
}
