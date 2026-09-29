'use client';

import { AccountStateView } from '@/components/account/AccountStates';
import { HomePanel } from '@/components/account/HomePanel';
import { useAccountView } from '@/components/account/useAccountView';

export default function AccountHomePage() {
  const view = useAccountView('/account');
  if (view.state !== 'ready') return <AccountStateView view={view} />;
  return <HomePanel data={view.data} />;
}
