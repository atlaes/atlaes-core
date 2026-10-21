import apiClient from './api';

export type PayoutAccountKey =
  | 'atlaes'
  | 'summitfx_collection'
  | 'wise_collection';

export interface PayoutAccount {
  key: PayoutAccountKey;
  source: 'admin' | 'env';
  holder: string;
  iban: string;
  bic: string | null;
  bank: string | null;
  reference: string | null;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export interface PayoutAccountEntry {
  key: PayoutAccountKey;
  label: string;
  account: PayoutAccount | null;
}

export interface PayoutAccountInput {
  holder: string;
  iban: string;
  bic: string | null;
  bank: string | null;
  reference: string | null;
}

export async function getPayoutAccounts(): Promise<PayoutAccountEntry[]> {
  const { data } = await apiClient.get('/admin/integrations/payout-accounts');
  return data.accounts;
}

export async function savePayoutAccount(
  key: PayoutAccountKey,
  input: PayoutAccountInput
): Promise<PayoutAccount> {
  const { data } = await apiClient.put(
    `/admin/integrations/payout-accounts/${key}`,
    input
  );
  return data.account;
}
