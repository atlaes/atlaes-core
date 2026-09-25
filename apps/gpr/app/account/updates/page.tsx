'use client';

import { AccountStateView } from '@/components/account/AccountStates';
import { formatLongDate } from '@/components/account/format';
import {
  Card,
  EmptyLine,
  PageTitle,
  TextLink,
} from '@/components/account/primitives';
import { useAccountView } from '@/components/account/useAccountView';

export default function AccountUpdatesPage() {
  const view = useAccountView('/account/updates');
  if (view.state !== 'ready') return <AccountStateView view={view} />;

  const { updates, latest } = view.data;
  // Sent updates already appear in the activity list as "update_sent".
  const activity = latest.filter((e) => e.code !== 'update_sent');

  return (
    <div>
      <p className="mb-3 text-sm">
        <TextLink href="/account">← Back to your application</TextLink>
      </p>
      <PageTitle>All updates</PageTitle>

      <div className="space-y-4">
        {updates.length ? (
          <Card title="Updates we sent you">
            <ol className="divide-y divide-brand-stroke/50">
              {updates.map((u, i) => (
                <li key={(u.id || u.date) + i} className="py-4 first:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {formatLongDate(u.date)}
                  </p>
                  <h3 className="mt-0.5 font-bold text-brand-ink">{u.title}</h3>
                  {u.text ? (
                    <p className="mt-1 whitespace-pre-line">{u.text}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        <Card title="Activity on your application">
          {activity.length ? (
            <ol className="divide-y divide-brand-stroke/50">
              {activity.map((e, i) => (
                <li key={e.date + i} className="py-2.5 first:pt-0">
                  <span className="mr-2 font-semibold text-brand-ink">
                    {formatLongDate(e.date)}
                  </span>
                  <span className="text-brand-muted" aria-hidden>
                    ·{' '}
                  </span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyLine>Nothing to show yet.</EmptyLine>
          )}
        </Card>
      </div>
    </div>
  );
}
