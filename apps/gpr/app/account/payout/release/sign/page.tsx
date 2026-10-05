'use client';

import { Suspense } from 'react';
import { SignInstruction } from '@/components/account/payout/SignInstruction';
import {
  PayoutStateView,
  releaseTitle,
} from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/release/sign');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={releaseTitle(3)} />;
  return <SignInstruction data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
