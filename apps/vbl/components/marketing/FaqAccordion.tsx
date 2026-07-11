'use client';

import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface FaqAccordionItem {
  question: string;
  answer: React.ReactNode;
}

export interface FaqAccordionProps {
  items: FaqAccordionItem[];
  /** Index of the item open on first render (Figma default: first). */
  defaultOpenIndex?: number;
}

/**
 * FAQ accordion matching the Figma FAQ cards: white rounded cards, question
 * with a plus/minus toggle on the right, one item open at a time. Used on the
 * Home page and reused by the FAQ page (Task 7).
 */
export function FaqAccordion({
  items,
  defaultOpenIndex = 0,
}: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);
  // Unique per accordion instance so panel ids don't collide when a page
  // renders more than one FaqAccordion (e.g. one per FAQ category).
  const idPrefix = useId();

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `${idPrefix}-faq-panel-${index}`;
        return (
          <div key={item.question} className="rounded-2xl bg-white px-8 py-6">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <span
                className={`text-lg font-semibold ${
                  open ? 'text-brand' : 'text-gray-900'
                }`}
              >
                {item.question}
              </span>
              {open ? (
                <Minus
                  className="mt-1 h-5 w-5 shrink-0 text-brand"
                  aria-hidden="true"
                />
              ) : (
                <Plus
                  className="mt-1 h-5 w-5 shrink-0 text-gray-500"
                  aria-hidden="true"
                />
              )}
            </button>
            {open ? (
              <div
                id={panelId}
                className="mt-4 text-base leading-relaxed text-gray-600"
              >
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default FaqAccordion;
