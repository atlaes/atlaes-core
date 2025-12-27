'use client';

import React from 'react';
import { useGPRCalculator } from '@/hooks/useGPRCalculator';
import Sidebar from './Sidebar';
import JobCount from './steps/JobCount';
import JobDetails from './steps/JobDetails';
import Results from './steps/Results';

// Note: GPRCalculatorProvider is now in the layout.tsx for /calculator routes
// This allows the calculator context to persist when navigating to /calculator/qualification

export default function GPRCalculator() {
  const { currentStep } = useGPRCalculator();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <JobCount />;
      case 1:
        return <JobDetails />;
      case 2:
        return <Results />;
      default:
        return <JobCount />;
    }
  };

  return (
    <div className="gpr-calculator">
      <div className="gpr-calculator-container">
        <Sidebar />
        <main className="gpr-calculator-main">
          {renderStep()}
        </main>
      </div>
    </div>
  );
}
