'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PrivateStatePensionRefundReceivedType } from '@/components/vbl/get-started/flows';

const RefundStatusOption: React.FC<{
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ selected, onSelect, children }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={`flex min-h-[76px] w-full items-center gap-3 rounded-[7px] border px-5 py-4 text-left text-[15px] font-bold transition ${
      selected
        ? 'border-[#5A9A23] bg-[#9FE870] text-[#163300]'
        : 'border-[#D6DCE3] bg-[#EFF2F0] text-[#3F464F] hover:border-[#5A9A23]'
    }`}
  >
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
        selected ? 'bg-[#163300]' : 'border border-[#C6CED6] bg-white'
      }`}
    >
      {selected && <Check className="h-2.5 w-2.5 text-white" />}
    </span>
    {children}
  </button>
);

export const PrivateStatePensionRefund: React.FC = () => {
  const { data, goBack, goNext } = useEligibility();
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
          For some bAV cash-outs, an approved German state pension refund can
          be important — especially if the pension amount is above the usual
          small-benefit range.
        </p>
      </div>

      <div className="mx-auto max-w-[560px] space-y-3">
        <RefundStatusOption
          selected={selected === 'yes'}
          onSelect={() => setSelected('yes')}
        >
          Yes, my German state pension refund has been approved
        </RefundStatusOption>
        <RefundStatusOption
          selected={selected === 'no'}
          onSelect={() => setSelected('no')}
        >
          No, I have not received a German state pension refund
        </RefundStatusOption>
      </div>

      <div className="mx-auto mt-5 flex max-w-[560px] items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
        <p>
          A DRV refund does not include your bAV. It can only matter as part
          of a separate bAV cash-out request.
        </p>
      </div>

      <div className="mt-14 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] border border-[#D3DAE8] bg-white px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:border-[#AEB4BF]"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] bg-[#9FE870] px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default PrivateStatePensionRefund;
