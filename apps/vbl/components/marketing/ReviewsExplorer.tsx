'use client';

import { useMemo, useState } from 'react';
import { ReviewCard } from './ReviewCard';

export interface ReviewItem {
  name: string;
  initials: string;
  /** Case-type pill shown on the card, e.g. "bAV Cash-Out", "VBL Refund". */
  category: string;
  /**
   * Filter categories this review belongs to (values from `FILTERS`, excluding
   * "All"). A review may match more than one — e.g. its scheme plus "Support".
   */
  categories: string[];
  quote: string;
  meta: string;
  rating: number;
  flag: { src: string; label: string };
}

/**
 * Interactive "Latest CompanyPension reviews" block (Figma 1206:21698): a row of
 * filter tabs above the review grid. "All" is the default active tab (dark brand
 * pill, white text); the others are white outline pills. Clicking a tab filters
 * the grid to reviews whose `categories` include the tab label. Restyling of the
 * cards themselves lives in `ReviewCard`; this component owns the tab state.
 */
export function ReviewsExplorer({
  reviews,
  filters,
}: {
  reviews: ReviewItem[];
  filters: string[];
}) {
  const [active, setActive] = useState(filters[0] ?? 'All');

  const visible = useMemo(() => {
    if (active === 'All') return reviews;
    return reviews.filter((review) => review.categories.includes(active));
  }, [active, reviews]);

  return (
    <div>
      {/* Category filters (Figma tab row) */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {filters.map((filter) => {
          const isActive = filter === active;
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(filter)}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand text-white'
                  : 'border border-[#d3d3d3] bg-white text-[#231f20] hover:border-gray-400'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((review) => (
            <ReviewCard
              key={review.name + review.meta}
              name={review.name}
              initials={review.initials}
              category={review.category}
              quote={review.quote}
              meta={review.meta}
              rating={review.rating}
              flag={review.flag}
            />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-base text-gray-500">
          No reviews in this category yet.
        </p>
      )}
    </div>
  );
}

export default ReviewsExplorer;
