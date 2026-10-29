import apiClient from './api';

export type OpsSettingKey = 'postal_agent' | 'direct_dispatch_operator';

export interface PostalAgent {
  name: string;
  coLine?: string | null;
  street: string;
  postalCode: string;
  city: string;
}

export interface DispatchOperator {
  name: string;
}

export interface OpsSetting {
  key: OpsSettingKey;
  label: string;
  value: unknown;
  /** 'default' = built-in fallback, nothing saved yet. */
  source: 'admin' | 'default';
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export async function getOpsSettings(): Promise<OpsSetting[]> {
  const { data } = await apiClient.get('/admin/integrations/ops-settings');
  return data.settings;
}

/** 400 → { error, issues: [{ path, message }] } (shown via ErrorText). */
export async function saveOpsSetting(
  key: 'postal_agent',
  value: PostalAgent
): Promise<OpsSetting>;
export async function saveOpsSetting(
  key: 'direct_dispatch_operator',
  value: DispatchOperator
): Promise<OpsSetting>;
export async function saveOpsSetting(
  key: OpsSettingKey,
  value: PostalAgent | DispatchOperator
): Promise<OpsSetting> {
  const { data } = await apiClient.put(
    `/admin/integrations/ops-settings/${key}`,
    value
  );
  return data.setting;
}
