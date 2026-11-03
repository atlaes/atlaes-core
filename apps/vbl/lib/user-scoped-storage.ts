import { clearAllFlowPersistence } from './flow-persistence';

// Browser storage that belongs to the signed-in person rather than to the
// browser: the resumable draft claim id and the persisted eligibility /
// onboarding blobs. Cleared on logout so the next account on this browser
// cannot resume (or be confused by) the previous account's draft.
const USER_LOCAL_KEYS = ['vbl_draft_claimId'];
const USER_SESSION_KEYS = [
  'vbl-pending-calculator-session-token',
  'vbl_onboarding_payment_seed',
];

export function clearUserScopedStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    USER_LOCAL_KEYS.forEach((key) => window.localStorage.removeItem(key));
    USER_SESSION_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  clearAllFlowPersistence();
}
