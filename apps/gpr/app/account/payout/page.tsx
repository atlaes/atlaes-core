'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  NothingOpen,
  PayoutFrame,
  PayoutStateView,
} from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

const TITLE = 'Your refund';

/** `/account/payout` → the first open task (review first, then release). */
export default function PayoutIndexPage() {
  const router = useRouter();
  const view = usePayoutView('/account/payout');
  const next =
    view.state === 'ready'
      ? (view.data.tasks[0]?.href ??
        (view.data.release?.status === 'signed'
          ? '/account/payout/release'
          : null))
      : null;
  useEffect(() => {
    if (next) router.replace(next);
  }, [next, router]);
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={TITLE} />;
  if (next) return null;
  return (
    <PayoutFrame title={TITLE}>
      <NothingOpen />
    </PayoutFrame>
  );
}
