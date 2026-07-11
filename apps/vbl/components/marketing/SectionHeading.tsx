import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'left' | 'center';
}

/**
 * Section header used across the marketing pages: an optional pill "eyebrow",
 * a title and optional supporting body. Colors inherit from the surrounding
 * section via `currentColor`, so the same component reads correctly on both the
 * dark brand sections and the light sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'center',
}: SectionHeadingProps) {
  const alignment =
    align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex flex-col ${alignment}`}>
      {eyebrow ? (
        <span className="mb-5 inline-flex items-center rounded-full border border-current/25 bg-current/5 px-4 py-2 text-sm font-medium">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
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
