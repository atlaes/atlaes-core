'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';
import { ChevronDown } from 'lucide-react';

const EMPLOYMENT_TYPES = [
  'Private Sector',
  'Public Sector',
  'Self-Employed',
  'Freelancer',
  'Government',
];

export const EmploymentType: React.FC = () => {
  const { formData, updateJob } = useVBLCalculator();

  const handleTypeChange = (index: number, employmentType: string) => {
    updateJob(index, { employmentType });
  };

  return (
    <StepContainer
      title="Employment Type"
      description="What sector did you work in?"
    >
      <div className="space-y-6 max-w-md mx-auto">
        {formData.jobs.map((job, index) => (
          <div key={index} className="flex items-center space-x-4">
            <label
              className="text-sm font-semibold whitespace-nowrap"
              style={{ fontFamily: 'var(--vbl-font-montserrat)', minWidth: '120px' }}
            >
              Employment {String(index + 1).padStart(2, '0')}
            </label>
            <div className="relative flex-1">
              <select
                value={job.employmentType}
                onChange={(e) => handleTypeChange(index, e.target.value)}
                className={`
                  w-full px-4 py-3 pr-10
                  border-2 rounded-lg
                  appearance-none cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-[#50C9A5]/20
                  transition-all duration-200
                  ${
                    job.employmentType
                      ? 'border-[#50C9A5] bg-[#50C9A5]/10'
                      : 'border-gray-300 bg-white'
                  }
                `}
                style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
              >
                <option value="">Employment Type</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </StepContainer>
  );
};
