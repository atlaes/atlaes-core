'use client';

import { useEffect } from 'react';
import { motionAllowed } from './flag';

/**
 * Elements tagged automatically on pages that do not set `data-reveal`
 * themselves (home, core and utility pages). Units that contain an H1 or
 * sit inside a hero are never tagged, so the LCP headline is untouched.
 */
const AUTO_REVEAL = [
  '.mk-hs > .mk-container',
  '.mk-section > .mk-section-inner > .mk-body',
  '.mk-core-cta-inner',
  // article pages: structural blocks only, never running paragraphs
  '.mk-art-col > .mk-art-tool',
  '.mk-art-col > .mk-art-kv',
  '.mk-art-col > .mk-callout',
  '.mk-art-col > .mk-table-wrap',
  '.mk-art-col > .mk-faq',
  '.mk-art-review',
].join(',');
const AUTO_RAIL = '.mk-main .mk-rail';
const AUTO_STAGGER = [
  '.mk-review-grid',
  '.mk-article-grid',
  '.mk-criteria',
  '.mk-two-cards',
  '.mk-core-tiles',
  '.mk-art-stats',
].join(',');
const HERO = 'header, .mk-home-hero, .mk-chero, .mk-core-hero, .mk-hero';
const STAGGER_STEP_MS = 70;
const STAGGER_MAX = 8;
const SCROLLED_PX = 8;

function skip(el: Element): boolean {
  return !!el.closest(HERO) || !!el.querySelector('h1');
}

function tag(root: Element) {
  root.querySelectorAll(AUTO_REVEAL).forEach((el) => {
    if (!el.hasAttribute('data-reveal') && !skip(el)) {
      el.setAttribute('data-reveal', '');
    }
  });
  root.querySelectorAll(AUTO_RAIL).forEach((el) => {
    if (!el.hasAttribute('data-reveal') && !el.closest(HERO)) {
      el.setAttribute('data-reveal', 'rail');
    }
  });
  root.querySelectorAll(AUTO_STAGGER).forEach((el) => {
    if (!el.hasAttribute('data-reveal-stagger') && !el.closest(HERO)) {
      el.setAttribute('data-reveal-stagger', '');
    }
  });
}

function setStagger(el: Element) {
  Array.prototype.forEach.call(el.children, (child: HTMLElement, i: number) => {
    child.style.setProperty(
      '--reveal-delay',
      Math.min(i, STAGGER_MAX) * STAGGER_STEP_MS + 'ms'
    );
  });
}

/**
 * The one motion island of the marketing layout. When the switch is on
 * and reduced motion is off it:
 * 1. tags reveal targets, marks the ones already on screen as shown
 *    (`is-in is-static`, no animation), then sets `html.js` — only then
 *    does CSS hide the rest, so no-JS visitors and crawlers see everything;
 * 2. adds `is-in` to `[data-reveal]` / `[data-reveal-stagger]` once they
 *    enter the viewport (IntersectionObserver), including content added
 *    by client navigation (MutationObserver);
 * 3. sets `data-scrolled` on `.mk-header` after 8px of scroll.
 * Renders nothing.
 */
export function MotionObserver() {
  useEffect(() => {
    const root = document.querySelector('.mk');
    if (!root || root.getAttribute('data-motion') !== 'on') return;
    const header = document.querySelector('.mk-header');

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!header) return;
        if (window.scrollY > SCROLLED_PX) {
          header.setAttribute('data-scrolled', '');
        } else {
          header.removeAttribute('data-scrolled');
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!motionAllowed() || typeof IntersectionObserver === 'undefined') {
      return () => window.removeEventListener('scroll', onScroll);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );

    const SEL = '[data-reveal]:not(.is-in), [data-reveal-stagger]:not(.is-in)';
    const scan = (scope: Element) => {
      tag(scope);
      const vh = window.innerHeight;
      scope.querySelectorAll(SEL).forEach((el) => {
        if (el.hasAttribute('data-reveal-stagger')) setStagger(el);
        const r = el.getBoundingClientRect();
        const visible = r.top < vh && r.bottom > 0;
        // Before `html.js` exists nothing is hidden: whatever is on
        // screen now stays as it is (no animation, no flash).
        if (visible && !document.documentElement.classList.contains('js')) {
          el.classList.add('is-in', 'is-static');
        } else {
          io.observe(el);
        }
      });
    };

    scan(root);
    document.documentElement.classList.add('js');

    let pending = false;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        scan(root);
      });
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      mo.disconnect();
      document.documentElement.classList.remove('js');
    };
  }, []);
  return null;
}
