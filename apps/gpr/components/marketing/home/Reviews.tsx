import { REVIEWS, reviewDateLabel } from '@/content/reviews';
import { Inline } from '../ui/Inline';
import { REVIEWS_SECTION } from './home-content';

/**
 * Reviews section: token-fed header sentence, the ten cards from
 * `content/reviews.ts` (flag, reviewer + profile link, date, title, text,
 * source link) and the testimonials footer. Review links are clean
 * canonical URLs.
 */
export function Reviews() {
  return (
    <>
      <p className="mk-reviews-header">
        <span aria-hidden="true">⭐ </span>
        <Inline x={REVIEWS_SECTION.header.x} sp={REVIEWS_SECTION.header.sp} />
      </p>
      <ul className="mk-review-grid">
        {REVIEWS.map((r) => (
          <li key={r.sourceUrl} className="mk-review">
            <div className="mk-review-head">
              <span aria-hidden="true">{r.flag}</span>
              <a
                href={r.profileUrl}
                className="mk-review-name"
                target="_blank"
                rel="noopener"
              >
                {r.name}
              </a>
              <time className="mk-review-date" dateTime={r.date}>
                {reviewDateLabel(r.date)}
              </time>
            </div>
            <p className="mk-review-title">{r.title}</p>
            <p className="mk-review-text">&ldquo;{r.text}&rdquo;</p>
            <p className="mk-review-src">
              <a
                href={r.sourceUrl}
                className="mk-link"
                target="_blank"
                rel="noopener"
              >
                {r.sourceLabel}
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="mk-section-footer">
        <Inline x={REVIEWS_SECTION.footer.x} sp={REVIEWS_SECTION.footer.sp} />
      </p>
    </>
  );
}
