import type { CSSProperties, ReactNode } from 'react';

/**
 * Width of the "FAQ" eyebrow pill. Unlike the other pills — whose widths the
 * client specifies per section — this one is a global rule from the client's
 * 2026-07-23 review ("All FAQ badge pill should be 136x40"), so it lives here
 * rather than being repeated as a literal at all 13 FAQ sections.
 */
export const FAQ_EYEBROW_WIDTH = 136;

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'left' | 'center';
  /**
   * Optional color/border/background classes for the eyebrow pill. Defaults to
   * the `currentColor`-derived treatment (correct for dark brand sections,
   * where the pill inherits white). Light sections in the updated Figma design
   * keep a brand-green pill even though the heading next to it is charcoal, so
   * they pass an explicit green class here (e.g. the pricing/home/how-it-works
   * light sections). Opt-in, so pages that don't pass it are unaffected.
   */
  eyebrowClassName?: string;
  /**
   * Exact pill width in px, from the Figma design (client feedback gives these
   * per section, e.g. "Company pension vs DRV" = 327x40). Height is always 40px
   * (`h-10` below); only the width varies, so sections that don't pass this
   * stay auto-width.
   */
  eyebrowWidth?: number;
  /** Overrides the body paragraph's max width (default `max-w-2xl`) and lets a
   * section bold its lead, per the design's per-section line breaks. */
  bodyClassName?: string;
}

/**
 * Section header used across the marketing pages: an optional pill "eyebrow",
 * a title and optional supporting body. Colors inherit from the surrounding
 * section via `currentColor`, so the same component reads correctly on both the
 * dark brand sections and the light sections. Light sections may override the
 * pill color via `eyebrowClassName` (updated design: green pill + charcoal
 * heading).
 */
export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'center',
  eyebrowClassName,
  eyebrowWidth,
  bodyClassName = 'max-w-2xl',
}: SectionHeadingProps) {
  const alignment =
    align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex flex-col ${alignment}`}>
      {/* The Figma pill width is applied from `sm` up only (via the CSS
          variable below), and the pill may wrap on narrow phones — a fixed
          width plus `nowrap` would overflow the viewport for longer eyebrows. */}
      {eyebrow ? (
        <span
          className={`mb-5 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border px-5 py-1 text-center font-display text-base font-medium sm:w-[var(--pill-w)] sm:whitespace-nowrap ${
            eyebrowClassName ?? 'border-current/25 bg-current/5'
          }`}
          style={
            eyebrowWidth
              ? ({ '--pill-w': `${eyebrowWidth}px` } as CSSProperties)
              : undefined
          }
        >
          {eyebrow}
        </span>
      ) : null}
      <h2 className="max-w-5xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
        {title}
      </h2>
      {body ? (
        <p
          className={`mt-5 text-base leading-relaxed text-current/80 sm:text-lg ${bodyClassName}`}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

export default SectionHeading;
