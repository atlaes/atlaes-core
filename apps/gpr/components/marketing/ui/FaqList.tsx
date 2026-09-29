import { resolveTokens } from '@/content/tokens';
import type { FaqItem } from '@/content/types';

export interface FaqListProps {
  items: FaqItem[];
  /** Heading level of each question; h3 by default. */
  as?: 'h3' | 'h4';
}

/**
 * FAQ rendered as visible server-side HTML (question heading + answer
 * paragraph). No accordion: every answer is in the delivered HTML.
 */
export function FaqList({ items, as = 'h3' }: FaqListProps) {
  const Q = as;
  return (
    <div className="mk-faq">
      {items.map((f, i) => (
        <div key={i} className="mk-faq-item">
          <Q className="mk-faq-q">{resolveTokens(f.q)}</Q>
          <p className="mk-faq-a">{resolveTokens(f.a)}</p>
        </div>
      ))}
    </div>
  );
}
