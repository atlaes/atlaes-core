'use client';

import { useEffect, useState } from 'react';

export interface TocItem {
  id: string;
  label: string;
}

/**
 * "On this page" nav (V0100 frame 928:12821): muted 11px label, then a
 * continuous 1px #e0e0e0 left rule with 13/18 items; the active item gets
 * the 2px dark rule and Medium weight. The first item is active until the
 * reader scrolls past a later heading (scroll-spy, no layout shift).
 */
export function ArticleToc({
  items,
  label,
}: {
  items: TocItem[];
  label: string;
}) {
  const [active, setActive] = useState(items.length ? items[0].id : '');

  useEffect(() => {
    if (!items.length || typeof window === 'undefined') return;
    const ids = items.map((i) => i.id);
    function onScroll() {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      setActive(current);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  if (!items.length) return null;
  return (
    <nav className="mk-art-toc" aria-label={label}>
      <p className="mk-art-toc-label">{label}</p>
      <ol>
        {items.map((h) => (
          <li key={h.id}>
            <a
              href={'#' + h.id}
              aria-current={h.id === active ? 'location' : undefined}
            >
              {h.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
