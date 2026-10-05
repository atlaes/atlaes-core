'use client';

import { useEffect, useRef } from 'react';
import { motionAllowed } from './flag';
import { useInView } from './useInView';
import { formatFigure, parseFigure } from './countUpFormat';
import { cubicBezier, EASE_OUT, MOTION } from './tokens';

/** Figma board 01, step 3: counters start 400ms after the trigger. */
const START_DELAY_MS = 400;
/** …and 120ms apart, left to right. */
const TILE_STEP_MS = 120;
const easeOut = cubicBezier(EASE_OUT);

/**
 * Animated stat figure. The server HTML holds the final formatted text
 * (token-resolved) in both a visually hidden copy (what assistive tech
 * reads) and the visible, aria-hidden copy. On the client, once ≥ 50 % in
 * view and only when motion is allowed (`.mk[data-motion="on"]`, no
 * `prefers-reduced-motion`), the visible copy counts from 0 to the value
 * over 1200ms (out easing), starting 400ms + 120ms × `index` after the
 * trigger, in pale blue (`is-counting`); at the end it is the exact server
 * string and turns white (150ms, standard).
 */
export function CountUp({ text, index = 0 }: { text: string; index?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>({
    rootMargin: '0px',
    threshold: 0.5,
  });
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!inView || done.current || !el) return;
    done.current = true;
    const fig = parseFigure(text);
    if (!fig || !motionAllowed()) return;
    let raf = 0;
    let start = 0;
    const delay = START_DELAY_MS + index * TILE_STEP_MS;
    const finish = () => {
      el.textContent = text;
      el.classList.remove('is-counting');
    };
    const step = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start - delay;
      const t = Math.min(1, Math.max(0, elapsed / MOTION.count));
      if (t < 1) {
        el.textContent = formatFigure(fig, fig.value * easeOut(t));
        raf = requestAnimationFrame(step);
      } else {
        finish();
      }
    };
    el.classList.add('is-counting');
    el.textContent = formatFigure(fig, 0);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      finish();
    };
  }, [inView, text, index, ref]);

  return (
    <>
      <span className="mk-sr">{text}</span>
      <span ref={ref} className="mk-countup" aria-hidden="true">
        {text}
      </span>
    </>
  );
}
