import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

export interface ImportantCalloutProps {
  children: ReactNode;
  tone?: 'neutral' | 'gray' | 'white';
}

/**
 * "Important information" legal/disclaimer notice block that closes every
 * product page (Figma frames 1251:7540 / 1251:7619). Renders the pill label
 * and info icon; the page passes the per-page heading and body as children.
 * Self-contained light section so sibling product pages can drop it in without
 * repeating the section chrome.
 */
export function ImportantCallout({
  children,
  tone = 'neutral',
}: ImportantCalloutProps) {
  const sectionTone = {
    neutral: 'bg-neutral-50',
    gray: 'bg-[#f3f4f4]',
    white: 'bg-white',
  } as const;

  return (
    <section
      role="region"
      aria-label="Important information"
      className={sectionTone[tone]}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-4 py-2 text-sm font-medium text-brand">
          <Info className="h-4 w-4" aria-hidden="true" />
          Important information
        </span>
        <div className="max-w-4xl text-brand">{children}</div>
      </div>
    </section>
  );
}

export default ImportantCallout;
