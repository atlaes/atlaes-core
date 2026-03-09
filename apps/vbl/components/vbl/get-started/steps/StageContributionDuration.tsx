'use client';

import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { StageContributionDurationType } from '@/components/vbl/get-started/flows';

const DURATION_OPTIONS: {
  id: StageContributionDurationType;
  label: string;
}[] = [
  { id: 'less_than_12', label: 'Less than 12 months' },
  { id: '12_to_35', label: '12 to 35 months' },
  { id: '36_plus', label: '36 months or more' },
];

export const StageContributionDuration: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<StageContributionDurationType>(
    data.stageContributionDuration || ''
  );

  const handleContinue = () => {
    if (!selected) return;
    goNext({ stageContributionDuration: selected });
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
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium text-left transition-all flex items-center gap-3 ${
                isSelected
                  ? 'bg-[#9FE870] text-[#163300]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'bg-[#163300]'
                    : 'border-2 border-gray-300'
                }`}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
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

export default StageContributionDuration;
