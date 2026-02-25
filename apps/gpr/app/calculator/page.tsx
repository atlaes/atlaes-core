'use client';

import React from 'react';
import GPRCalculator from '@/components/calculator/GPRCalculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function CalculatorPage() {
  return <GPRCalculator />;
}
