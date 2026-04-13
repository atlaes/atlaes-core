'use client';

import React from 'react';
import { ChevronDown, Info, Check } from 'lucide-react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator, JobData } from '../../../hooks/useVBLCalculator';
import { PrivateOptionalDetails } from './PrivateOptionalDetails';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Client feedback #2: calculator only supports 2004+ (no historical rates before that).
const EARLIEST_YEAR = 2004;
const YEARS = Array.from(
  { length: new Date().getFullYear() - EARLIEST_YEAR + 1 },
  (_, i) => (EARLIEST_YEAR + i).toString()
).reverse();

const EMPLOYMENT_TYPES = [
  'Public Sector',
  'Stage/Performing Arts',
  'Orchestra',
  'Private sector',
] as const;

const GERMAN_FEDERAL_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin (West)',
  'Berlin (East)',
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

const PUBLIC_PENSION_BY_STATE: Record<string, string[]> = {
  'Baden-Württemberg': ['VBL', 'ZVK Baden-Württemberg'],
  'Bavaria': ['VBL', 'Bayerische ZVK'],
  'Berlin (West)': ['VBL'],
  'Berlin (East)': ['VBL'],
  'Brandenburg': ['VBL', 'ZVK Brandenburg'],
  'Bremen': ['VBL'],
  'Hamburg': ['VBL'],
  'Hesse': ['VBL', 'ZVK Darmstadt', 'ZVK Frankfurt am Main', 'KVK Kassel / Kurhessen-Waldeck', 'ZVK Wiesbaden'],
  'Lower Saxony': ['VBL', 'ZVK Hannover'],
  'Mecklenburg-Vorpommern': ['VBL', 'Kommunale Zusatzversorgungskasse Mecklenburg-Vorpommern'],
  'North Rhine-Westphalia': ['VBL', 'ZVK Köln', 'Rheinische Zusatzversorgung', 'KVW Westfalen-Lippe'],
  'Rhineland-Palatinate': ['VBL', 'Rheinische Zusatzversorgungskasse (Rheinprovinz)', 'Bayerische ZVK (Pfalz)', 'ZVK Darmstadt (Rheinhessen)', 'ZVK Wiesbaden (Montabaur)'],
  'Saarland': ['VBL', 'RZVK Saarland'],
  'Saxony': ['VBL', 'ZVK Sachsen'],
  'Saxony-Anhalt': ['VBL', 'ZVK Sachsen-Anhalt'],
  'Schleswig-Holstein': ['VBL'],
  'Thuringia': ['VBL', 'ZVK Thüringen'],
};

const PRIVATE_PENSION_OPTIONS = ['Allianz', 'Axa', 'BVV', 'Swiss Life', 'Others'];
const VBL_PLAN_OPTIONS = ['VBLklassik', 'VBLextra'];

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

// Numeric-only input (client feedback #1). Strips non-digits on change so
// users can still paste "3.500,00" or "3,500" and get the clean integer back.
const NumberInput: React.FC<TextInputProps> = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
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

interface InfoBannerProps {
  children: React.ReactNode;
}

const InfoBanner: React.FC<InfoBannerProps> = ({ children }) => (
  <div
    className="flex items-start gap-3 p-4 rounded-lg"
    style={{ backgroundColor: 'rgba(159, 232, 112, 0.1)' }}
  >
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ backgroundColor: 'var(--vbl-accent-lime)' }}
    >
      <span className="text-sm font-semibold" style={{ color: '#163300' }}>i</span>
    </div>
    <p className="text-sm text-gray-700">
      {children}
    </p>
  </div>
);

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
  const { formData, updateJob, currentJobIndex, currentJobSubStep } = useVBLCalculator();
  const job = formData.jobs[currentJobIndex] || {} as JobData;
  const totalJobs = formData.numberOfJobs;

  // Figma: for private-sector jobs that answered "no"/"not_sure" on the
  // DRV-refunded question, Job Details splits into a second sub-step showing
  // only the 4 optional financial-detail fields.
  if (currentJobSubStep === 'optional') {
    return <PrivateOptionalDetails />;
  }

  const isPrivateSector = job.employmentType === 'Private sector';
  const isPublicSector = job.employmentType === 'Public Sector';
  const isStage = job.employmentType === 'Stage/Performing Arts';
  const isOrchestra = job.employmentType === 'Orchestra';
  const isStageOrOrchestra = isStage || isOrchestra;

  // Date validation: end date must not be before start date
  const hasAllDates = job.startMonth && job.startYear && job.endMonth && job.endYear;
  const isDateInvalid = hasAllDates && (() => {
    const startIdx = MONTHS.indexOf(job.startMonth);
    const endIdx = MONTHS.indexOf(job.endMonth);
    const startVal = parseInt(job.startYear) * 12 + startIdx;
    const endVal = parseInt(job.endYear) * 12 + endIdx;
    return endVal < startVal;
  })();

  const publicPensionOptions = isPublicSector && job.germanFederalState
    ? PUBLIC_PENSION_BY_STATE[job.germanFederalState] || []
    : [];

  const showVBLPlanToggle = isPublicSector && job.companyPension === 'VBL';
  const showOthersInput = isPrivateSector && job.companyPension === 'Others';

  const handleFieldChange = (field: keyof JobData, value: string | string[]) => {
    const updates: Partial<JobData> = { [field]: value };

    if (field === 'employmentType') {
      updates.germanFederalState = '';
      updates.companyPension = '';
      updates.customPensionName = '';
      updates.supplementaryPensions = [];

      if (value === 'Stage/Performing Arts') {
        updates.companyPension = 'VddB';
        updates.supplementaryPensions = ['VddB'];
      } else if (value === 'Orchestra') {
        updates.companyPension = 'VddKO';
        updates.supplementaryPensions = ['VddKO'];
      }
    }

    if (field === 'germanFederalState') {
      // Only reset the pension selection for public sector (where the
      // available providers depend on the state). Stage/Orchestra have a
      // fixed provider (VddB/VddKO) that must not be cleared.
      if (job.employmentType === 'Public Sector') {
        updates.companyPension = '';
        updates.supplementaryPensions = [];
      }
    }

    if (field === 'companyPension') {
      updates.customPensionName = '';
      if (value === 'VBL') {
        updates.supplementaryPensions = [];
      } else if (value && value !== 'Others') {
        updates.supplementaryPensions = [value as string];
      } else {
        updates.supplementaryPensions = [];
      }
    }

    updateJob(currentJobIndex, updates);
  };

  const handleVBLPlanChange = (plan: string) => {
    updateJob(currentJobIndex, { supplementaryPensions: [plan] });
  };

  return (
    <StepContainer
      title={`Job ${currentJobIndex + 1} of ${totalJobs}`}
      description="Enter the employment period and details for this job."
    >
      <div className="space-y-6">
        {/* Start of employment */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Start of employment</p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Start month"
              value={job.startMonth || ''}
              onChange={(value) => handleFieldChange('startMonth', value)}
              options={MONTHS}
              placeholder="Select start month"
            />
            <Select
              label="Start year"
              value={job.startYear || ''}
              onChange={(value) => handleFieldChange('startYear', value)}
              options={YEARS}
              placeholder="Select start year"
            />
          </div>
        </div>

        {/* End of employment */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">End of employment</p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="End month"
              value={job.endMonth || ''}
              onChange={(value) => handleFieldChange('endMonth', value)}
              options={MONTHS}
              placeholder="Select end month"
            />
            <Select
              label="End year"
              value={job.endYear || ''}
              onChange={(value) => handleFieldChange('endYear', value)}
              options={YEARS}
              placeholder="Select end year"
            />
          </div>
        </div>

        {/* Date validation error */}
        {isDateInvalid && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">
              End date cannot be earlier than start date.
            </p>
          </div>
        )}

        {/* Average Monthly Gross Salary — numeric-only input (client #1) */}
        <NumberInput
          label="Average monthly gross salary (&euro;)"
          value={job.averageMonthlyGrossSalary || ''}
          onChange={(value) => handleFieldChange('averageMonthlyGrossSalary', value)}
          placeholder="E.g., 3500"
        />

        {/* Type of employer */}
        <Select
          label="Company pension sector"
          value={job.employmentType || ''}
          onChange={(value) => handleFieldChange('employmentType', value)}
          options={EMPLOYMENT_TYPES}
          placeholder="Select sector"
        />

        {/* German Federal State.
            Client #5: Stage/Orchestra also needs the federal state question to
            apply the correct east/west BBG cap (different pre-2025). */}
        {(isPublicSector || isStageOrOrchestra) && (
          <Select
            label="German federal state (where your employer was based)"
            value={job.germanFederalState || ''}
            onChange={(value) => handleFieldChange('germanFederalState', value)}
            options={GERMAN_FEDERAL_STATES}
            placeholder="Select Federal State"
          />
        )}

        {/* Company pension — Public Sector (state-dependent dropdown) */}
        {isPublicSector && job.germanFederalState && (
          <Select
            label="Company pension"
            value={job.companyPension || ''}
            onChange={(value) => handleFieldChange('companyPension', value)}
            options={publicPensionOptions}
            placeholder="Select company pension"
          />
        )}

        {/* VBL plan toggle (VBLklassik / VBLextra) */}
        {showVBLPlanToggle && (
          <SingleSelectChips
            label="Which VBL plan do you have?"
            options={VBL_PLAN_OPTIONS}
            selectedValue={job.supplementaryPensions[0] || ''}
            onChange={handleVBLPlanChange}
          />
        )}

        {/* Company pension — Private sector dropdown */}
        {isPrivateSector && (
          <>
            <Select
              label="Company pension"
              value={job.companyPension || ''}
              onChange={(value) => handleFieldChange('companyPension', value)}
              options={PRIVATE_PENSION_OPTIONS}
              placeholder="Select company pension"
            />
            <InfoBanner>
              Private-sector company pensions require individual review. A lump-sum settlement (Abfindung) may be possible depending on the scheme.
            </InfoBanner>
          </>
        )}

        {/* Custom pension name input (Private sector + Others) */}
        {showOthersInput && (
          <TextInput
            label="Name of company pension plan"
            value={job.customPensionName || ''}
            onChange={(value) => handleFieldChange('customPensionName', value)}
            placeholder="Enter the name of your company pension plan"
          />
        )}

        {/* Figma: private-sector DRV statutory-refund question. "no" or
            "not_sure" routes the user into the optional financial-details
            sub-step after they hit Next. */}
        {isPrivateSector && job.companyPension && (
          <SingleSelectChips
            label="Have your German statutory pension contributions already been refunded?"
            options={['Yes', 'No', 'Not sure']}
            selectedValue={(() => {
              if (job.statutoryPensionRefunded === 'yes') return 'Yes';
              if (job.statutoryPensionRefunded === 'no') return 'No';
              if (job.statutoryPensionRefunded === 'not_sure') return 'Not sure';
              return '';
            })()}
            onChange={(label) =>
              handleFieldChange(
                'statutoryPensionRefunded',
                label === 'Yes' ? 'yes' : label === 'No' ? 'no' : 'not_sure'
              )
            }
          />
        )}

        {/* Stage/Performing Arts — read-only display */}
        {isStage && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Company pension</label>
              <div
                className="w-full px-4 py-3 rounded-lg text-gray-700 font-medium"
                style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)', fontFamily: 'var(--vbl-font-montserrat)' }}
              >
                VddB
              </div>
            </div>
            <InfoBanner>
              This scheme applies to stage and performing arts employment.
            </InfoBanner>
          </>
        )}

        {/* Orchestra — read-only display */}
        {isOrchestra && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Company pension</label>
              <div
                className="w-full px-4 py-3 rounded-lg text-gray-700 font-medium"
                style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)', fontFamily: 'var(--vbl-font-montserrat)' }}
              >
                VddKO
              </div>
            </div>
            <InfoBanner>
              This scheme applies to orchestra employment.
            </InfoBanner>
          </>
        )}

      </div>
    </StepContainer>
  );
};
