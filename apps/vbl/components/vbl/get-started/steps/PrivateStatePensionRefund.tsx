'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PrivateStatePensionRefundReceivedType } from '@/components/vbl/get-started/flows';

// Figma 1156-3069 (tester feedback 2026-08-04): plain Yes/No buttons with a
// one-line subtitle — no long radio cards, no info note, layout-level Back.
export const PrivateStatePensionRefund: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] =
    useState<PrivateStatePensionRefundReceivedType>(
      data.privateStatePensionRefundReceived || ''
    );

  const canContinue = Boolean(selected);

  const handleContinue = () => {
    if (!canContinue) return;
    goNext({ privateStatePensionRefundReceived: selected });
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          Have you already received your German state pension refund?
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
          This means a refund of your DRV / Deutsche Rentenversicherung
          contributions.
        </p>
      </div>

      <div className="mb-6 flex justify-center gap-4">
        {(['yes', 'no'] as const).map((value) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              aria-pressed={isSelected}
              onClick={() => setSelected(value)}
              className={`h-10 w-[168px] rounded-[7px] border text-[14px] font-medium transition-all ${
                isSelected
                  ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                  : 'border-[#D6DCE3] bg-[#EFF2F0] text-[#163300] hover:border-[#163300]'
              }`}
            >
              {value === 'yes' ? 'Yes' : 'No'}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="mx-auto mt-16 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default PrivateStatePensionRefund;
