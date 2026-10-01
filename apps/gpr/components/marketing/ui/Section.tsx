import type { ReactNode } from 'react';

export interface RailProps {
  /** 1-based section number, rendered as "01". */
  index: number;
  /** Short uppercase label, e.g. "DO I QUALIFY". */
  label: string;
}

/**
 * The rail: "›› 01 — LABEL" (Bold 12, letter-spacing 1.7, uppercase,
 * light blue; pale on navy). Design element, not copy.
 */
export function Rail({ index, label }: RailProps) {
  const n = index < 10 ? '0' + index : String(index);
  return (
    <div className="mk-rail" aria-hidden="true">
      <span className="mk-rail-arrows">››</span>
      <span>
        {n} — {label.toUpperCase()}
      </span>
    </div>
  );
}

export type SectionTone = 'plain' | 'surface' | 'tint' | 'dark' | 'navy';

export interface SectionProps {
  id: string;
  index: number;
  label: string;
  title?: string;
  children: ReactNode;
  /**
   * Band colour: `plain` white, `surface` #f1f1f1, `tint` #d7e4f6,
   * `dark` #181818, `navy` #002691 (dark/navy switch type to white, body
   * to white 75 %, links to pale).
   */
  tone?: SectionTone;
  /** 1px #f1f1f1 hairline on top (used between two white bands). */
  ruleTop?: boolean;
  /** Heading level for `title`; H2 by default. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * Section pattern (country frame): 280px rail + 64px gap + 936px body
 * inside the 1440 frame (80px side padding), 100px top/bottom; single
 * column with 16px gutters on phones. The H2 carries the section id so jump-menu anchors resolve to it.
 */
export function Section({
  id,
  index,
  label,
  title,
  children,
  tone = 'plain',
  as = 'h2',
  ruleTop = false,
  className,
}: SectionProps) {
  const Heading = as;
  return (
    <section
      id={id}
      className={[
        'mk-section',
        'mk-tone-' + tone,
        ruleTop ? 'mk-rule-top' : '',
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      <div className="mk-section-inner">
        <Rail index={index} label={label} />
        <div className="mk-body">
          {title ? <Heading className="mk-h2">{title}</Heading> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
