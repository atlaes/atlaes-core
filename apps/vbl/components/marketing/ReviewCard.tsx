import type { ReactNode } from 'react';
import { Star } from 'lucide-react';

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
}

function deriveInitials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s.]/gu, '')
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
}: ReviewCardProps) {
  const avatarInitials = initials ?? deriveInitials(name);
  const filled = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-7">
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

      {category ? (
        <span className="mt-4 inline-flex w-fit items-center rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-brand">
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
