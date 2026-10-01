'use client';

import { AccountStateView } from '@/components/account/AccountStates';
import { HOME_COPY } from '@/components/account/HomePanel';
import { formatLongDate, formatShortDate } from '@/components/account/format';
import {
  BackLink,
  Column,
  EmptyLine,
  PageTitle,
} from '@/components/account/primitives';
import { useAccountView } from '@/components/account/useAccountView';

export default function AccountUpdatesPage() {
  const view = useAccountView('/account/updates');
  if (view.state !== 'ready') return <AccountStateView view={view} />;

  const { updates, latest, nextClientUpdateDue } = view.data;
  // Sent updates already appear in the activity list as "update_sent".
  const activity = latest.filter((e) => e.code !== 'update_sent');

  return (
    <Column width={720}>
      <BackLink href="/account">← Back to your application</BackLink>
      <PageTitle>All updates</PageTitle>

      {nextClientUpdateDue ? (
        <div className="acc-strip">
          <span className="acc-strip-label">
            {HOME_COPY.nextUpdate.heading}
          </span>
          <span className="acc-strip-date">
            By {formatLongDate(nextClientUpdateDue)}
          </span>
        </div>
      ) : null}

      {updates.length ? (
        <section className="acc-section">
          <h2 className="acc-eyebrow">Updates we sent you</h2>
          <ol className="acc-timeline">
            {updates.map((u, i) => (
              <li key={(u.id || u.date) + i} className="acc-tl-item">
                <span className="acc-tl-date">{formatShortDate(u.date)}</span>
                <div className="acc-tl-box">
                  <h3 className="acc-tl-title">{u.title}</h3>
                  {u.text ? <p className="acc-tl-text">{u.text}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="acc-section">
        <h2 className="acc-eyebrow">Activity on your application</h2>
        {activity.length ? (
          <ol className="acc-timeline">
            {activity.map((e, i) => (
              <li key={e.date + i} className="acc-tl-item">
                <span className="acc-tl-date">{formatShortDate(e.date)}</span>
                <div className="acc-tl-box">
                  <p className="acc-tl-text">{e.text}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div style={{ paddingTop: 16 }}>
            <EmptyLine>Nothing to show yet.</EmptyLine>
          </div>
        )}
      </section>
    </Column>
  );
}
