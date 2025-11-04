'use client';

import React from 'react';
import { VBLCalculatorProvider, useVBLCalculator } from '../../hooks/useVBLCalculator';
import { Sidebar } from './Sidebar';
import { JobsCount } from './steps/JobsCount';
import { JobLocation } from './steps/JobLocation';
import { EmploymentType } from './steps/EmploymentType';
import { SupplementaryPension } from './steps/SupplementaryPension';
import { PeriodOfWork } from './steps/PeriodOfWork';
import { MonthlyIncome } from './steps/MonthlyIncome';
import { Results } from './steps/Results';

const StepRouter: React.FC = () => {
  const { currentStep, currentSubStep } = useVBLCalculator();

  // General Info steps (step 0)
  if (currentStep === 0) {
    if (currentSubStep === 0) return <JobsCount />;
    if (currentSubStep === 1) return <JobLocation />;
    if (currentSubStep === 2) return <EmploymentType />;
    if (currentSubStep === 3) return <SupplementaryPension />;
  }

  // Income steps (step 1)
  if (currentStep === 1) {
    if (currentSubStep === 0) return <PeriodOfWork />;
    if (currentSubStep === 1) return <MonthlyIncome />;
  }

  // Estimate step (step 2)
  if (currentStep === 2) {
    return <Results />;
  }

  // Default fallback
  return <JobsCount />;
};

const MultiStepVBLCalculatorContent: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <StepRouter />
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
