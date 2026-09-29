import type { ReactNode } from 'react';

export interface RailProps {
  /** 1-based section number, rendered as "01". */
  index: number;
  /** Short uppercase label, e.g. "DO I QUALIFY". */
  label: string;
}

/** The left rail: "›› 01 — LABEL". Design element, not copy. */
export function Rail({ index, label }: RailProps) {
  const n = index < 10 ? '0' + index : String(index);
  return (
    <div className="mk-rail" aria-hidden="true">
      <span className="mk-rail-arrows">››</span> {n} — {label.toUpperCase()}
    </div>
  );
}

export interface SectionProps {
  id: string;
  index: number;
  label: string;
  title?: string;
  children: ReactNode;
  /** `surface` = light grey band; `tint` = pale blue band. */
  tone?: 'plain' | 'surface' | 'tint';
  /** Heading level for `title`; H2 by default. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * Section pattern: left rail + 936px body on desktop, single column on
 * phones. The H2 carries the section id so jump-menu anchors resolve to it.
 */
export function Section({
  id,
  index,
  label,
  title,
  children,
  tone = 'plain',
  as = 'h2',
  className,
}: SectionProps) {
  const Heading = as;
  return (
    <section
      id={id}
      className={['mk-section', 'mk-tone-' + tone, className || '']
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
