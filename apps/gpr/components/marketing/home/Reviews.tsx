import { REVIEWS, reviewDateLabel } from '@/content/reviews';
import { t } from '@/content/tokens';
import type { RichText } from '@/content/types';
import { Inline } from '../ui/Inline';
import { REVIEWS_SECTION } from './home-content';

const READ_DIRECTLY = ' Read them directly on ';

/**
 * Split the header sentence into the heading part and the trailing
 * "Read them directly on Google and ProvenExpert." line (Figma meta-row).
 * Pure presentation: the text and spans are unchanged.
 */
function splitHeader(h: RichText): { head: RichText; meta: RichText | null } {
  const at = h.x.indexOf(READ_DIRECTLY);
  if (at === -1) return { head: h, meta: null };
  return {
    head: { x: h.x.slice(0, at), sp: h.sp },
    meta: { x: h.x.slice(at + 1), sp: h.sp },
  };
}

/** Decorative rating + count pills (values from the token store). */
function MetaPills() {
  const rating = t('M-15.ratingExact').split('/');
  return (
    <div className="mk-review-pills" aria-hidden="true">
      <span className="mk-review-pill">
        <span className="mk-review-stars">★★★★★</span>
        <strong>{rating[0]}</strong>
        <span>/ {rating[1]}</span>
      </span>
      <span className="mk-review-pill">
        <span className="mk-review-users" />
        <strong>{t('M-16.countExact')} reviews</strong>
      </span>
    </div>
  );
}

/**
 * Reviews (Figma 626:11561): token-fed header sentence with a gold star,
 * meta row, the ten cards from `content/reviews.ts` as a masonry of 410px
 * columns (flag + reviewer link, date, stars, rule, title, text, source),
 * and the testimonials footer. Review links are clean canonical URLs.
 */
export function Reviews({ withMeta = true }: { withMeta?: boolean }) {
  const { head, meta } = splitHeader(REVIEWS_SECTION.header);
  return (
    <>
      <p className="mk-reviews-header">
        <span className="mk-reviews-star" aria-hidden="true">
          ★
        </span>
        <Inline x={head.x} sp={head.sp} />
      </p>
      {withMeta ? (
        <div className="mk-reviews-meta">
          <MetaPills />
          {meta ? (
            <p className="mk-reviews-meta-text">
              <Inline x={meta.x} sp={meta.sp} />
            </p>
          ) : null}
        </div>
      ) : null}
      <ul className="mk-review-grid">
        {REVIEWS.map((r) => (
          <li key={r.sourceUrl} className="mk-review">
            <div className="mk-review-head">
              <a
                href={r.profileUrl}
                className="mk-review-name"
                target="_blank"
                rel="noopener"
              >
                <span aria-hidden="true">{r.flag} </span>
                {r.name}
              </a>
              <time className="mk-review-date" dateTime={r.date}>
                {reviewDateLabel(r.date)}
              </time>
            </div>
            <span className="mk-review-rating" aria-hidden="true">
              ★★★★★
            </span>
            <p className="mk-review-title">{r.title}</p>
            <p className="mk-review-text">&ldquo;{r.text}&rdquo;</p>
            <p className="mk-review-src">
              <a
                href={r.sourceUrl}
                className="mk-review-src-link"
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
