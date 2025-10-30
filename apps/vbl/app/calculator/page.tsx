'use client';

import React from 'react';
import SimpleVBLCalculator from '../../components/vbl/SimpleVBLCalculator';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              VBL Refund Calculator
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Calculate your eligibility for VBL supplementary pension refund.
              This tool helps you determine if you qualify for a refund based on
              your employment history and current circumstances.
            </p>
          </div>

          <ErrorBoundary>
            <SimpleVBLCalculator />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
