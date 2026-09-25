import type { ReactNode } from 'react';

export interface CalloutProps {
  title?: string;
  children: ReactNode;
  /** `tint` (default, pale blue), `surface` (grey), `outline` (stroke only). */
  tone?: 'tint' | 'surface' | 'outline';
  id?: string;
  /** Heading level for `title`; H2 by default so it can carry a section anchor. */
  as?: 'h2' | 'h3' | 'p';
}

/** Rounded card (r-20) for intake blocks, disclaimers and notices. */
export function Callout({
  title,
  children,
  tone = 'tint',
  id,
  as = 'h2',
}: CalloutProps) {
  const Heading = as;
  return (
    <div id={id} className={'mk-callout mk-callout-' + tone}>
      {title ? <Heading className="mk-callout-title">{title}</Heading> : null}
      <div className="mk-callout-body">{children}</div>
    </div>
  );
}
