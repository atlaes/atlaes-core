'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator, JobData } from '../../../hooks/useVBLCalculator';

// Which of the three radio options the user has picked on this sub-step.
// Synthesised from the data model: if projectedMonthlyPension is set, the
// user picked 'projected'; if capitalAmount is set, 'capital'; otherwise
// 'none' (including the literal "I can't find either" choice and the
// initial unselected state).
type StatementChoice = 'projected' | 'capital' | 'none';

interface RadioOption {
  value: StatementChoice;
  label: string;
}

const OPTIONS: RadioOption[] = [
  { value: 'projected', label: 'Projected monthly pension at retirement' },
  { value: 'capital', label: 'Capital amount / Capital benefit' },
  { value: 'none', label: "I can't find either" },
];

// Derive which radio is currently selected by looking at the stored fields.
// Treating either stored value as selection is safe because updateJob clears
// the other when switching radios (see handleChoiceChange below).
function deriveChoice(job: JobData): StatementChoice | null {
  if (job.projectedMonthlyPension) return 'projected';
  if (job.capitalAmount) return 'capital';
  return null; // null = unselected (not the same as 'none')
}

interface OptionalNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

// Numeric-only input — paste tolerates commas/dots, stripping to digits.
const OptionalNumberInput: React.FC<OptionalNumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
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

// Private-sector optional sub-step. Figma screen 20: radio-select which
// statement value the user has, revealing a single input below. The
// "I can't find either" option reveals nothing and just lets the user
// proceed. State is still persisted via the existing JobData fields
// (projectedMonthlyPension, capitalAmount) — those are the only two
// the client asks about. contractValue and estimatedMonthlyContribution
// remain on the JobData type for backend compatibility but are not set
// by this screen.
export const PrivateOptionalDetails: React.FC = () => {
  const { formData, updateJob, currentJobIndex } = useVBLCalculator();
  const job = formData.jobs[currentJobIndex] || ({} as JobData);
  const [selection, setSelection] = React.useState<StatementChoice | null>(
    deriveChoice(job)
  );

  // When the user switches radios we clear the sibling field so that
  // deriveChoice remains deterministic across navigation (Next → Back).
  const handleChoiceChange = (choice: StatementChoice) => {
    setSelection(choice);
    if (choice === 'projected') {
      updateJob(currentJobIndex, { capitalAmount: '' });
    } else if (choice === 'capital') {
      updateJob(currentJobIndex, { projectedMonthlyPension: '' });
    } else {
      updateJob(currentJobIndex, {
        projectedMonthlyPension: '',
        capitalAmount: '',
      });
    }
  };

  return (
    <StepContainer title="What does your pension statement show?">
      <div className="space-y-6">
        <div
          role="radiogroup"
          aria-label="What does your pension statement show?"
          className="space-y-3"
        >
          {OPTIONS.map((option) => {
            const isSelected = selection === option.value;
            return (
              <label
                key={option.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-[#9FE870] bg-[#9FE870]/10'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="statementChoice"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => handleChoiceChange(option.value)}
                  className="w-4 h-4 accent-[#9FE870]"
                />
                <span
                  className="text-sm text-gray-800"
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>

        {selection === 'projected' && (
          <OptionalNumberInput
            label="Enter Projected monthly pension at retirement"
            value={job.projectedMonthlyPension || ''}
            onChange={(v) =>
              updateJob(currentJobIndex, { projectedMonthlyPension: v })
            }
            placeholder="E.g., 45"
          />
        )}

        {selection === 'capital' && (
          <OptionalNumberInput
            label="Enter Capital amount / Capital benefit"
            value={job.capitalAmount || ''}
            onChange={(v) => updateJob(currentJobIndex, { capitalAmount: v })}
            placeholder="E.g., 6500"
          />
        )}
      </div>
    </StepContainer>
  );
};

export default PrivateOptionalDetails;
