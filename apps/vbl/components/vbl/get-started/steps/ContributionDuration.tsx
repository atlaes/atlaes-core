'use client';

import React, { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { ContributionDurationType } from '@/components/vbl/get-started/flows';

const DURATION_OPTIONS: { id: ContributionDurationType; label: string }[] = [
  { id: 'less_than_36', label: 'Less than 36 months' },
  { id: '36_to_59', label: '36 to 59 months' },
  { id: '60_plus', label: '60 months or more' },
];

export const ContributionDuration: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<ContributionDurationType>(
    data.contributionDuration || ''
  );

  const handleContinue = () => {
    if (!selected) return;
    goNext({ contributionDuration: selected });
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-4 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          How many months did you pay into VBL in total?
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[600px] text-[16px] leading-6 text-[#4B5563]">
          Now we need to check your total VBL contribution period across all
          jobs.
        </p>
      </div>

      <div className="mb-7 flex items-start gap-4 rounded-[10px] bg-[#EEF6EA] px-6 py-3 text-[#3F464F]">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5A9A23]">
          <Info className="h-4 w-4 text-white" />
        </div>
        <p className="text-[15px] leading-6">
          Please include earlier company pension periods that were transferred
          into VBL, for example from a ZVK.
        </p>
      </div>

      <p className="mb-3 text-[15px] font-bold text-[#4A4F58]">
        Total VBL contribution period
      </p>

      <div className="mb-6 space-y-3">
        {DURATION_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`h-10 w-full rounded-[7px] border px-5 text-left text-[15px] font-medium transition-all ${
                isSelected
                  ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                  : 'border-[#D6DCE3] bg-[#EFF2F0] text-[#163300] hover:border-[#163300]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mx-auto mt-16 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ContributionDuration;
