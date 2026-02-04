'use client';

import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator, JobData } from '../../../hooks/useVBLCalculator';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = Array.from(
  { length: new Date().getFullYear() - 1960 + 1 },
  (_, i) => (1960 + i).toString()
).reverse();

const EMPLOYMENT_TYPES = [
  'Stage/Performing Arts',
  'Private sector',
  'Public Sector',
  'Orchestra',
] as const;

const PENSION_PROVIDERS = [
  'VddB',
  'VddKO',
  'VBLklassik',
  'ZVK',
] as const;

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}

const Select: React.FC<SelectProps> = ({ label, value, onChange, options, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all duration-200 text-gray-700"
        style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

export const JobDetails: React.FC = () => {
  const { formData, updateJob, currentJobIndex } = useVBLCalculator();
  const job = formData.jobs[currentJobIndex] || {} as JobData;
  const totalJobs = formData.numberOfJobs;

  const isPrivateSector = job.employmentType === 'Private sector';

  const handleFieldChange = (field: keyof JobData, value: string) => {
    const updates: Partial<JobData> = { [field]: value };

    if (field === 'employmentType' && value === 'Private sector') {
      updates.supplementaryPension = '';
    }

    updateJob(currentJobIndex, updates);
  };

  return (
    <StepContainer
      title={`Job ${currentJobIndex + 1} of ${totalJobs}`}
      description="Enter the start/end months, salary, and sector."
    >
      <div className="space-y-6">
        {/* Start of employment */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Start of employment</p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Start Month"
              value={job.startMonth || ''}
              onChange={(value) => handleFieldChange('startMonth', value)}
              options={MONTHS}
              placeholder="Select Start Month"
            />
            <Select
              label="Start Year"
              value={job.startYear || ''}
              onChange={(value) => handleFieldChange('startYear', value)}
              options={YEARS}
              placeholder="Select End Year"
            />
          </div>
        </div>

        {/* End of employment */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">End of employment</p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="End Month"
              value={job.endMonth || ''}
              onChange={(value) => handleFieldChange('endMonth', value)}
              options={MONTHS}
              placeholder="Select End Month"
            />
            <Select
              label="End Year"
              value={job.endYear || ''}
              onChange={(value) => handleFieldChange('endYear', value)}
              options={YEARS}
              placeholder="Select End Year"
            />
          </div>
        </div>

        {/* Employment Type */}
        <Select
          label="Employment Type"
          value={job.employmentType || ''}
          onChange={(value) => handleFieldChange('employmentType', value)}
          options={EMPLOYMENT_TYPES}
          placeholder="Select Employment Type"
        />

        {/* Private sector notice */}
        {isPrivateSector && (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              Private sector jobs without supplementary pension contributions are recorded but excluded from the calculation.
            </p>
          </div>
        )}

        {/* Supplementary pension provider (hidden for private sector) */}
        {!isPrivateSector && (
          <Select
            label="Supplementary pension provider"
            value={job.supplementaryPension || ''}
            onChange={(value) => handleFieldChange('supplementaryPension', value)}
            options={PENSION_PROVIDERS}
            placeholder="Select Supplementary Pension Provider"
          />
        )}
      </div>
    </StepContainer>
  );
};
