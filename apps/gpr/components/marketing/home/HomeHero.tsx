import { Inline } from '../ui/Inline';
import { FlowCard } from '../intake/FlowCard';
import { StatRow } from './StatRow';
import { HERO } from './home-content';

const DE_FLAG = '🇩🇪';

/**
 * Trust line above the headline (Figma 626:11302): the German flag drawn
 * in CSS + the chips as one uppercase line joined with " · ". The flag
 * emoji of the first chip becomes the drawn flag (labelled "Germany").
 */
function TrustLine() {
  const chips = HERO.chips.map((c) =>
    c.indexOf(DE_FLAG) === 0 ? c.slice(DE_FLAG.length).trim() : c
  );
  const hasFlag = HERO.chips.some((c) => c.indexOf(DE_FLAG) === 0);
  return (
    <p className="mk-home-eyebrow">
      {hasFlag ? (
        <span className="mk-flag-de" role="img" aria-label="Germany">
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <span>{chips.join(' · ')}</span>
    </p>
  );
}

/**
 * Hero (Figma 626:11299): full-bleed blue photograph under a navy
 * gradient, a giant 14 % "››" glyph, white display headline (no heading
 * markup — the page's only H1 is the intro heading), subline, three "››"
 * benefit bullets, the stat tiles with their mandatory microcopy, and the
 * embedded intake step 1 (flow card) on the right.
 */
export function HomeHero() {
  return (
    <header className="mk-home-hero">
      <span className="mk-home-hero-deco" aria-hidden="true">
        ››
      </span>
      <div className="mk-container mk-home-hero-inner">
        <div className="mk-home-hero-copy">
          <TrustLine />
          <p className="mk-home-display">{HERO.display}</p>
          <p className="mk-home-subline">{HERO.subline}</p>
          <ul className="mk-bullets mk-home-bullets">
            {HERO.bullets.map((b) => (
              <li key={b}>
                <Inline x={b} />
              </li>
            ))}
          </ul>
          <StatRow />
        </div>
        <FlowCard />
      </div>
    </header>
  );
}
