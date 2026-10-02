import './hero-motion.css';

/**
 * The oversized decorative "››" of the home, country and article heroes.
 * Server-rendered, aria-hidden. With motion on (`.mk[data-motion="on"]`)
 * and no reduced-motion preference it draws itself once on load: a
 * left-to-right clip reveal (~900 ms, after first paint) via the
 * `mk-glyph-draw` keyframes in `hero-motion.css`; afterwards (and in every
 * static case) it is the plain glyph. Placement/size stay with the
 * caller's class (`mk-home-hero-deco`, `mk-chero-deco`, `mk-art-deco`).
 */
export function HeroGlyph({ className }: { className: string }) {
  return (
    <span className={`${className} mk-hero-glyph`} aria-hidden="true">
      ››
    </span>
  );
}
