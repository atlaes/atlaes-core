'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';

const JOB_COUNT_OPTIONS = [1, 2, 3, 4, 5];

export const JobsCount: React.FC = () => {
  const { formData, updateFormData } = useVBLCalculator();

  const handleJobsSelect = (count: number) => {
    updateFormData({ numberOfJobs: count });
  };

  return (
    <StepContainer
      title="How many jobs did you have in Germany?"
      description="Please count every job where you received a salary and paid German pension contributions (DRV)."
      showBackButton={false}
    >
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-3">
          Number of jobs
        </label>
        <div className="flex flex-wrap gap-3">
          {JOB_COUNT_OPTIONS.map((num) => {
            const isSelected = formData.numberOfJobs === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleJobsSelect(num)}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-all duration-200
                  border-2 min-w-[80px]
                  ${isSelected
                    ? 'border-transparent text-[#163300]'
                    : 'border-gray-200 text-gray-700 hover:border-[#9FE870]/50 hover:bg-gray-50'
                  }
                `}
                style={{
                  fontFamily: 'var(--vbl-font-montserrat)',
                  ...(isSelected && { backgroundColor: '#9FE870' }),
                }}
              >
                {num} {num === 1 ? 'Job' : 'Jobs'}
              </button>
            );
          })}
        </div>
      </div>
    </StepContainer>
  );
};
