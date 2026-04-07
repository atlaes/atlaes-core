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
      description="Please count each job you held in Germany that included a company pension."
      showBackButton={false}
    >
      {/* Info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-6" style={{ backgroundColor: 'rgba(159, 232, 112, 0.1)' }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--vbl-accent-lime)' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#163300' }}>i</span>
        </div>
        <p className="text-sm text-gray-700">
          This takes about 2–3 minutes. No documents needed at this stage.
        </p>
      </div>

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
