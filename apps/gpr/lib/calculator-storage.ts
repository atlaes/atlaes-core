import type { GPRFormData } from '@/hooks/useGPRCalculator';

/**
 * Carries the calculator answers across page boundaries within a tab.
 *
 * `/refund-calculator` mounts its own `GPRCalculatorProvider`; its
 * "Check your eligibility" button navigates to `/calculator/qualification`,
 * which gets a fresh provider from `app/calculator/layout.tsx`. Without this
 * the jobs and the estimate were dropped there, and the magic-link request
 * went out without `gprSessionData`, so the new account had no calculator
 * data. sessionStorage keeps it per tab and clears it when the tab closes.
 */
export const CALCULATOR_STORAGE_KEY = 'gpr-calculator-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // Blocked storage (privacy mode, sandboxed iframe) throws on access.
    return null;
  }
}

function isFormData(value: unknown): value is GPRFormData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.numberOfJobs === 'number' &&
    Array.isArray(v.jobs) &&
    v.jobs.every((j) => j && typeof j === 'object') &&
    (v.calculationResult === null ||
      (typeof v.calculationResult === 'object' &&
        typeof (v.calculationResult as Record<string, unknown>).totalRefund ===
          'number'))
  );
}

export function loadCalculatorData(
  store: StorageLike | null = sessionStore()
): GPRFormData | null {
  if (!store) return null;
  try {
    const raw = store.getItem(CALCULATOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isFormData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCalculatorData(
  data: GPRFormData,
  store: StorageLike | null = sessionStore()
): void {
  if (!store) return;
  try {
    if (data.numberOfJobs === 0 && data.jobs.length === 0) {
      store.removeItem(CALCULATOR_STORAGE_KEY);
    } else {
      store.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Quota or blocked storage: the in-memory state still works on this page.
  }
}
