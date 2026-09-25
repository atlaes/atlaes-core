import type { ReactNode } from 'react';
import { resolveTokens } from '@/content/tokens';
import type { Span } from '@/content/types';
import { SmartLink } from './SmartLink';

interface Segment {
  start: number;
  end: number;
  span?: Span;
}

/**
 * Locate each span in the (token-resolved) text, in order of appearance,
 * skipping spans that overlap an earlier one. Spans are matched by text
 * so token substitution can happen first.
 */
function segment(text: string, spans: Span[] | undefined): Segment[] {
  const placed: Segment[] = [];
  (spans || []).forEach((sp) => {
    const needle = sp.x;
    if (!needle) return;
    let from = 0;
    let idx = text.indexOf(needle, from);
    while (idx !== -1) {
      const end = idx + needle.length;
      const overlaps = placed.some((p) => idx < p.end && end > p.start);
      if (!overlaps) {
        placed.push({ start: idx, end, span: sp });
        break;
      }
      from = idx + 1;
      idx = text.indexOf(needle, from);
    }
  });
  placed.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  placed.forEach((p) => {
    if (p.start > cursor) out.push({ start: cursor, end: p.start });
    out.push(p);
    cursor = p.end;
  });
  if (cursor < text.length) out.push({ start: cursor, end: text.length });
  return out;
}

export interface InlineProps {
  x: string;
  sp?: Span[];
  linkClassName?: string;
}

/** Text with link / bold spans; quarterly tokens resolved first. */
export function Inline({ x, sp, linkClassName }: InlineProps): JSX.Element {
  const text = resolveTokens(x);
  const parts: ReactNode[] = segment(text, sp).map((seg, i) => {
    const slice = text.slice(seg.start, seg.end);
    if (!seg.span) return slice;
    if (seg.span.k === 'b') return <strong key={i}>{slice}</strong>;
    return (
      <SmartLink
        key={i}
        href={seg.span.href || '#'}
        className={linkClassName || 'mk-link'}
        darkClassName="mk-dark"
      >
        {slice}
      </SmartLink>
    );
  });
  return <>{parts}</>;
}
