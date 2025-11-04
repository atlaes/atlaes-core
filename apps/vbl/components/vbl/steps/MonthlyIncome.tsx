'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';

export const MonthlyIncome: React.FC = () => {
  const { formData, updateJob } = useVBLCalculator();

  const handleIncomeChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateJob(index, { monthlyIncome: numValue });
  };

  return (
    <StepContainer
      title="Monthly gross income"
      description="What was your monthly gross income?"
      nextButtonText="Calculate Refund"
    >
      <div className="max-w-2xl mx-auto">
        <div
          className="border-2 border-blue-400 rounded-lg p-8 space-y-6"
          style={{ borderColor: '#60A5FA' }}
        >
          {formData.jobs.map((job, index) => (
            <div key={index} className="flex items-center space-x-6">
              <label
                className="text-base font-semibold whitespace-nowrap"
                style={{ fontFamily: 'var(--vbl-font-montserrat)', minWidth: '140px' }}
              >
                Employment {String(index + 1).padStart(2, '0')}
              </label>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={job.monthlyIncome || ''}
                  onChange={(e) => handleIncomeChange(index, e.target.value)}
                  className="
                    w-full px-4 py-3 pr-12
                    border-2 border-[#50C9A5] rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-[#50C9A5]/20
                    transition-all duration-200
                    text-right text-lg
                  "
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                  placeholder="0"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg font-semibold"
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                >
                  €
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StepContainer>
  );
};
