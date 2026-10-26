'use client';

import { Suspense } from 'react';
import { ReportMissing } from '@/components/account/payout/ReportMissing';
import {
  PayoutStateView,
  REVIEW_TITLE,
} from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/review/missing');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={REVIEW_TITLE} />;
  return <ReportMissing data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
