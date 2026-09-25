import { Inline } from '../ui/Inline';
import { FlowCard } from '../intake/FlowCard';
import { StatRow } from './StatRow';
import { HERO } from './home-content';

/**
 * Hero: trust chips, display headline (no heading markup — the page's only
 * H1 is the intro heading), subline, three benefit bullets, the embedded
 * intake step 1 (flow card) and the stat row with its mandatory microcopy.
 */
export function HomeHero() {
  return (
    <header className="mk-home-hero">
      <div className="mk-home-hero-inner">
        <div className="mk-hero-copy">
          <ul className="mk-chips" aria-label="Trust">
            {HERO.chips.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mk-display">{HERO.display}</p>
          <p className="mk-subline">{HERO.subline}</p>
          <ul className="mk-bullets">
            {HERO.bullets.map((b) => (
              <li key={b}>
                <Inline x={b} />
              </li>
            ))}
          </ul>
        </div>
        <FlowCard />
      </div>
      <StatRow />
    </header>
  );
}
