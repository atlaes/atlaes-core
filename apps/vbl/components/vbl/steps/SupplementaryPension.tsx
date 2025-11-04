'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';

const PENSION_OPTIONS = ['VBLklassik', 'VBLextra', 'VddB'];

export const SupplementaryPension: React.FC = () => {
  const { formData, updateJob } = useVBLCalculator();

  const handlePensionChange = (index: number, pension: string) => {
    updateJob(index, { supplementaryPension: pension });
  };

  return (
    <StepContainer
      title="Supplementary Pension"
      description="Would you like to include a supplementary pension in your refund calculation?"
    >
      <div className="space-y-8 max-w-2xl mx-auto">
        {formData.jobs.map((job, index) => (
          <div key={index} className="space-y-3">
            <label
              className="text-sm font-semibold block"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              Employment {String(index + 1).padStart(2, '0')}
            </label>
            <div className="flex gap-4">
              {PENSION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handlePensionChange(index, option)}
                  className={`
                    flex-1 px-6 py-4 rounded-lg
                    border-2 transition-all duration-200
                    flex items-center justify-center space-x-3
                    ${
                      job.supplementaryPension === option
                        ? 'border-[#50C9A5] bg-[#50C9A5] text-white shadow-md'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }
                  `}
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                >
                  <div
                    className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${
                      job.supplementaryPension === option
                        ? 'border-white bg-white'
                        : 'border-gray-400 bg-white'
                    }
                  `}
                  >
                    {job.supplementaryPension === option && (
                      <div className="w-3 h-3 rounded-full bg-[#50C9A5]"></div>
                    )}
                  </div>
                  <span className="font-semibold">{option}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StepContainer>
  );
};
