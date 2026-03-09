'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
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
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        How many months did you contribute in total?
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-6" />

      <p className="text-sm font-medium text-gray-700 mb-3">
        Contribution duration
      </p>

      <div className="space-y-2 mb-6">
        {DURATION_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium text-left transition-all ${
                isSelected
                  ? 'bg-[#9FE870] text-[#163300]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ContributionDuration;
