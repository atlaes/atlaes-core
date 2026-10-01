import type { ReactNode } from 'react';
import { EXTERNAL } from '@/content/registries/links';
import type { Block } from '@/content/types';
import { Blocks } from '../ui/Blocks';
import { Inline } from '../ui/Inline';
import { JumpMenu, type JumpMenuItem } from '../ui/JumpMenu';
import { SmartLink } from '../ui/SmartLink';

/** Trust line with "ProvenExpert" linked (M-15 sentence). */
export function TrustLine({ sentence }: { sentence: string }) {
  const idx = sentence.indexOf('ProvenExpert');
  return (
    <p className="mk-glance-trust">
      <span aria-hidden="true">⭐ </span>
      {idx === -1 ? (
        sentence
      ) : (
        <>
          {sentence.slice(0, idx)}
          <a href={EXTERNAL.provenExpert} target="_blank" rel="noopener">
            ProvenExpert
          </a>
          {sentence.slice(idx + 'ProvenExpert'.length)}
        </>
      )}
    </p>
  );
}

export interface CountryHeroProps {
  crumbs: Array<{ label: string; href: string }>;
  /** Eyebrow without the "››" glyph, e.g. "Country guide". */
  eyebrow: string;
  h1: string;
  /** Hero copy: the first paragraph renders as the 18px lead. */
  hero: Block[];
  /** CTA pills (wrapped in `.mk-cta-row`). */
  actions: ReactNode;
  glanceLabel: string;
  trust: string;
  /** "At a glance" bullets without the leading check mark. */
  bullets: string[];
  jump: JumpMenuItem[];
}

/**
 * Country hero (Figma 1057:10750): breadcrumb, eyebrow, H1, lead + copy
 * and CTA pills on the left (736); navy r-24 "At a glance" card on the
 * right (480) with the trust line and the ✅ bullets; jump-menu row and a
 * #f1f1f1 hairline underneath. A faint 520px "››" sits top-right.
 */
export function CountryHero({
  crumbs,
  eyebrow,
  h1,
  hero,
  actions,
  glanceLabel,
  trust,
  bullets,
  jump,
}: CountryHeroProps) {
  return (
    <header className="mk-chero">
      <span className="mk-chero-deco" aria-hidden="true">
        ››
      </span>
      <div className="mk-chero-inner">
        <nav aria-label="Breadcrumb" className="mk-chero-crumbs">
          {crumbs.map((c, i) => (
            <span key={c.href + c.label}>
              {i ? (
                <span className="mk-chero-sep" aria-hidden="true">
                  ›
                </span>
              ) : null}
              {i === crumbs.length - 1 ? (
                <span aria-current="page">{c.label}</span>
              ) : (
                <SmartLink href={c.href} className="mk-chero-crumb">
                  {c.label}
                </SmartLink>
              )}
            </span>
          ))}
        </nav>
        <div className="mk-chero-row">
          <div className="mk-chero-copy">
            <p className="mk-chero-eyebrow">›› {eyebrow.toUpperCase()}</p>
            <h1 className="mk-h1">{h1}</h1>
            <div className="mk-chero-text">
              <Blocks blocks={hero} />
            </div>
            <div className="mk-cta-row mk-chero-actions">{actions}</div>
          </div>
          <aside className="mk-glance" aria-label={glanceLabel}>
            <p className="mk-glance-label">{glanceLabel.toUpperCase()}</p>
            <TrustLine sentence={trust} />
            <ul className="mk-glance-list">
              {bullets.map((b, i) => (
                <li key={i}>
                  <span aria-hidden="true">✅ </span>
                  <Inline x={b} />
                </li>
              ))}
            </ul>
          </aside>
        </div>
        {jump.length ? (
          <div className="mk-chero-jump">
            <JumpMenu items={jump} />
          </div>
        ) : null}
        <div className="mk-chero-rule" aria-hidden="true" />
      </div>
    </header>
  );
}

/**
 * Closing CTA card (Figma "Card / CTA" 1059:13561): tint r-24 p-36 inside
 * a white band, navy 36px H2, 640px copy, pills, 820px muted disclaimer.
 */
export function CtaCard({
  id,
  title,
  afterSurface,
  children,
}: {
  id: string;
  title: string;
  /** Previous band is #f1f1f1: add top padding so the card does not touch it. */
  afterSurface?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={'mk-ctacard-band' + (afterSurface ? ' mk-ctacard-gap' : '')}
    >
      <div className="mk-ctacard-inner">
        <div className="mk-ctacard">
          <h2 className="mk-ctacard-h">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}
