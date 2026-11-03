'use client';

import { Suspense } from 'react';
import {
  RECEIPT_TITLE,
  TransferStatus,
} from '@/components/account/payout/TransferStatus';
import { PayoutStateView } from '@/components/account/payout/PayoutFrame';
import { usePayoutView } from '@/components/account/payout/usePayout';

function Screen() {
  const view = usePayoutView('/account/payout/receipt');
  if (view.state !== 'ready')
    return <PayoutStateView view={view} title={RECEIPT_TITLE} />;
  return <TransferStatus data={view.data} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
