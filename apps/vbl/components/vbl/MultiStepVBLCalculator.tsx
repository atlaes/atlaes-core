'use client';

import React from 'react';
import { VBLCalculatorProvider, useVBLCalculator } from '../../hooks/useVBLCalculator';
import { Sidebar } from './Sidebar';
import { JobsCount } from './steps/JobsCount';
import { JobDetails } from './steps/JobDetails';
import { Results } from './steps/Results';

const StepRouter: React.FC = () => {
  const { currentStep } = useVBLCalculator();

  if (currentStep === 0) return <JobsCount />;
  if (currentStep === 1) return <JobDetails />;
  if (currentStep === 2) return <Results />;

  return <JobsCount />;
};

const MultiStepVBLCalculatorContent: React.FC = () => {
  return (
    <div
      className="min-h-screen flex items-stretch p-3 md:p-4"
      style={{ background: 'var(--vbl-bg-light)' }}
    >
      <div
        className="flex gap-4 items-stretch flex-1"
        style={{ width: '100%' }}
      >
        <Sidebar />
        <StepRouter />
      </div>
    </div>
  );
};

export const MultiStepVBLCalculator: React.FC = () => {
  return (
    <VBLCalculatorProvider>
      <MultiStepVBLCalculatorContent />
    </VBLCalculatorProvider>
  );
};

export default MultiStepVBLCalculator;
