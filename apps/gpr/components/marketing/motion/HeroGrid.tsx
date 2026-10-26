import './hero-motion.css';

/**
 * Hero grid wave (Figma motion board 01, step 1): a fine grid of white
 * hairlines every 32px over the homepage hero photo. On load (motion on,
 * no reduced-motion preference) the grid fades in to 12 % and a soft
 * brighter band (peak 28 %) sweeps once diagonally from the top-left to
 * the bottom-right (2400ms in-out, from 300ms); afterwards, and in every
 * static case, the grid rests at 8 %.
 *
 * Server-rendered, aria-hidden, pure CSS (`hero-motion.css`): no images
 * and nothing in front of the copy, so the hero's LCP is unaffected.
 */
export function HeroGrid() {
  return (
    <div className="mk-hgrid" aria-hidden="true">
      <span className="mk-hgrid-band" />
    </div>
  );
}
