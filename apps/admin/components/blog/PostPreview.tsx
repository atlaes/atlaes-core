'use client';

import type { ReactNode } from 'react';
import type { PublicPost, RenderedBlock, Rich, Span } from '@/lib/blog-api';
import { formatDate } from '@/components/ui';

interface Segment {
  start: number;
  end: number;
  span?: Span;
}

/**
 * Same matching as the sites' Inline renderer: each span is placed at its
 * first occurrence in the text that does not overlap an earlier span.
 */
function segment(text: string, spans: Span[]): Segment[] {
  const placed: Segment[] = [];
  spans.forEach((sp) => {
    if (!sp.x) return;
    let idx = text.indexOf(sp.x);
    while (idx !== -1) {
      const start = idx;
      const end = idx + sp.x.length;
      if (!placed.some((p) => start < p.end && end > p.start)) {
        placed.push({ start, end, span: sp });
        break;
      }
      idx = text.indexOf(sp.x, idx + 1);
    }
  });
  placed.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  placed.forEach((p) => {
    if (p.start > cursor) out.push({ start: cursor, end: p.start });
    out.push(p);
    cursor = p.end;
  });
  if (cursor < text.length) out.push({ start: cursor, end: text.length });
  return out;
}

/** Only links the sites would render (no javascript: etc.). */
function safeHref(href: string | undefined): string {
  if (!href) return '#';
  if (/^(https?:\/\/|mailto:|#)/i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  return '#';
}

function Inline({ x, sp }: Rich) {
  const parts: ReactNode[] = segment(x, sp ?? []).map((seg, i) => {
    const slice = x.slice(seg.start, seg.end);
    if (!seg.span) return slice;
    if (seg.span.k === 'b') return <strong key={i}>{slice}</strong>;
    return (
      <a
        key={i}
        href={safeHref(seg.span.href)}
        target="_blank"
        rel="noreferrer"
        className="text-sky-700 underline underline-offset-2"
      >
        {slice}
      </a>
    );
  });
  return <>{parts}</>;
}

function Block({ b, post }: { b: RenderedBlock; post: PublicPost }) {
  switch (b.t) {
    case 'p':
      return (
        <p className="leading-relaxed text-gray-800">
          <Inline x={b.x} sp={b.sp} />
        </p>
      );
    case 'h2':
      return (
        <h2 id={b.id} className="pt-2 text-xl font-semibold text-gray-900">
          {b.x}
        </h2>
      );
    case 'h3':
      return <h3 className="text-lg font-semibold text-gray-900">{b.x}</h3>;
    case 'quote':
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
          <Inline x={b.x} sp={b.sp} />
        </blockquote>
      );
    case 'note':
      return (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
          <Inline x={b.x} sp={b.sp} />
        </div>
      );
    case 'ul':
    case 'ol': {
      const Tag = b.t;
      return (
        <Tag
          className={`space-y-1 pl-6 text-gray-800 ${b.t === 'ul' ? 'list-disc' : 'list-decimal'}`}
        >
          {b.items.map((item, i) => (
            <li key={i}>
              <Inline x={item.x} sp={item.sp} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'table': {
      const [head, ...body] = b.rows;
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {head && (
              <thead>
                <tr>
                  {head.map((c, i) => (
                    <th
                      key={i}
                      className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((c, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-2">
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
    case 'img':
      return (
        <figure>
          {b.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.url} alt={b.alt} className="w-full rounded-md" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400">
              Image without URL
            </div>
          )}
          {b.caption && (
            <figcaption className="mt-1 text-xs text-gray-500">
              {b.caption}
            </figcaption>
          )}
        </figure>
      );
    case 'faq':
      return <FaqSection post={post} />;
  }
}

function FaqSection({ post }: { post: PublicPost }) {
  if (post.faq.length === 0) return null;
  return (
    <section className="space-y-3 border-t border-gray-200 pt-4">
      <h2 className="text-xl font-semibold text-gray-900">
        {post.site === 'vbl' && post.lang === 'de'
          ? 'Häufige Fragen'
          : 'Frequently asked questions'}
      </h2>
      {post.faq.map((f, i) => (
        <details key={i} open className="rounded-md border border-gray-200 p-3">
          <summary className="cursor-pointer font-medium text-gray-900">
            {f.q}
          </summary>
          <div className="mt-2 space-y-2">
            {f.blocks.map((b, j) => (
              <Block key={j} b={b} post={post} />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}

/** Read-only render of the `preview` (PublicPost) the API returns. */
export function PostPreview({ post }: { post: PublicPost | null }) {
  if (!post) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        The preview appears once the post has been checked.
      </p>
    );
  }
  const hasFaqMarker = post.blocks.some((b) => b.t === 'faq');
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      {post.noindex && (
        <p className="rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          noindex: search engines will not list this page.
        </p>
      )}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold leading-tight text-gray-900">
          {post.title || <span className="text-gray-400">Untitled</span>}
        </h1>
        <p className="text-sm text-gray-500">
          {[
            post.authorName,
            post.publishedAt ? formatDate(post.publishedAt) : null,
            `${post.readingMinutes} min read`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {post.excerpt && (
          <p className="text-lg text-gray-600">{post.excerpt}</p>
        )}
      </header>
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? ''}
          className="w-full rounded-lg"
        />
      )}
      {post.blocks.map((b, i) => (
        <Block key={i} b={b} post={post} />
      ))}
      {!hasFaqMarker && <FaqSection post={post} />}
      {post.ctas.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
          {post.ctas.map((c, i) => (
            <a
              key={i}
              href={safeHref(c.href)}
              target="_blank"
              rel="noreferrer"
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                i === 0
                  ? 'bg-brand-accent text-brand-dark'
                  : 'border border-gray-300 text-gray-800'
              }`}
            >
              {c.label || 'Button'}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
