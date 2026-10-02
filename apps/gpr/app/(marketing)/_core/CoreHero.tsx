import type { ReactNode } from 'react';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
// section scaffolding (.mk-hs, .mk-split-*, cards) lives in home.css
import '@/components/marketing/home/home.css';
import './core.css';

/**
 * Shared presentation for the core and utility pages (fidelity pass F4):
 * hero, breadcrumbs, centred closing CTA, split-screen FAQ and the light
 * stat strip. Figma Core pages (854:3434, 256:313, 255:243, 765:9456,
 * 257:403, 945:5582, 967:5903, 926:8184, 925:2064, 926:2217, 822:2054,
 * 1080:5118). Styles: `./core.css`, scoped under `.mk-core`.
 */

export interface Crumb {
  label: string;
  href?: string;
}

/** "Home › Page" — Semi Bold 12, muted (pale on navy). */
export function CoreCrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mk-core-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.label + i}>
              {last || !c.href ? (
                <span aria-current={last ? 'page' : undefined}>{c.label}</span>
              ) : (
                <SmartLink href={c.href} darkClassName="">
                  {c.label}
                </SmartLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Giant decorative "››" glyph (520px, blue 14 % / white 8 % on navy). */
export function CoreDeco({ className }: { className?: string }) {
  return (
    <span
      className={'mk-core-deco' + (className ? ' ' + className : '')}
      aria-hidden="true"
    >
      ››
    </span>
  );
}

export interface CoreHeroProps {
  /** Band: white, #d7e4f6 tint or navy. */
  tone?: 'plain' | 'tint' | 'navy';
  crumbs?: Crumb[];
  /** "›› LABEL" line above the H1 (design chrome, uppercase). */
  eyebrow?: ReactNode;
  /** Extra chrome above the eyebrow (partner badge). */
  badge?: ReactNode;
  title: ReactNode;
  /** H1 size on desktop: 56 (default), 60 or 72. */
  size?: 56 | 60 | 72;
  children?: ReactNode;
  /** Right-hand card (480 wide; `asideWide` → two equal columns). */
  aside?: ReactNode;
  layout?: 'aside' | 'half' | 'stack';
  /** Full-width content under the row (stat strip, notice cards). */
  after?: ReactNode;
  /** Eyebrow sits above the row (About/FAQ) instead of inside the copy. */
  eyebrowAbove?: boolean;
  className?: string;
}

export function CoreHero({
  tone = 'plain',
  crumbs,
  eyebrow,
  badge,
  title,
  size = 56,
  children,
  aside,
  layout = 'aside',
  after,
  eyebrowAbove = false,
  className,
}: CoreHeroProps) {
  const eyebrowEl = eyebrow ? (
    <p className="mk-core-eyebrow" aria-hidden="true">
      ›› {eyebrow}
    </p>
  ) : null;
  return (
    <header
      className={[
        'mk-core-hero',
        'mk-core-hero-' + tone,
        'mk-core-layout-' + (aside ? layout : 'stack'),
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      <CoreDeco className="mk-core-deco-hero" />
      <div className="mk-container mk-core-hero-inner">
        {crumbs ? <CoreCrumbs items={crumbs} /> : null}
        {eyebrowAbove ? eyebrowEl : null}
        <div className="mk-core-hero-row">
          <div className="mk-core-hero-copy">
            {badge}
            {eyebrowAbove ? null : eyebrowEl}
            <h1 className={'mk-core-h1 mk-core-h1-' + size}>{title}</h1>
            {children}
          </div>
          {aside ? <div className="mk-core-hero-aside">{aside}</div> : null}
        </div>
        {after}
      </div>
    </header>
  );
}

export interface CoreCtaProps {
  id: string;
  title: string;
  children?: ReactNode;
  cta?: ReactNode;
  note?: ReactNode;
}

/**
 * Closing CTA (about-cta-variation-3): #181818 band, centred white H2,
 * body, navy pill, optional 11px disclaimer, two "››" glyphs.
 */
export function CoreCta({ id, title, children, cta, note }: CoreCtaProps) {
  return (
    <section
      id={id}
      className="mk-core-cta mk-tone-dark"
      aria-labelledby={id + '-h'}
    >
      <CoreDeco className="mk-core-deco-cta-l" />
      <CoreDeco className="mk-core-deco-cta-r" />
      <div className="mk-container mk-core-cta-inner" data-reveal="">
        <h2 id={id + '-h'} className="mk-h2 mk-core-cta-h">
          {title}
        </h2>
        {children ? <div className="mk-core-cta-body">{children}</div> : null}
        {cta ? <div className="mk-core-cta-actions">{cta}</div> : null}
        {note ? <p className="mk-core-cta-note">{note}</p> : null}
      </div>
    </section>
  );
}

export interface StatTileProps {
  figure: ReactNode;
  caption: ReactNode;
}

/** Light stat strip (993:5242): 1px top rule, tiles with a blue left rule. */
export function CoreStats({ tiles }: { tiles: StatTileProps[] }) {
  return (
    <ul className="mk-core-stats">
      {tiles.map((t, i) => (
        <li key={i} className="mk-core-stat">
          <span className="mk-core-stat-figure">{t.figure}</span>
          <span className="mk-core-stat-caption">{t.caption}</span>
        </li>
      ))}
    </ul>
  );
}

export interface CoreSplitProps {
  id: string;
  index: number;
  label: string;
  title: string;
  /** Under the H2 in the 480 column (intro, "More answers …" line). */
  side?: ReactNode;
  children: ReactNode;
  tone?: 'plain' | 'surface' | 'tint' | 'dark' | 'navy';
  deco?: boolean;
  className?: string;
}

/**
 * Split screen (FAQ — Variation 1, 708:10285): rail + H2 in a 480 column,
 * content in the 736 column, 64 gap.
 */
export function CoreSplit({
  id,
  index,
  label,
  title,
  side,
  children,
  tone = 'plain',
  deco = false,
  className,
}: CoreSplitProps) {
  const n = index < 10 ? '0' + index : String(index);
  return (
    <section
      id={id}
      className={[
        'mk-hs mk-core-split',
        'mk-tone-' + tone,
        deco ? 'mk-core-has-deco' : '',
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {deco ? <CoreDeco className="mk-core-deco-split" /> : null}
      <div className="mk-container mk-split mk-split-480">
        <div className="mk-hs-stack mk-hs-stack-28 mk-core-split-side">
          <div className="mk-rail" aria-hidden="true" data-reveal="rail">
            <span className="mk-rail-arrows">››</span>
            <span>
              {n} — {label.toUpperCase()}
            </span>
          </div>
          <h2 className="mk-h2 mk-h2-flush">{title}</h2>
          {side}
        </div>
        <div className="mk-core-split-main" data-reveal="">
          {children}
        </div>
      </div>
    </section>
  );
}

/** Rail row on its own, for full-width section headers. */
export function CoreRail({ index, label }: { index: number; label: string }) {
  const n = index < 10 ? '0' + index : String(index);
  return (
    <div className="mk-rail" aria-hidden="true" data-reveal="rail">
      <span className="mk-rail-arrows">››</span>
      <span>
        {n} — {label.toUpperCase()}
      </span>
    </div>
  );
}
