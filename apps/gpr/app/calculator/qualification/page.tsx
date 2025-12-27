'use client';

import React from 'react';
import { useGPRCalculator } from '@/hooks/useGPRCalculator';
import EligibilityContainer from '@/components/eligibility/EligibilityContainer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function QualificationPage() {
  // Access calculator data from the shared context (provided by /calculator/layout.tsx)
  const { formData } = useGPRCalculator();

  // Pass calculator data to eligibility check so it can be included in magic link request
  return <EligibilityContainer flowType="calculator" calculatorData={formData} />;
}
