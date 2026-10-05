'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export interface UseInViewOptions {
  /** IntersectionObserver rootMargin; default reveals slightly before the fold. */
  rootMargin?: string;
  /** Share of the element that must be visible (0…1). */
  threshold?: number;
  /** Stop observing after the first entry (default true). */
  once?: boolean;
}

/**
 * `[ref, inView]` for one element. Without IntersectionObserver (old
 * browsers, tests) it reports `true` so content ends in its final state.
 */
export function useInView<T extends Element = HTMLElement>(
  options: UseInViewOptions = {}
): [RefObject<T>, boolean] {
  const {
    rootMargin = '0px 0px -10% 0px',
    threshold = 0,
    once = true,
  } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= threshold) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once && !e.isIntersecting) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold, once]);
  return [ref, inView];
}
