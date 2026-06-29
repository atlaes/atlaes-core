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
    <div className="mx-auto max-w-[600px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          Select your company pension
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-6 text-[#4B5563]">
          Choose the company pension your employer paid into.
        </p>
      </div>

      <p className="mb-2 text-[15px] font-medium text-[#1F2937]">
        Company pension
      </p>

      {/* Read-only provider display */}
      <div className="relative mb-5">
        <div className="flex h-12 w-full items-center rounded-[8px] border border-[#D3DAE8] bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm">
          {data.pensionProvider}
        </div>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      <p className="mb-3 text-[15px] font-medium text-[#1F2937]">
        Which VBL plan do you have?
      </p>

      <div className="mb-6 flex gap-4">
        {VBL_PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`rounded-[7px] border px-5 py-2.5 text-[14px] font-medium transition-all ${
                isSelected
                  ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                  : 'border-[#D6DCE3] bg-[#EFF2F0] text-[#163300] hover:border-[#163300]'
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
        className="mx-auto mt-16 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default PensionScheme;
