import apiClient from './api';

export type OpsSettingKey =
  | 'postal_agent'
  | 'direct_dispatch_operator'
  | 'payout_timers'
  | 'payout_reviews';

/** Escrow payout e-mail timers per product (days unless noted). */
export interface PayoutTimers {
  missingFundsDays: number;
  missingDecisionDays: number;
  lateReviewDays: number;
  reminderDays: number[];
  reviewReminderDaysBefore: number;
  followUpDays: number;
  arrivalCheckWorkingDays: number;
  directArrivalWorkingDays: number | null;
}

export interface PayoutTimersSetting {
  gpr: PayoutTimers;
  bav: PayoutTimers;
}

export interface ProductReviews {
  links: { label: string; url: string }[];
  trustpilotBcc: string | null;
}

export interface PayoutReviewsSetting {
  gpr: ProductReviews;
  bav: ProductReviews;
}

export interface PostalAgent {
  /** Printed before the name in the direct DRV cover letter; '' for none. */
  salutation: 'Frau' | 'Herr' | '';
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
  key: 'payout_timers',
  value: PayoutTimersSetting
): Promise<OpsSetting>;
export async function saveOpsSetting(
  key: 'payout_reviews',
  value: PayoutReviewsSetting
): Promise<OpsSetting>;
export async function saveOpsSetting(
  key: OpsSettingKey,
  value:
    | PostalAgent
    | DispatchOperator
    | PayoutTimersSetting
    | PayoutReviewsSetting
): Promise<OpsSetting> {
  const { data } = await apiClient.put(
    `/admin/integrations/ops-settings/${key}`,
    value
  );
  return data.setting;
}
