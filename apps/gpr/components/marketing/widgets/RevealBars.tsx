'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionAllowed } from '../motion/flag';
import './widgets-motion.css';

/**
 * Server-rendered bar list whose bars grow from 0 when scrolled into view.
 * The HTML ships in the final state (values, labels and bar widths); the
 * client only arms the animation for lists still below the fold, so a list
 * already on screen at hydration never flashes. Figma 3B: plays once when
 * ≥ 40 % of the list is in view. Children mark their bars with `data-bar`
 * and their figures with `data-bar-value`, and pass `--i` (row index) for
 * the 100ms stagger.
 */
export function RevealBars({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLOListElement>(null);
  const [state, setState] = useState<'static' | 'armed' | 'shown'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // on screen
    setState('armed');
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.4)
        ) {
          setState('shown');
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} className={className} data-bars={state}>
      {children}
    </ol>
  );
}
