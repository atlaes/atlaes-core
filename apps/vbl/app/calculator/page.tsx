'use client';

import React from 'react';
import MultiStepVBLCalculator from '../../components/vbl/MultiStepVBLCalculator';
import ErrorBoundary from '../../components/ErrorBoundary';

export const dynamic = 'force-dynamic';

export default function CalculatorPage() {
  return (
    <ErrorBoundary>
      <MultiStepVBLCalculator />
    </ErrorBoundary>
  );
}
