'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator, JobData } from '../../../hooks/useVBLCalculator';

interface OptionalNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

// Optional numeric input — paste tolerates commas/dots, stripping to digits.
const OptionalNumberInput: React.FC<OptionalNumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">
      {label} <span className="text-gray-400 font-normal">(optional)</span>
    </label>
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all duration-200 text-gray-700"
      style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
    />
  </div>
);

// Second sub-step of Job Details for private-sector jobs where the user
// answered "no" or "not_sure" on the DRV-refunded question. All 4 fields
// are optional — the user may hit Next without filling anything.
export const PrivateOptionalDetails: React.FC = () => {
  const { formData, updateJob, currentJobIndex } = useVBLCalculator();
  const job = formData.jobs[currentJobIndex] || ({} as JobData);
  const totalJobs = formData.numberOfJobs;

  const handleField = (field: keyof JobData, value: string) => {
    updateJob(currentJobIndex, { [field]: value });
  };

  return (
    <StepContainer
      title={`Job ${currentJobIndex + 1} of ${totalJobs}`}
      description="Enter the employment period and details for this job."
    >
      <div className="space-y-6">
        <OptionalNumberInput
          label="Projected monthly pension at retirement"
          value={job.projectedMonthlyPension || ''}
          onChange={(v) => handleField('projectedMonthlyPension', v)}
          placeholder="E.g., 45"
        />
        <OptionalNumberInput
          label="Capital amount / capital benefit"
          value={job.capitalAmount || ''}
          onChange={(v) => handleField('capitalAmount', v)}
          placeholder="E.g., 6500"
        />
        <OptionalNumberInput
          label="Current contract value / transfer value"
          value={job.contractValue || ''}
          onChange={(v) => handleField('contractValue', v)}
          placeholder="E.g., 7200"
        />
        <OptionalNumberInput
          label="Estimated monthly contribution"
          value={job.estimatedMonthlyContribution || ''}
          onChange={(v) => handleField('estimatedMonthlyContribution', v)}
          placeholder="E.g., 150"
        />
      </div>
    </StepContainer>
  );
};

export default PrivateOptionalDetails;
