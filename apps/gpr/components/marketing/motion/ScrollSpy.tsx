'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-spy for an in-page anchor menu. Render it anywhere inside the
 * `<nav>` that holds the `a[href^="#"]` links: it marks the link of the
 * section currently under the sticky chrome with `aria-current="location"`
 * (styled by `.mk-jump a[aria-current]`), and sets `data-stuck` on the
 * closest `[data-sticky]` ancestor while it is pinned. Renders a hidden marker only;
 * the links stay server-rendered. Inactive when `.mk[data-motion]` is off.
 */
export function ScrollSpy({ offset = 24 }: { offset?: number }) {
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
      // reading line: below the sticky bar (or the nav), a little way in
      const chrome = (bar || nav).getBoundingClientRect().bottom;
      const line =
        Math.max(chrome, 0) +
        Math.max(offset, Math.min(innerHeight * 0.25, 160));
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
      if (current) current.removeAttribute('aria-current');
      if (bar) bar.removeAttribute('data-stuck');
    };
  }, [offset]);
  return <span ref={ref} hidden />;
}
