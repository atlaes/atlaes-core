import type { ReactNode } from 'react';
import Image from 'next/image';

export interface StepCardProps {
  /** Step label shown in the dark badge, e.g. "Step 1". */
  number: string;
  title: string;
  body: ReactNode;
  /** Optional supporting image rendered above the step body. */
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  /**
   * `'dark'` restyles the card for the brand-green sections Figma uses on some
   * product pages (translucent card on the dark band, accent badge, white
   * text), matching the dark inner cards on the vbl-refund page. Opt-in, so
   * the light default used by every other page is unchanged.
   */
  tone?: 'light' | 'dark';
}

/**
 * Numbered process step card used on the How-it-works page and reused on the
 * product pages. A "Step N" pill sits at the top, followed by the title and
 * body. The card stretches to fill its grid track so rows stay aligned.
 */
export function StepCard({
  number,
  title,
  body,
  image,
  tone = 'light',
}: StepCardProps) {
  const dark = tone === 'dark';
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border p-8 ${
        dark ? 'border-white/10 bg-black/20' : 'border-neutral-400 bg-white'
      }`}
    >
      {image ? (
        <div className="mb-6 overflow-hidden rounded-brand">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <span
        className={`inline-flex w-fit items-center rounded-lg px-4 py-1.5 text-sm font-semibold ${
          dark ? 'bg-accent text-brand' : 'bg-brand text-white'
        }`}
      >
        {number}
      </span>

      <h3
        className={`mt-6 text-xl font-semibold ${dark ? 'text-white' : 'text-brand'}`}
      >
        {title}
      </h3>

      <div
        className={`mt-4 text-base leading-relaxed ${dark ? 'text-white/75' : 'text-gray-600'}`}
      >
        {body}
      </div>
    </div>
  );
}

export default StepCard;
