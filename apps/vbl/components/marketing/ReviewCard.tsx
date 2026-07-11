import type { ReactNode } from 'react';
import { CheckCircle2, Star } from 'lucide-react';

export interface ReviewCardProps {
  /** The reviewer's quote (verbatim testimonial text). */
  quote: ReactNode;
  /** Reviewer display name, e.g. "David R." */
  name: string;
  /** Secondary line under the card — the review date in the Figma design. */
  meta?: string;
  /** Filled stars out of five. Defaults to a full five-star rating. */
  rating?: number;
  /**
   * Optional case-type tag rendered as an accent pill (e.g. "bAV Cash-Out",
   * "VBL Refund"). Additive to the core shape required by the task brief.
   */
  category?: string;
  /**
   * Optional initials for the avatar. When omitted, initials are derived from
   * `name`. Reviews hit the Figma asset cap so no reviewer photos are shipped;
   * a dignified initials avatar is used instead of an invented image.
   */
  initials?: string;
  /**
   * Optional reviewer country flag, shown top-right of the card (per the Figma
   * testimonial component). `src` points to an SVG in /marketing/reviews/flags,
   * `label` is the country name used for the accessible alt text.
   */
  flag?: { src: string; label: string };
}

// Strips everything except Unicode letters, whitespace and periods before
// deriving initials, so punctuation like hyphens and apostrophes never becomes
// an "initial" and non-Latin names (Müller, Cyrillic, CJK) keep working.
// Built via the RegExp constructor because the tsconfig target is es5, which
// rejects the `u` flag / `\p{L}` in regex LITERALS (TS1501) — a compile-time
// syntax check only. The constructor form is evaluated at runtime, where every
// supported engine (Node 10+, all modern browsers) handles Unicode property
// escapes; SWC ships regexes unchanged either way, so behavior is identical to
// the literal /[^\p{L}\s.]/gu.
const NON_INITIAL_CHARS = new RegExp('[^\\p{L}\\s.]', 'gu');

function deriveInitials(name: string): string {
  const parts = name
    .replace(NON_INITIAL_CHARS, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  const letters = parts.map((p) => p[0]).join('');
  return letters.slice(0, 2).toUpperCase();
}

/**
 * White testimonial card used on the Reviews page: initials avatar + name,
 * an optional case-type pill, the quote, a divider, then the star rating and
 * review date. Matches the Figma "Testimonial" component (frame 1206:21701).
 */
export function ReviewCard({
  quote,
  name,
  meta,
  rating = 5,
  category,
  initials,
  flag,
}: ReviewCardProps) {
  const avatarInitials = initials ?? deriveInitials(name);
  const filled = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-accent"
          >
            {avatarInitials}
          </span>
          <figcaption className="text-base font-semibold text-brand">
            {name}
          </figcaption>
        </div>
        {flag ? (
          <span className="h-[18px] w-[26px] shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flag.src}
              alt={flag.label}
              className="h-full w-full object-cover"
            />
          </span>
        ) : null}
      </div>

      {category ? (
        <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-brand">
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-brand"
            aria-hidden="true"
          />
          {category}
        </span>
      ) : null}

      <blockquote className="mt-5 flex-1 text-base leading-relaxed text-gray-600">
        {quote}
      </blockquote>

      <hr className="mt-6 border-neutral-400" />

      <div className="mt-4 flex items-center justify-between">
        <div
          className="flex items-center gap-1"
          role="img"
          aria-label={`${filled} out of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={
                i < filled
                  ? 'h-4 w-4 fill-accent text-accent'
                  : 'h-4 w-4 text-neutral-400'
              }
              aria-hidden="true"
            />
          ))}
        </div>
        {meta ? <span className="text-sm text-gray-500">{meta}</span> : null}
      </div>
    </figure>
  );
}

export default ReviewCard;
