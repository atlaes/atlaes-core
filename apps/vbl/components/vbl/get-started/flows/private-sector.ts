import { FlowConfig, EligibilityData, StepId } from './index';
import {
  formatEuro,
  getBavThresholds,
  normalizeEuroAmount,
} from '@/lib/bav-thresholds';

/**
 * Without a DRV refund (route B) a provider may only cash out a small
 * entitlement (§ 3 Abs. 2 BetrAVG). The backend refuses a route-B claim
 * above the limit at submission, which comes after the deposit, so the
 * check runs here, before the payment.
 */
export function privateAboveSmallEntitlementLimit(
  data: EligibilityData
): { amount: number; limit: number } | null {
  if (data.privateStatePensionRefundReceived !== 'no') return null;
  const type = data.privateStatementValueType;
  if (type !== 'monthly_pension' && type !== 'capital_amount') return null;
  const normalized = normalizeEuroAmount(data.privateStatementAmount || '');
  if (normalized === null) return null;
  const amount = Number(normalized);
  const thresholds = getBavThresholds();
  const limit =
    type === 'monthly_pension' ? thresholds.pension : thresholds.capital;
  return amount > limit ? { amount, limit } : null;
}

export const privateSectorFlow: FlowConfig = {
  steps: [
    'private_entry_path',
    'private_upload',
    'private_state_pension_refund',
    'private_pension_provider',
    'private_statement_amount',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'private_upload') {
      return data.privateEntryPath !== 'upload';
    }

    if (
      stepId === 'private_state_pension_refund' ||
      stepId === 'private_pension_provider' ||
      stepId === 'private_statement_amount'
    ) {
      return data.privateEntryPath === 'upload';
    }

    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    if (stepId !== 'private_statement_amount' && stepId !== 'private_upload')
      return null;
    const above = privateAboveSmallEntitlementLimit(data);
    if (!above) return null;
    const what =
      data.privateStatementValueType === 'monthly_pension'
        ? 'monthly pension'
        : 'capital value';
    return {
      title: 'This pension is above the small-entitlement limit',
      message: `Your statement shows a ${what} of ${formatEuro(above.amount)} EUR. Without a refund of your German state pension contributions, a provider may only pay out entitlements up to ${formatEuro(above.limit)} EUR (${new Date().getFullYear()}), so we cannot file a cash-out request for you now. Please check the amount on your statement. Once your DRV contributions have been refunded, a cash-out becomes possible regardless of the amount.`,
    };
  },
};
