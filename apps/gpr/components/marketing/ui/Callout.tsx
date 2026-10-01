import type { ReactNode } from 'react';

export interface CalloutProps {
  title?: string;
  children: ReactNode;
  /**
   * `outline` (default): white + 1px #c6c6c6, r-20 — on dark/navy bands it
   * becomes white 8 % fill + white 14 % stroke automatically.
   * `tint`: #d7e4f6 panel (CTA panels). `surface`: #f1f1f1 note, r-12.
   */
  tone?: 'outline' | 'tint' | 'surface';
  id?: string;
  /** Heading level for `title`; H2 by default so it can carry a section anchor. */
  as?: 'h2' | 'h3' | 'p';
  className?: string;
}

/** Rounded card (r-20) for intake blocks, disclaimers and notices. */
export function Callout({
  title,
  children,
  tone = 'outline',
  id,
  as = 'h2',
  className,
}: CalloutProps) {
  const Heading = as;
  return (
    <div
      id={id}
      className={['mk-callout', 'mk-callout-' + tone, className || '']
        .join(' ')
        .trim()}
    >
      {title ? <Heading className="mk-callout-title">{title}</Heading> : null}
      <div className="mk-callout-body">{children}</div>
    </div>
  );
}
