import type { ReactNode } from 'react';

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
}: SectionHeadingProps) {
  const alignment =
    align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex flex-col ${alignment}`}>
      {eyebrow ? (
        <span
          className={`mb-5 inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium ${
            eyebrowClassName ?? 'border-current/25 bg-current/5'
          }`}
        >
          {eyebrow}
        </span>
      ) : null}
      <h2 className="max-w-5xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-current/80 sm:text-lg">
          {body}
        </p>
      ) : null}
    </div>
  );
}

export default SectionHeading;
