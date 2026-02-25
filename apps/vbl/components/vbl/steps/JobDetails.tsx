'use client';

import React from 'react';
import { ChevronDown, AlertCircle, Info, Check } from 'lucide-react';
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

const GERMAN_FEDERAL_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia',
] as const;

const SALARY_OPTIONS = [
  '1,000 - 2,000',
  '2,000 - 3,000',
  '3,000 - 4,000',
  '4,000 - 5,000',
  '5,000 - 6,000',
  '6,000 - 7,000',
  '7,000 - 8,000',
  '8,000 - 10,000',
  '10,000+',
] as const;

// Pension providers available based on employment type
const PENSION_PROVIDERS_BY_TYPE: Record<string, { providers: string[]; multiSelect: boolean; autoSelect?: string }> = {
  'Stage/Performing Arts': { providers: ['VddB'], multiSelect: false, autoSelect: 'VddB' },
  'Orchestra': { providers: ['VddKO'], multiSelect: false, autoSelect: 'VddKO' },
  'Public Sector': { providers: ['VBLklassik', 'VBLextra', 'ZVK'], multiSelect: true },
  'Private sector': { providers: ['VddKO', 'Others'], multiSelect: false },
};

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

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all duration-200 text-gray-700"
      style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
    />
  </div>
);

interface InfoBannerProps {
  children: React.ReactNode;
  variant?: 'info' | 'warning';
}

const InfoBanner: React.FC<InfoBannerProps> = ({ children, variant = 'info' }) => (
  <div
    className={`flex items-start gap-3 p-4 rounded-lg border ${
      variant === 'warning'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-blue-50 border-blue-200'
    }`}
  >
    <Info
      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
        variant === 'warning' ? 'text-amber-600' : 'text-blue-600'
      }`}
    />
    <p
      className={`text-sm ${
        variant === 'warning' ? 'text-amber-800' : 'text-blue-800'
      }`}
    >
      {children}
    </p>
  </div>
);

interface MultiSelectChipsProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  showCheckboxes?: boolean;
}

const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  showCheckboxes = false,
}) => {
  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                border-2
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
              {showCheckboxes && (
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#163300] border-[#163300]'
                      : 'border-gray-400 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface SingleSelectChipsProps {
  label: string;
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SingleSelectChips: React.FC<SingleSelectChipsProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValue === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => !disabled && onChange(option)}
              disabled={disabled}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all duration-200
                border-2
                ${disabled ? 'cursor-not-allowed opacity-75' : ''}
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
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const JobDetails: React.FC = () => {
  const { formData, updateJob, currentJobIndex } = useVBLCalculator();
  const job = formData.jobs[currentJobIndex] || {} as JobData;
  const totalJobs = formData.numberOfJobs;

  const isPrivateSector = job.employmentType === 'Private sector';
  const isPublicSector = job.employmentType === 'Public Sector';
  const isStageOrOrchestra = job.employmentType === 'Stage/Performing Arts' || job.employmentType === 'Orchestra';

  const pensionConfig = job.employmentType ? PENSION_PROVIDERS_BY_TYPE[job.employmentType] : null;
  const showOthersInput = isPrivateSector && job.supplementaryPensions.includes('Others');

  const handleFieldChange = (field: keyof JobData, value: string | string[]) => {
    const updates: Partial<JobData> = { [field]: value };

    // When employment type changes, reset dependent fields and auto-select if applicable
    if (field === 'employmentType') {
      const newConfig = PENSION_PROVIDERS_BY_TYPE[value as string];
      updates.germanFederalState = '';
      updates.customPensionName = '';

      // Auto-select pension for Stage/Performing Arts and Orchestra
      if (newConfig?.autoSelect) {
        updates.supplementaryPensions = [newConfig.autoSelect];
      } else {
        updates.supplementaryPensions = [];
      }
    }

    // Clear custom pension name if Others is deselected
    if (field === 'supplementaryPensions') {
      const pensions = value as string[];
      if (!pensions.includes('Others')) {
        updates.customPensionName = '';
      }
    }

    updateJob(currentJobIndex, updates);
  };

  const handlePensionChange = (values: string[]) => {
    handleFieldChange('supplementaryPensions', values);
  };

  const handleSinglePensionChange = (value: string) => {
    handleFieldChange('supplementaryPensions', [value]);
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
              placeholder="Select Start Year"
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

        {/* Info banner about dates */}
        <InfoBanner>
          If you&apos;re unsure about exact months, provide your best estimate. We&apos;ll verify the details later.
        </InfoBanner>

        {/* Average Monthly Gross Salary */}
        <Select
          label="Average monthly gross salary (€)"
          value={job.averageMonthlyGrossSalary || ''}
          onChange={(value) => handleFieldChange('averageMonthlyGrossSalary', value)}
          options={SALARY_OPTIONS}
          placeholder="E.g., 3,500"
        />

        {/* Employment Type */}
        <Select
          label="Employment Type"
          value={job.employmentType || ''}
          onChange={(value) => handleFieldChange('employmentType', value)}
          options={EMPLOYMENT_TYPES}
          placeholder="Select Employment Type"
        />

        {/* German Federal State (Public Sector only) */}
        {isPublicSector && (
          <Select
            label="German Federal State"
            value={job.germanFederalState || ''}
            onChange={(value) => handleFieldChange('germanFederalState', value)}
            options={GERMAN_FEDERAL_STATES}
            placeholder="Select Federal State"
          />
        )}

        {/* Private sector warning */}
        {isPrivateSector && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Private sector employers rarely offer supplementary pension schemes. If you&apos;re unsure, you likely don&apos;t have one.
            </p>
          </div>
        )}

        {/* Pension provider selection - varies by employment type */}
        {pensionConfig && (
          <>
            {/* Stage/Orchestra: Auto-selected, shown as disabled chip */}
            {isStageOrOrchestra && (
              <SingleSelectChips
                label="Supplementary pension provider"
                options={pensionConfig.providers}
                selectedValue={job.supplementaryPensions[0] || ''}
                onChange={handleSinglePensionChange}
                disabled={true}
              />
            )}

            {/* Public Sector: Multi-select with checkboxes */}
            {isPublicSector && (
              <MultiSelectChips
                label="Supplementary pension provider(s)"
                options={pensionConfig.providers}
                selectedValues={job.supplementaryPensions}
                onChange={handlePensionChange}
                showCheckboxes={true}
              />
            )}

            {/* Private sector: Single select for VddKO or Others */}
            {isPrivateSector && (
              <SingleSelectChips
                label="Supplementary pension provider (if applicable)"
                options={pensionConfig.providers}
                selectedValue={job.supplementaryPensions[0] || ''}
                onChange={handleSinglePensionChange}
              />
            )}
          </>
        )}

        {/* Custom pension name input (Private sector + Others selected) */}
        {showOthersInput && (
          <TextInput
            label="Pension provider name"
            value={job.customPensionName || ''}
            onChange={(value) => handleFieldChange('customPensionName', value)}
            placeholder="Enter the name of your pension provider"
          />
        )}

        {/* Bottom info banner */}
        <InfoBanner>
          You don&apos;t need documents right now. We&apos;ll help you gather them in the next steps.
        </InfoBanner>
      </div>
    </StepContainer>
  );
};
