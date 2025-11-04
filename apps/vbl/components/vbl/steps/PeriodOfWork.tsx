'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';
import { Calendar } from 'lucide-react';

export const PeriodOfWork: React.FC = () => {
  const { formData, updateJob } = useVBLCalculator();

  const handleDateChange = (index: number, field: 'startDate' | 'endDate', value: string) => {
    updateJob(index, { [field]: value });
  };

  const formatDateToMMYYYY = (value: string): string => {
    if (!value) return '';
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${year}`;
  };

  return (
    <StepContainer
      title="Period of Work"
      description="For how long were you employed?"
    >
      <div className="space-y-8 max-w-3xl mx-auto">
        {formData.jobs.map((job, index) => (
          <div key={index} className="space-y-3">
            <label
              className="text-sm font-semibold block"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              Employment {String(index + 1).padStart(2, '0')}
            </label>
            <div className="grid grid-cols-2 gap-6">
              {/* Start Date */}
              <div className="relative">
                <input
                  type="month"
                  value={job.startDate}
                  onChange={(e) => handleDateChange(index, 'startDate', e.target.value)}
                  className="
                    w-full px-4 py-3 pr-12
                    border-2 border-gray-300 rounded-lg
                    focus:outline-none focus:border-[#50C9A5] focus:ring-2 focus:ring-[#50C9A5]/20
                    transition-all duration-200
                  "
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                  placeholder="MM / YYYY"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>

              {/* End Date */}
              <div className="relative">
                <input
                  type="month"
                  value={job.endDate}
                  onChange={(e) => handleDateChange(index, 'endDate', e.target.value)}
                  className="
                    w-full px-4 py-3 pr-12
                    border-2 border-gray-300 rounded-lg
                    focus:outline-none focus:border-[#50C9A5] focus:ring-2 focus:ring-[#50C9A5]/20
                    transition-all duration-200
                  "
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                  placeholder="MM / YYYY"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </StepContainer>
  );
};
