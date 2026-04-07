'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';

type ContinuationAnswer = 'yes' | 'no' | '';

export const EUContinuation: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<ContinuationAnswer>(
    data.euContinuation || ''
  );

  const handleContinue = () => {
    if (!selected) return;
    goNext({ euContinuation: selected });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Public-sector employment
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        This helps us determine your eligibility for a refund.
      </p>

      <p className="text-sm font-medium text-gray-700 text-center mb-4">
        Are you currently continuing to work in the public sector in the
        EU, EEA, UK, or Switzerland?
      </p>

      <div className="flex gap-3 justify-center mb-6">
        {(['yes', 'no'] as const).map((value) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              onClick={() => setSelected(value)}
              className={`w-36 py-3 rounded-lg text-sm font-medium border transition-all ${
                isSelected
                  ? 'bg-[#9FE870] text-[#163300] border-[#9FE870]'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {value === 'yes' ? 'Yes' : 'No'}
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

export default EUContinuation;
