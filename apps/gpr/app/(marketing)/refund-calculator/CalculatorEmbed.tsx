'use client';

import { GPRCalculatorProvider } from '@/hooks/useGPRCalculator';
import GPRCalculator from '@/components/calculator/GPRCalculator';

/**
 * The existing calculator, mounted the same way `/calculator` does it
 * (`app/calculator/layout.tsx` wraps it in `GPRCalculatorProvider`). The
 * results step navigates to `/calculator/qualification`, which has its own
 * provider instance, so the calculation is not carried across; the
 * eligibility check itself works there without it.
 */
export function CalculatorEmbed() {
  return (
    <GPRCalculatorProvider>
      <GPRCalculator />
    </GPRCalculatorProvider>
  );
}
