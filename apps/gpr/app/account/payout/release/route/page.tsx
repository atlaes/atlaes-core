'use client';

import { Suspense } from 'react';
import { RoutePanel } from '@/components/account/payout/RoutePanel';
import {
  PayoutStateView,
  releaseTitle,
} from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/release/route');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={releaseTitle(2)} />;
  return <RoutePanel data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
