'use client';

import { isValidElement, useMemo, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { FaqAccordion } from './FaqAccordion';
import { FAQ_CATEGORIES } from './faqItems';

/**
 * Popular-search chips (Figma 1202:16953), verbatim canvas order. Clicking a
 * chip fills the search box with that term and filters the questions.
 */
const POPULAR_SEARCHES = [
  'bAV',
  'Direktversicherung',
  'Allianz',
  'AXA',
  'Swiss Life',
  'ERGO',
  'R+V',
  'BVV',
  'VBL',
  'VBLklassik',
  'VBLextra',
  'ZVK',
  'VddB',
  'VddKO',
  'DRV',
  'Abfindung',
  'Deposit',
  'Bank account',
];

/**
 * Flatten a React answer node into plain text so the search matches on answer
 * bodies as well as question titles. Handles strings, numbers, arrays,
 * fragments, and the local `Bullets` helper (whose list content lives in a
 * string[] `items` prop rather than in `children`).
 */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join(' ');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; items?: string[] };
    const fromItems = props.items ? props.items.join(' ') : '';
    return `${fromItems} ${nodeToText(props.children)}`;
  }
  return '';
}

/**
 * Interactive FAQ explorer (Figma frame 1199:11597): a search box with popular
 * chips, six category tabs and the accordion for the active category.
 *
 * - Typing (or clicking a chip) filters every question in every category by a
 *   case-insensitive substring match on the question title AND the answer text
 *   (see `nodeToText`); the category tabs are hidden while a query is active.
 * - Clearing the search returns to the tab view. "General questions" is the
 *   default tab with its first question open, matching the design.
 */
export function FaqExplorer() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  // Precompute one lowercased "question + answer" haystack per unique item.
  const searchIndex = useMemo(
    () =>
      FAQ_CATEGORIES.flatMap((category) =>
        category.items.map((item) => ({
          item,
          text: `${item.question} ${nodeToText(item.answer)}`.toLowerCase(),
        }))
      ),
    []
  );

  const trimmed = query.trim().toLowerCase();
  const searching = trimmed.length > 0;

  const results = useMemo(() => {
    if (!searching) return [];
    const seen = new Set<string>();
    return searchIndex
      .filter((entry) => entry.text.includes(trimmed))
      .filter((entry) => {
        if (seen.has(entry.item.question)) return false;
        seen.add(entry.item.question);
        return true;
      })
      .map((entry) => entry.item);
  }, [searchIndex, searching, trimmed]);

  return (
    <div>
      {/* Search field (Figma 1202:16875) */}
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
        <Search className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company pension questions"
          aria-label="Search company pension questions"
          className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        {searching ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Popular searches (Figma 1202:16953) */}
      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-semibold text-gray-900">
          Popular searches:
        </span>
        {POPULAR_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => setQuery(term)}
            className="rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-sm text-gray-700 transition-colors hover:border-accent/60 hover:bg-accent/20"
          >
            {term}
          </button>
        ))}
      </div>

      {searching ? (
        /* Search results across all categories (tabs hidden while searching) */
        <div className="mx-auto mt-12 max-w-5xl">
          {results.length > 0 ? (
            <>
              <p className="mb-6 text-sm text-gray-500">
                {results.length} {results.length === 1 ? 'result' : 'results'}{' '}
                for &ldquo;
                {query.trim()}&rdquo;
              </p>
              <FaqAccordion
                key={`search-${trimmed}`}
                items={results}
                defaultOpenIndex={0}
              />
            </>
          ) : (
            <div className="rounded-2xl bg-white px-8 py-10 text-center">
              <p className="text-lg font-semibold text-gray-900">
                No questions match &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="mt-2 text-base text-gray-600">
                Try a different term, or{' '}
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="font-semibold text-brand underline underline-offset-2"
                >
                  browse by category
                </button>
                .
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category tabs (Figma 1203:17027) — 2 rows × 3, one active */}
          <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FAQ_CATEGORIES.map((category, index) => {
              const active = index === activeCategory;
              return (
                <button
                  key={category.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveCategory(index)}
                  className={`rounded-lg px-6 py-5 text-left text-lg font-semibold transition-colors ${
                    active
                      ? 'bg-brand text-white'
                      : 'border border-[#d3d3d3] bg-white text-gray-900 hover:border-gray-400'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Active category question list (Figma 1204:17077) */}
          <div className="mx-auto mt-10 max-w-5xl">
            <FaqAccordion
              key={`category-${activeCategory}`}
              items={FAQ_CATEGORIES[activeCategory].items}
              defaultOpenIndex={0}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default FaqExplorer;
