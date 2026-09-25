import { resolveTokens } from '@/content/tokens';
import { FORMS, formEditionUrl } from '@/content/registries/forms';
import type {
  ArticleBlock,
  ArticleFaqItem,
  Rich,
  ToolKind,
} from '@/content/articles/types';
import type { Span } from '@/content/types';
import { Callout } from '../ui/Callout';
import { DataTable } from '../ui/DataTable';
import { FaqList } from '../ui/FaqList';
import { Inline } from '../ui/Inline';
import { Pill } from '../ui/Pill';
import { ProcessingTimeChart } from './ProcessingTimeChart';
import { resolveHref } from './hrefs';

/** Spans with tokens resolved and registry hrefs expanded. */
function spans(sp: Span[]): Span[] {
  return sp.map((s) => ({
    ...s,
    x: resolveTokens(s.x),
    href: s.href ? resolveHref(s.href) : s.href,
  }));
}

function Text({ r, className }: { r: Rich; className?: string }) {
  return <Inline x={r.x} sp={spans(r.sp)} linkClassName={className} />;
}

/** Tool placeholders from the copy: the platform tools ship as CTAs here. */
const TOOL_CTA: Record<
  Exclude<ToolKind, 'processing-chart'>,
  { label: string; href: string }
> = {
  checker: {
    label: 'Check your eligibility — free →',
    href: '/refund-calculator',
  },
  calculator: { label: 'Estimate your refund →', href: '/refund-calculator' },
  waiting: { label: 'Waiting-period calculator →', href: '/refund-calculator' },
  'office-finder': {
    label: 'Office finder →',
    href: '/post/which-german-pension-office-handles-your-claim',
  },
  assessment: {
    label: 'Request a free individual eligibility assessment',
    href: '/contact-us',
  },
};

function Tool({ kind, path }: { kind: ToolKind; path: string }) {
  if (kind === 'processing-chart') return <ProcessingTimeChart />;
  const cta = TOOL_CTA[kind];
  if (cta.href === path) return null;
  return (
    <div className="mk-art-tool">
      <Pill href={cta.href}>{cta.label}</Pill>
    </div>
  );
}

/** Registry-driven official-downloads list. */
function Downloads({ forms, lang }: { forms: string[]; lang: 'en' | 'de' }) {
  const entries = FORMS.filter((f) => forms.indexOf(f.number) !== -1);
  const label = lang === 'de' ? 'DRV-Formularseite' : 'Official DRV form page';
  return (
    <>
      <h2 className="mk-h2 mk-art-h2" id="official-downloads">
        {lang === 'de' ? 'Offizieller Download' : 'Official downloads'}
      </h2>
      <ul className="mk-ul">
        {entries.map((f) =>
          f.editions.map((e) => (
            <li key={f.number + e.lang}>
              <strong>
                {f.number} — {f.title}
              </strong>{' '}
              ({e.langLabel}
              {e.version ? `, Version ${e.version}` : ''}, Stand {e.stand}) →{' '}
              <a
                href={formEditionUrl(e)}
                className="mk-link"
                target="_blank"
                rel="noopener"
              >
                {label}
              </a>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

function KeyValues({ rows }: { rows: string[][] }) {
  return (
    <dl className="mk-art-kv">
      {rows.map((r, i) => (
        <div key={i} className="mk-art-kv-row">
          <dt>{resolveTokens(r[0])}</dt>
          <dd>{resolveTokens(r[1] || '')}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface ArticleBlocksProps {
  blocks: ArticleBlock[];
  path: string;
  lang: 'en' | 'de';
  faq?: ArticleFaqItem[];
  faqTitle?: string;
}

/** Render the article body; `faq` is rendered where the `faq` marker sits. */
export function ArticleBlocks({
  blocks,
  path,
  lang,
  faq,
  faqTitle,
}: ArticleBlocksProps) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} className="mk-p">
                <Text r={b} />
              </p>
            );
          case 'h2':
            return (
              <h2 key={i} id={b.id} className="mk-h2 mk-art-h2">
                {resolveTokens(b.x)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} className="mk-h3">
                {resolveTokens(b.x)}
              </h3>
            );
          case 'quote':
            return (
              <Callout key={i} tone="surface">
                <p className="mk-p">
                  <Text r={b} />
                </p>
              </Callout>
            );
          case 'note':
            return (
              <p key={i} className="mk-note">
                <Text r={b} />
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = b.t;
            return (
              <List key={i} className={'mk-' + b.t}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Text r={it} />
                  </li>
                ))}
              </List>
            );
          }
          case 'table':
            return <DataTable key={i} rows={b.rows} />;
          case 'kv':
            return <KeyValues key={i} rows={b.rows} />;
          case 'src':
            return (
              <p key={i} className="mk-art-src">
                <Text r={b} />
              </p>
            );
          case 'tool':
            return <Tool key={i} kind={b.kind} path={path} />;
          case 'downloads':
            return <Downloads key={i} forms={b.forms} lang={lang} />;
          case 'faq':
            return faq && faq.length ? (
              <ArticleFaq
                key={i}
                items={faq}
                title={faqTitle}
                path={path}
                lang={lang}
              />
            ) : null;
          default:
            return null;
        }
      })}
    </>
  );
}

/**
 * FAQ section. Plain single-paragraph answers go through the shared
 * `FaqList`; answers with links or several paragraphs render the same
 * markup with the rich blocks.
 */
export function ArticleFaq({
  items,
  title,
  path,
  lang,
}: {
  items: ArticleFaqItem[];
  title?: string;
  path: string;
  lang: 'en' | 'de';
}) {
  const rich = items.some((f) => f.blocks && f.blocks.length);
  return (
    <>
      {title ? (
        <h2 className="mk-h2 mk-art-h2" id="faq">
          {title}
        </h2>
      ) : null}
      {rich ? (
        <div className="mk-faq">
          {items.map((f, i) => (
            <div key={i} className="mk-faq-item">
              <h3 className="mk-faq-q">{resolveTokens(f.q)}</h3>
              {f.blocks && f.blocks.length ? (
                <ArticleBlocks blocks={f.blocks} path={path} lang={lang} />
              ) : (
                <p className="mk-faq-a">{resolveTokens(f.a)}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <FaqList items={items} />
      )}
    </>
  );
}
