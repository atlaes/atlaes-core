import './hero-motion.css';

/**
 * The oversized decorative "››" of the home, country and article heroes.
 * Server-rendered, aria-hidden; placement, size, colour and resting
 * opacity stay with the caller's class (`mk-home-hero-deco`,
 * `mk-chero-deco`, `mk-art-deco`).
 *
 * Figma motion board 01, step 2: with motion on and no reduced-motion
 * preference the glyph draws itself once on load — its outline (an SVG
 * copy of the same text) is stroked along its path (900ms in-out, from
 * 200ms), then the fill fades in to its resting opacity (300ms out, from
 * 920ms) while the outline fades away. In every static case it is the
 * plain glyph.
 */
export function HeroGlyph({ className }: { className: string }) {
  return (
    <span className={`${className} mk-hero-glyph`} aria-hidden="true">
      <span className="mk-hero-glyph-fill">››</span>
      <svg className="mk-hero-glyph-line" focusable="false" aria-hidden="true">
        <text x="0" y="0.86em">
          ››
        </text>
      </svg>
    </span>
  );
}
