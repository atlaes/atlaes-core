import { resolveTokens } from '@/content/tokens';
import type { Block } from '@/content/types';
import { Blocks } from '../ui/Blocks';

export interface RichFaqItem {
  q: string;
  blocks: Block[];
}

/**
 * Visible FAQ whose answers are content blocks (paragraphs, links, lists)
 * rather than a single paragraph — the schema mirror uses the plain text
 * kept beside each item. Same markup classes as `FaqList`, no accordion.
 */
export function RichFaq({ items }: { items: RichFaqItem[] }) {
  return (
    <div className="mk-faq">
      {items.map((f) => (
        <div key={f.q} className="mk-faq-item">
          <h3 className="mk-faq-q">{resolveTokens(f.q)}</h3>
          <Blocks blocks={f.blocks} />
        </div>
      ))}
    </div>
  );
}
