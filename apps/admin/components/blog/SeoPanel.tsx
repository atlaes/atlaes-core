'use client';

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  BLOG_SITE_ORIGIN,
  postPath,
  type BlogSite,
  type SeoCheck,
  type SeoGroup,
  type SeoLevel,
  type SeoReport,
} from '@/lib/blog-api';
import { Spinner } from '@/components/ui';
import { scoreTone } from './bits';

const GROUPS: { key: SeoGroup; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'keyword', label: 'Focus keyword' },
  { key: 'content', label: 'Content' },
  { key: 'links', label: 'Links' },
  { key: 'media', label: 'Images' },
];

const LEVEL_RANK: Record<SeoLevel, number> = { error: 0, warning: 1, ok: 2 };

const RING: Record<string, string> = {
  good: 'border-emerald-500 text-emerald-700',
  wait: 'border-amber-500 text-amber-700',
  bad: 'border-red-500 text-red-700',
};

function CheckIcon({ level }: { level: SeoLevel }) {
  if (level === 'error')
    return (
      <AlertCircle
        className="mt-0.5 h-4 w-4 flex-none text-red-600"
        aria-label="Error"
      />
    );
  if (level === 'warning')
    return (
      <AlertTriangle
        className="mt-0.5 h-4 w-4 flex-none text-amber-500"
        aria-label="Warning"
      />
    );
  return (
    <CheckCircle2
      className="mt-0.5 h-4 w-4 flex-none text-emerald-600"
      aria-label="OK"
    />
  );
}

/** Rough Google truncation: titles ≈ 60 chars, descriptions ≈ 158. */
function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

export function SearchSnippet({
  site,
  slug,
  title,
  description,
}: {
  site: BlogSite;
  slug: string;
  title: string;
  description: string;
}) {
  const host = BLOG_SITE_ORIGIN[site].replace(/^https?:\/\//, '');
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 font-sans">
      <p className="truncate text-xs text-gray-700">
        {host}
        {postPath(site, slug || '…')}
      </p>
      <p className="mt-0.5 break-words text-lg leading-snug text-[#1a0dab]">
        {title ? (
          truncate(title, 60)
        ) : (
          <span className="text-gray-400">SEO title</span>
        )}
      </p>
      <p className="mt-0.5 break-words text-sm leading-snug text-[#4d5156]">
        {description ? (
          truncate(description, 158)
        ) : (
          <span className="text-gray-400">
            No meta description: Google picks text from the page.
          </span>
        )}
      </p>
    </div>
  );
}

export function SeoPanel({
  seo,
  checking,
  error,
  site,
  slug,
  seoTitle,
  metaDescription,
}: {
  seo: SeoReport | null;
  checking: boolean;
  error: string | null;
  site: BlogSite;
  slug: string;
  seoTitle: string;
  metaDescription: string;
}) {
  const errors = seo?.checks.filter((c) => c.level === 'error').length ?? 0;
  const warnings = seo?.checks.filter((c) => c.level === 'warning').length ?? 0;

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Search result preview
        </h3>
        <SearchSnippet
          site={site}
          slug={slug}
          title={seoTitle}
          description={metaDescription}
        />
      </section>

      <section className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">SEO check</h3>
          {checking && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="scale-50">
                <Spinner />
              </span>
              Checking…
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
        {!seo ? (
          !error && <p className="mt-2 text-sm text-gray-400">Checking…</p>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              <div
                className={`flex h-14 w-14 flex-none items-center justify-center rounded-full border-4 text-lg font-semibold tabular-nums ${RING[scoreTone(seo.score)]}`}
                aria-label={`SEO score ${seo.score} of 100`}
              >
                {seo.score}
              </div>
              <div className="min-w-0 text-sm">
                <p
                  className={
                    seo.canPublish
                      ? 'font-medium text-emerald-700'
                      : 'font-medium text-red-700'
                  }
                >
                  {seo.canPublish
                    ? 'Ready to publish'
                    : `${errors} error${errors === 1 ? '' : 's'} block publishing`}
                </p>
                <p className="text-xs text-gray-500">
                  {warnings} warning{warnings === 1 ? '' : 's'} ·{' '}
                  {seo.wordCount} words
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {GROUPS.map((g) => {
                const checks = seo.checks
                  .filter((c) => c.group === g.key)
                  .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
                if (checks.length === 0) return null;
                return (
                  <CheckGroup key={g.key} label={g.label} checks={checks} />
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function CheckGroup({ label, checks }: { label: string; checks: SeoCheck[] }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h4>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2 text-sm text-gray-800">
            <CheckIcon level={c.level} />
            <span className="min-w-0 break-words">{c.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
