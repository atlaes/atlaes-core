'use client';

import { GPRCalculatorProvider } from '@/hooks/useGPRCalculator';
import GPRCalculator from '@/components/calculator/GPRCalculator';

/**
 * The existing calculator, mounted the same way `/calculator` does it
 * (`app/calculator/layout.tsx` wraps it in `GPRCalculatorProvider`). The
 * results step navigates to `/calculator/qualification`, which has its own
 * provider instance; the provider persists its answers to sessionStorage
 * (`lib/calculator-storage.ts`) so that page restores the jobs and the
 * estimate and sends them with the magic-link request.
 */
export function CalculatorEmbed() {
  return (
    <GPRCalculatorProvider>
      <GPRCalculator />
    </GPRCalculatorProvider>
  );
}
