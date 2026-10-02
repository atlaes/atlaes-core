'use client';

import { useEffect, useRef } from 'react';
import { motionAllowed } from './flag';

/**
 * Progress line for a numbered timeline (How It Works). Place it as a
 * sibling after the `<ol>` it drives (`selector`, default
 * `.mk-hiw-timeline`, looked up in the parent element). Sets
 * `--mk-step-p` (0…1) on each step and `is-reached` once the reading line
 * passes its node; CSS draws the navy line over the static tint one and
 * only when `html.js .mk[data-motion="on"]` and reduced motion is off.
 */
export function StepProgress({
  selector = '.mk-hiw-timeline',
}: {
  selector?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const parent = ref.current ? ref.current.parentElement : null;
    const list = parent ? parent.querySelector(selector) : null;
    if (!list || !motionAllowed()) return;
    const steps = Array.prototype.slice.call(list.children) as HTMLElement[];
    list.setAttribute('data-progress', '');
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.55;
      steps.forEach((li, i) => {
        const r = li.getBoundingClientRect();
        // the connector runs from this node to the next one
        const next = steps[i + 1];
        const end = next ? next.getBoundingClientRect().top : r.bottom;
        const span = Math.max(end - r.top, 1);
        const p = Math.min(Math.max((line - r.top) / span, 0), 1);
        li.style.setProperty('--mk-step-p', p.toFixed(3));
        li.classList.toggle('is-reached', r.top <= line);
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      list.removeAttribute('data-progress');
    };
  }, [selector]);
  return <span ref={ref} hidden />;
}
