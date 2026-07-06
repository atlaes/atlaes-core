'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Info } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PrivateStatementValueType } from '@/components/vbl/get-started/flows';

const VALUE_TYPE_OPTIONS: {
  id: Exclude<PrivateStatementValueType, ''>;
  label: string;
}[] = [
  { id: 'capital_amount', label: 'Surrender value — Rückkaufswert' },
  { id: 'monthly_pension', label: 'Monthly pension — monatliche Rente' },
  { id: 'not_found', label: 'No statement value shown / unclear' },
];

function isAmountRequired(valueType: PrivateStatementValueType): boolean {
  return valueType !== 'not_found';
}

export const PrivateStatementAmount: React.FC = () => {
  const { data, goBack, goNext } = useEligibility();
  const [statementAmount, setStatementAmount] = useState(
    data.privateStatementAmount || ''
  );
  const [statementValueType, setStatementValueType] =
    useState<PrivateStatementValueType>(data.privateStatementValueType || '');

  const amountRequired = isAmountRequired(statementValueType);
  const canContinue = Boolean(
    statementValueType && (!amountRequired || statementAmount)
  );

  const handleContinue = () => {
    if (!canContinue) return;
    goNext({
      privateStatementAmount: statementAmount,
      privateStatementValueType: statementValueType,
    });
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-8 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          What amount is shown on your bAV statement?
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
          Please share the details needed for the first cash-out check.
        </p>
      </div>

      <div className="space-y-5">
        <label className="block text-left">
          <span className="mb-2 block text-[14px] font-semibold text-[#4A4F58]">
            Pension value
          </span>
          <input
            aria-label="Pension value"
            type="text"
            inputMode="numeric"
            value={statementAmount}
            onChange={(event) =>
              setStatementAmount(event.target.value.replace(/[^\d]/g, ''))
            }
            placeholder="Pension value"
            className="h-12 w-full rounded-[8px] border border-[#D3DAE8] bg-white px-4 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
          />
        </label>

        <label className="block text-left">
          <span className="mb-2 block text-[14px] font-semibold text-[#4A4F58]">
            Value type shown on your document
          </span>
          <span className="relative block">
            <select
              aria-label="Value type shown on your document"
              value={statementValueType}
              onChange={(event) =>
                setStatementValueType(
                  event.target.value as PrivateStatementValueType
                )
              }
              className="h-12 w-full cursor-pointer appearance-none rounded-[8px] border border-[#D3DAE8] bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
            >
              <option value="">Select value type</option>
              {VALUE_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
          </span>
        </label>

        <div className="flex items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
          <p>
            Enter the value shown on your bAV statement. If several values
            are shown, choose the one that looks most relevant. The provider
            confirms the final cash-out amount later.
          </p>
        </div>
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

export default PrivateStatementAmount;
