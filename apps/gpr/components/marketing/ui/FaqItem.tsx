import type { ReactNode } from 'react';
import './faq-accordion.css';

export interface FaqItemProps {
  question: ReactNode;
  children: ReactNode;
  /** Open on first render (the first item of each list). */
  defaultOpen?: boolean;
  /** Heading level of the question; h3 by default. */
  as?: 'h3' | 'h4';
}

/**
 * One FAQ row as a native disclosure (`<details>`/`<summary>`): visitors can
 * open and close it, and the answer is still part of the server-rendered
 * HTML, so crawlers and the FAQPage mirror see every answer. Works without
 * JavaScript. Styled as the Figma FAQ Item (120:246): top rule, bold
 * question, 32px circle toggle showing + (closed) / − (open).
 */
export function FaqItem({
  question,
  children,
  defaultOpen = false,
  as = 'h3',
}: FaqItemProps) {
  const Q = as;
  return (
    <details className="mk-faq-item" open={defaultOpen}>
      <summary className="mk-faq-summary">
        <Q className="mk-faq-q">{question}</Q>
      </summary>
      <div className="mk-faq-body">{children}</div>
    </details>
  );
}
