'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';
import { ChevronDown } from 'lucide-react';

const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'Mecklenburg-Western Pomerania',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia',
];

export const JobLocation: React.FC = () => {
  const { formData, updateJob } = useVBLCalculator();

  const handleLocationChange = (index: number, location: string) => {
    updateJob(index, { location });
  };

  return (
    <StepContainer
      title="Job Location"
      description="In which German states were your employers located?"
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
                value={job.location}
                onChange={(e) => handleLocationChange(index, e.target.value)}
                className="
                  w-full px-4 py-3 pr-10
                  border-2 border-gray-300 rounded-lg
                  appearance-none cursor-pointer
                  focus:outline-none focus:border-[#50C9A5] focus:ring-2 focus:ring-[#50C9A5]/20
                  transition-all duration-200
                "
                style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
              >
                <option value="">Select state</option>
                {GERMAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
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
