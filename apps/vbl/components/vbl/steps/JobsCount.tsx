'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';
import { ChevronDown } from 'lucide-react';

export const JobsCount: React.FC = () => {
  const { formData, updateFormData } = useVBLCalculator();

  const handleJobsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value, 10);
    updateFormData({ numberOfJobs: count });
  };

  return (
    <StepContainer
      title="How many jobs did you have in Germany?"
      description="Please count every job where you received a salary and paid German pension contributions (DRV)."
      showBackButton={false}
    >
      <div className="flex flex-col items-center">
        <label className="text-sm font-medium text-gray-700 mb-2 self-start">
          Number of jobs
        </label>
        <div className="relative w-full">
          <select
            value={formData.numberOfJobs || ''}
            onChange={handleJobsChange}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all duration-200 text-gray-700"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            <option value="">Select number of jobs</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'job' : 'jobs'}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </StepContainer>
  );
};
