'use client';

import { Loader2 } from 'lucide-react';
import { apiErrorMessage } from '@/lib/account-api';
import type { AccountView } from './useAccountView';
import { Button, Card, LinkButton, PageTitle } from './primitives';

/** Renders the loading / empty / error / redirecting states of a screen. */
export function AccountStateView({
  view,
}: {
  view: Exclude<AccountView, { state: 'ready' }>;
}) {
  if (view.state === 'loading' || view.state === 'unauthenticated') {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
      >
        <Loader2
          className="mr-3 h-6 w-6 animate-spin text-brand-navy"
          aria-hidden
        />
        <span className="text-brand-body">Loading your account…</span>
      </div>
    );
  }

  if (view.state === 'empty') {
    return (
      <>
        <PageTitle>Your account</PageTitle>
        <Card title="No application yet">
          <p>
            There is no application on this account so far. Once you start one,
            this is where you will follow its progress, see every update and
            upload anything we ask for.
          </p>
          <div className="mt-4">
            <LinkButton href="/claims">Start your application</LinkButton>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle>Your account</PageTitle>
      <Card title="We could not load your application">
        <p>
          {apiErrorMessage(view.error, 'Something went wrong on our side.')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={view.retry}>Try again</Button>
          <LinkButton href="/claims" variant="secondary">
            Go to your claims
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
