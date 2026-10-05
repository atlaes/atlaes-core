'use client';

import { Suspense } from 'react';
import { ReviewDecision } from '@/components/account/payout/ReviewDecision';
import {
  PayoutStateView,
  REVIEW_TITLE,
} from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/review');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={REVIEW_TITLE} />;
  return <ReviewDecision data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
