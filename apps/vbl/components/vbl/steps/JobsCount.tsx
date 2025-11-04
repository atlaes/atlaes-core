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
      title="Jobs in Germany"
      description="How many jobs have you had in Germany that were subject to pension contributions?"
      showBackButton={false}
    >
      <div className="flex justify-center">
        <div className="relative">
          <select
            value={formData.numberOfJobs}
            onChange={handleJobsChange}
            className="
              w-64 px-6 py-3 pr-12
              border-2 border-gray-300 rounded-lg
              appearance-none cursor-pointer
              focus:outline-none focus:border-[#50C9A5] focus:ring-2 focus:ring-[#50C9A5]/20
              transition-all duration-200
              text-lg
            "
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            <option value={0}>0</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </StepContainer>
  );
};
