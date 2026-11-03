'use client';

import { Suspense } from 'react';
import {
  DecisionUpload,
  DECISION_TITLE,
} from '@/components/account/payout/DecisionUpload';
import { PayoutStateView } from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/decision');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={DECISION_TITLE} />;
  return <DecisionUpload data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
