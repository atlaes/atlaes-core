'use client';

import { useEffect, useRef } from 'react';
import { motionAllowed } from './flag';
import { cubicBezier, EASE_OUT, MOTION } from './tokens';

/** Figma 4A: the active section is the one under a line 40 % from the top. */
const READING_LINE = 0.4;
const easeOut = cubicBezier(EASE_OUT);

/**
 * Narrow screens (Figma 4A): the jump row scrolls sideways; bring the
 * active pill into view over 240ms (out easing), instantly with reduced
 * motion. Only the row scrolls, never the page.
 */
function revealInRow(row: HTMLElement, a: HTMLElement): () => void {
  if (row.scrollWidth <= row.clientWidth + 1) return () => {};
  const rr = row.getBoundingClientRect();
  const ar = a.getBoundingClientRect();
  const pad = 16;
  let delta = 0;
  if (ar.left < rr.left + pad) delta = ar.left - rr.left - pad;
  else if (ar.right > rr.right - pad) delta = ar.right - rr.right + pad;
  if (!delta) return () => {};
  const from = row.scrollLeft;
  const to = Math.max(
    0,
    Math.min(from + delta, row.scrollWidth - row.clientWidth)
  );
  if (!motionAllowed()) {
    row.scrollLeft = to;
    return () => {};
  }
  let raf = 0;
  let start = 0;
  const step = (now: number) => {
    if (!start) start = now;
    const t = Math.min(1, (now - start) / MOTION.quick);
    row.scrollLeft = from + (to - from) * easeOut(t);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/**
 * Scroll-spy for an in-page anchor menu. Render it anywhere inside the
 * `<nav>` that holds the `a[href^="#"]` links: it marks the link of the
 * section currently under the sticky chrome with `aria-current="location"`
 * (styled by `.mk-jump a[aria-current]`), and sets `data-stuck` on the
 * closest `[data-sticky]` ancestor while it is pinned. Renders a hidden marker only;
 * the links stay server-rendered. Inactive when `.mk[data-motion]` is off.
 */
export function ScrollSpy() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const marker = ref.current;
    const nav = marker ? marker.closest('nav') : null;
    const root = document.querySelector('.mk');
    if (!nav || !root || root.getAttribute('data-motion') !== 'on') return;
    const links = Array.prototype.slice.call(
      nav.querySelectorAll('a[href^="#"]')
    ) as HTMLAnchorElement[];
    const pairs = links
      .map((a) => {
        const id = decodeURIComponent(a.getAttribute('href')!.slice(1));
        return { a, el: id ? document.getElementById(id) : null };
      })
      .filter((p): p is { a: HTMLAnchorElement; el: HTMLElement } => !!p.el);
    if (!pairs.length) return;

    // optional sticky wrapper: gets `data-stuck` while pinned
    const bar = nav.closest('[data-sticky]') as HTMLElement | null;
    let current: HTMLAnchorElement | null = null;
    let ticking = false;
    let stopRowScroll = () => {};
    const update = () => {
      ticking = false;
      if (bar) {
        const cs = getComputedStyle(bar);
        const pinned =
          cs.position === 'sticky' &&
          window.scrollY > 0 &&
          bar.getBoundingClientRect().top <= (parseFloat(cs.top) || 0) + 0.5;
        if (pinned) bar.setAttribute('data-stuck', '');
        else bar.removeAttribute('data-stuck');
      }
      // reading line: 40 % from the top of the viewport (Figma 4A), never
      // above the bottom of the sticky bar
      const chrome = (bar || nav).getBoundingClientRect().bottom;
      const line = Math.max(chrome + 1, innerHeight * READING_LINE);
      let next: HTMLAnchorElement | null = null;
      for (const p of pairs) {
        if (p.el.getBoundingClientRect().top <= line) next = p.a;
      }
      // past the end of the last section: nothing is active
      const last = pairs[pairs.length - 1].el;
      if (next && last.getBoundingClientRect().bottom < line) next = null;
      if (next === current) return;
      if (current) current.removeAttribute('aria-current');
      if (next) next.setAttribute('aria-current', 'location');
      current = next;
      if (next && bar) {
        stopRowScroll();
        stopRowScroll = revealInRow(nav, next);
      }
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
      stopRowScroll();
      if (current) current.removeAttribute('aria-current');
      if (bar) bar.removeAttribute('data-stuck');
    };
  }, []);
  return <span ref={ref} hidden />;
}
