'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { VBLPlan } from '@/components/vbl/get-started/flows';

const VBL_PLANS: { id: VBLPlan; label: string }[] = [
  { id: 'VBLklassik', label: 'VBLklassik' },
  { id: 'VBLextra', label: 'VBLextra' },
];

export const PensionScheme: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<VBLPlan>(data.vblPlan || '');

  const handleContinue = () => {
    if (!selected) return;
    goNext({ vblPlan: selected });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Select your pension scheme
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Choose the scheme(s) you contributed to during your employment.
      </p>

      <p className="text-sm font-medium text-gray-700 mb-2">
        Company pension
      </p>

      {/* Read-only provider display */}
      <div className="relative mb-6">
        <div className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
          {data.pensionProvider}
        </div>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      <p className="text-sm font-medium text-gray-700 mb-3">
        Which VBL plan do you have?
      </p>

      <div className="flex gap-3 mb-6">
        {VBL_PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                isSelected
                  ? 'bg-[#163300] text-white border-[#163300]'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.label}
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

export default PensionScheme;
