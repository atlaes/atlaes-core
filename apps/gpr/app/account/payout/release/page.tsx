'use client';

import { Suspense } from 'react';
import { ReleaseBank } from '@/components/account/payout/ReleaseBank';
import {
  PayoutStateView,
  releaseTitle,
} from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/release');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={releaseTitle(1)} />;
  return <ReleaseBank data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
