'use client';

import { useEffect, useRef } from 'react';
import { motionAllowed } from './flag';
import { useInView } from './useInView';
import { formatFigure, parseFigure } from './countUpFormat';

const DURATION_MS = 1200;

/**
 * Animated stat figure. The server HTML holds the final formatted text
 * (token-resolved) in both a visually hidden copy (what assistive tech
 * reads) and the visible, aria-hidden copy. On the client, once in view
 * and only when motion is allowed (`.mk[data-motion="on"]`, no
 * `prefers-reduced-motion`), the visible copy counts from 0 to the value
 * over 1.2 s (ease-out) by writing `textContent` directly; the last frame
 * is the exact server string.
 */
export function CountUp({ text }: { text: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>({ rootMargin: '0px' });
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!inView || done.current || !el) return;
    done.current = true;
    const fig = parseFigure(text);
    if (!fig || !motionAllowed()) return;
    let raf = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1 ? formatFigure(fig, fig.value * eased) : text;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    el.textContent = formatFigure(fig, 0);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [inView, text, ref]);

  return (
    <>
      <span className="mk-sr">{text}</span>
      <span ref={ref} className="mk-countup" aria-hidden="true">
        {text}
      </span>
    </>
  );
}
