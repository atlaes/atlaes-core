import { resolveTokens } from '@/content/tokens';
import type { Block } from '@/content/types';
import { Blocks } from '../ui/Blocks';
import { FaqItem } from '../ui/FaqItem';

export interface RichFaqItem {
  q: string;
  blocks: Block[];
}

/**
 * FAQ whose answers are content blocks (paragraphs, links, lists) rather
 * than a single paragraph — the schema mirror uses the plain text kept
 * beside each item. Same disclosure rows as `FaqList`; the first is open.
 */
export function RichFaq({ items }: { items: RichFaqItem[] }) {
  return (
    <div className="mk-faq">
      {items.map((f, i) => (
        <FaqItem key={f.q} defaultOpen={i === 0} question={resolveTokens(f.q)}>
          <Blocks blocks={f.blocks} />
        </FaqItem>
      ))}
    </div>
  );
}
