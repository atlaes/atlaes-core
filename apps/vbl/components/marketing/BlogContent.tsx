import type { ReactNode } from 'react';
import Link from 'next/link';
import { FaqAccordion } from './FaqAccordion';
import { imageUrl } from '@/lib/blog-api';
import type {
  RenderedBlock,
  RenderedFaqItem,
  Rich,
  Span,
} from '@/lib/blog-api';

// ---------------------------------------------------------------------------
// Blog post body renderer for the CMS render format (docs/blog-cms.md).
// No HTML is ever stored: text is plain, and bold / links come from spans
// matched by text.
// ---------------------------------------------------------------------------

const LINK =
  'font-semibold text-brand underline underline-offset-2 hover:text-brand/80';

/** Internal links via next/link, external ones in a new tab. */
export function BlogLink({
  href,
  className = LINK,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href.charAt(0) === '/' && href.charAt(1) !== '/') {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  if (/^(#|mailto:|tel:)/.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noopener">
      {children}
    </a>
  );
}

/**
 * Text with its spans: each span marks the first occurrence of its `x`
 * after the previous span, in order; spans that are not found are skipped.
 */
export function RichText({ x, sp }: Rich) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  (sp || []).forEach((span: Span, i) => {
    if (!span.x) return;
    const at = x.indexOf(span.x, cursor);
    if (at === -1) return;
    if (at > cursor) parts.push(x.slice(cursor, at));
    parts.push(
      span.k === 'b' ? (
        <strong key={i} className="font-semibold text-gray-900">
          {span.x}
        </strong>
      ) : (
        <BlogLink key={i} href={span.href || '#'}>
          {span.x}
        </BlogLink>
      )
    );
    cursor = at + span.x.length;
  });
  if (cursor < x.length) parts.push(x.slice(cursor));
  return <>{parts}</>;
}

function Table({ rows }: { rows: string[][] }) {
  if (!rows.length) return null;
  const [head, ...body] = rows;
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm sm:text-base">
        <thead className="bg-brand text-white">
          <tr>
            {head.map((c, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-t border-gray-200 even:bg-[#f3f4f4]">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 align-top text-gray-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Faq({ items, title }: { items: RenderedFaqItem[]; title: string }) {
  return (
    <>
      <h2
        id="faq"
        className="mt-12 scroll-mt-28 font-display text-2xl font-bold tracking-tight text-brand sm:text-3xl"
      >
        {title}
      </h2>
      <div className="mt-6 rounded-3xl bg-[#f3f4f4] p-3 sm:p-5">
        <FaqAccordion
          items={items.map((f) => ({
            question: f.q,
            answer: f.blocks.length ? (
              <div className="space-y-3">
                <BlogBlocks blocks={f.blocks} nested />
              </div>
            ) : (
              <p>{f.a}</p>
            ),
          }))}
        />
      </div>
    </>
  );
}

export interface BlogBlocksProps {
  blocks: RenderedBlock[];
  faq?: RenderedFaqItem[];
  faqTitle?: string;
  /** Inside an FAQ answer: no top margins, no nested FAQ. */
  nested?: boolean;
}

export function BlogBlocks({
  blocks,
  faq,
  faqTitle = 'Frequently asked questions',
  nested = false,
}: BlogBlocksProps) {
  const gap = nested ? '' : 'mt-5';
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} className={gap}>
                <RichText x={b.x} sp={b.sp} />
              </p>
            );
          case 'h2':
            return (
              <h2
                key={i}
                id={b.id}
                className="mt-12 scroll-mt-28 font-display text-2xl font-bold tracking-tight text-brand first:mt-0 sm:text-3xl"
              >
                {b.x}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-8 text-lg font-semibold text-brand">
                {b.x}
              </h3>
            );
          case 'quote':
            return (
              <blockquote
                key={i}
                className="mt-6 border-l-4 border-accent bg-[#f3f4f4] px-6 py-4 text-lg leading-relaxed text-brand"
              >
                <RichText x={b.x} sp={b.sp} />
              </blockquote>
            );
          case 'note':
            return (
              <aside
                key={i}
                className="mt-6 rounded-2xl border border-brand/15 bg-accent/10 px-6 py-4 text-sm leading-relaxed text-gray-700"
              >
                <RichText x={b.x} sp={b.sp} />
              </aside>
            );
          case 'ul':
          case 'ol': {
            const List = b.t;
            return (
              <List
                key={i}
                className={`${gap} space-y-2 pl-6 ${
                  b.t === 'ul' ? 'list-disc' : 'list-decimal'
                } marker:text-brand`}
              >
                {b.items.map((it, j) => (
                  <li key={j}>
                    <RichText x={it.x} sp={it.sp} />
                  </li>
                ))}
              </List>
            );
          }
          case 'table':
            return <Table key={i} rows={b.rows} />;
          case 'img':
            return (
              <figure key={i} className="mt-8">
                {/* Plain img: CMS uploads live on the API host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(b.url)}
                  alt={b.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full rounded-2xl border border-gray-200"
                />
                {b.caption ? (
                  <figcaption className="mt-2 text-sm text-gray-500">
                    {b.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          case 'faq':
            return !nested && faq && faq.length ? (
              <Faq key={i} items={faq} title={faqTitle} />
            ) : null;
          default:
            return null;
        }
      })}
    </>
  );
}

export default BlogBlocks;
