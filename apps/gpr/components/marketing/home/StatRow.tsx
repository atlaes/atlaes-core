import { resolveTokens } from '@/content/tokens';
import { Inline } from '../ui/Inline';
import { STAT_MICROCOPY, STAT_TILES } from './home-content';

/**
 * Optional stat row (Homepage Build Sheet, Hero). A figure never renders
 * without its caption, and the timing microcopy renders whenever the row
 * does (design rule 2).
 */
export function StatRow() {
  return (
    <div className="mk-stats">
      <ul className="mk-stat-grid">
        {STAT_TILES.map((tile, i) => (
          <li key={i} className="mk-stat">
            <span className="mk-stat-figure">{resolveTokens(tile.figure)}</span>
            <span className="mk-stat-caption">
              <Inline x={tile.caption.x} sp={tile.caption.sp} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mk-stats-note">
        <Inline x={STAT_MICROCOPY.x} sp={STAT_MICROCOPY.sp} />
      </p>
    </div>
  );
}
