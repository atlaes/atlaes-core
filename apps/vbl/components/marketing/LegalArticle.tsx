import type { ReactNode } from 'react';

export interface LegalArticleProps {
  /** Optional "Last updated" date rendered above the article body. */
  updated?: string;
  children: ReactNode;
}

/**
 * Prose column for legal and utility pages. The project has no typography
 * plugin, so heading/list/link styles are applied once here via descendant
 * arbitrary variants and pages keep plain semantic HTML (h2/h3/p/ul).
 */
export function LegalArticle({ updated, children }: LegalArticleProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[860px] px-6 py-16 sm:py-20">
        {updated ? (
          <p className="mb-10 text-sm text-gray-500">Last updated: {updated}</p>
        ) : null}
        <div
          className="text-base leading-relaxed text-gray-700
            [&_a]:font-semibold [&_a]:text-brand [&_a]:underline
            [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-brand
            [&_h2:first-child]:mt-0
            [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-brand
            [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6
            [&_p]:mt-4
            [&_strong]:font-semibold [&_strong]:text-gray-900
            [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export default LegalArticle;
