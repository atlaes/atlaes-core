import { SmartLink } from '../ui/SmartLink';
import { Inline } from '../ui/Inline';
import { ARTICLES, ARTICLES_FOOTER } from './home-content';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2025-07-15` → `Jul 15, 2025`. */
function dateLabel(iso: string): string {
  const p = iso.split('-');
  return (MONTHS[Number(p[1]) - 1] || p[1]) + ' ' + Number(p[2]) + ', ' + p[0];
}

/**
 * Latest-articles cards (Figma Article Card 103:65): white card, 1px
 * #c6c6c6, r-20, pale-blue image slot, Bold 22 title, excerpt, uppercase
 * date, navy "››". Titles ship dark until the post routes exist
 * (SmartLink); the original publish date is kept and an updated date
 * shown where the sheet gives one.
 */
export function Articles() {
  return (
    <>
      <ul className="mk-article-grid">
        {ARTICLES.map((a) => (
          <li key={a.href} className="mk-article">
            <div className="mk-article-image" aria-hidden="true" />
            <div className="mk-article-content">
              <p className="mk-article-title">
                <SmartLink
                  href={a.href}
                  className="mk-article-link"
                  darkClassName=""
                >
                  {a.title}
                </SmartLink>
              </p>
              <p className="mk-article-text">{a.description}</p>
              {a.datePublished ? (
                <span className="mk-article-date">
                  <time dateTime={a.datePublished}>
                    {dateLabel(a.datePublished)}
                  </time>
                  {a.dateModified ? (
                    <>
                      {' · Updated '}
                      <time dateTime={a.dateModified}>
                        {dateLabel(a.dateModified)}
                      </time>
                    </>
                  ) : null}
                </span>
              ) : null}
              <span className="mk-article-arrow" aria-hidden="true">
                ››
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mk-section-footer">
        <Inline x={ARTICLES_FOOTER.x} sp={ARTICLES_FOOTER.sp} />
      </p>
    </>
  );
}
