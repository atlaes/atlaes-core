'use client';

import React from 'react';
import EligibilityContainer from '@/components/eligibility/EligibilityContainer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function TwoStepCheckPage() {
  return <EligibilityContainer flowType="2-step" />;
}
