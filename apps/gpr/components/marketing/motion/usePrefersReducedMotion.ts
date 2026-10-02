'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * True when the user asks for reduced motion. Starts `true` on the server
 * and on the first client render (final, static state), then follows the
 * media query — so nothing animates before we know it is allowed.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const update = () => setReduced(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);
  return reduced;
}
