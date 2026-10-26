import { resolveTokens } from '@/content/tokens';
import type { FaqItem as FaqItemData } from '@/content/types';
import { FaqItem } from './FaqItem';

export interface FaqListProps {
  items: FaqItemData[];
  /** Heading level of each question; h3 by default. */
  as?: 'h3' | 'h4';
}

/**
 * FAQ list of native disclosures (see `FaqItem`): every answer stays in the
 * server-rendered HTML; the first one is open, the rest can be expanded.
 */
export function FaqList({ items, as = 'h3' }: FaqListProps) {
  return (
    <div className="mk-faq">
      {items.map((f, i) => (
        <FaqItem
          key={i}
          as={as}
          defaultOpen={i === 0}
          question={resolveTokens(f.q)}
        >
          <p className="mk-faq-a">{resolveTokens(f.a)}</p>
        </FaqItem>
      ))}
    </div>
  );
}
