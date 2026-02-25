'use client';

import React from 'react';
import EligibilityContainer from '@/components/eligibility/EligibilityContainer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function ThreeStepCheckPage() {
  return <EligibilityContainer flowType="3-step" />;
}
