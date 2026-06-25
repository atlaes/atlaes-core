'use client';

import React from 'react';
import ManualVBLCalculator from '../../components/vbl/ManualVBLCalculator';
import ErrorBoundary from '../../components/ErrorBoundary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function CalculatorPage() {
  return (
    <ErrorBoundary>
      <ManualVBLCalculator />
    </ErrorBoundary>
  );
}
