'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motionAllowed } from '../motion/flag';
import './widgets-motion.css';

/**
 * Server-rendered bar list whose bars grow from 0 when scrolled into view.
 * The HTML ships in the final state (values, labels and bar widths); the
 * client only arms the animation for lists still below the fold, so a list
 * already on screen at hydration never flashes. Children mark their bars
 * with `data-bar` and pass `--i` for the 80ms stagger.
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
        if (entries.some((e) => e.isIntersecting)) {
          setState('shown');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -15% 0px' }
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
