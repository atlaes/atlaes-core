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
 * Latest-articles cards. Titles ship dark until the post routes exist
 * (SmartLink); the original publish date is kept and an updated date shown
 * where the sheet gives one.
 */
export function Articles() {
  return (
    <>
      <ul className="mk-article-grid">
        {ARTICLES.map((a) => (
          <li key={a.href} className="mk-article">
            <p className="mk-article-title">
              <SmartLink href={a.href} className="mk-link" darkClassName="">
                {a.title}
              </SmartLink>
            </p>
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
            <p className="mk-article-text">{a.description}</p>
          </li>
        ))}
      </ul>
      <p className="mk-section-footer">
        <Inline x={ARTICLES_FOOTER.x} sp={ARTICLES_FOOTER.sp} />
      </p>
    </>
  );
}
