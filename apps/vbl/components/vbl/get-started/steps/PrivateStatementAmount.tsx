'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PrivateStatementValueType } from '@/components/vbl/get-started/flows';

const VALUE_TYPE_OPTIONS: {
  id: Exclude<PrivateStatementValueType, ''>;
  title: string;
  description: string;
}[] = [
  {
    id: 'monthly_pension',
    title: 'Projected monthly pension',
    description: 'Monthly pension expected at retirement.',
  },
  {
    id: 'capital_amount',
    title: 'Capital amount / one-time value',
    description: 'A lump-sum, capital value or one-time payout amount.',
  },
  {
    id: 'not_found',
    title: "I can't find an amount",
    description: '',
  },
];

function isAmountRequired(valueType: PrivateStatementValueType): boolean {
  return valueType !== 'not_found';
}

interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <label className="block text-left">
    <span className="mb-2 block text-[14px] font-semibold text-[#4A4F58]">
      {label}
    </span>
    <input
      aria-label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
      placeholder={placeholder}
      className="h-12 w-full rounded-[8px] border border-[#D3DAE8] bg-white px-4 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
    />
  </label>
);

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
          Choose the value type you can find on your pension document.
        </p>
      </div>

      <div className="space-y-4">
        {VALUE_TYPE_OPTIONS.map((option) => {
          const isSelected = statementValueType === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setStatementValueType(option.id)}
              className={`flex min-h-[76px] w-full items-center gap-6 rounded-[8px] border px-7 py-5 text-left transition ${
                isSelected
                  ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                  : 'border-[#AEB4BF] bg-white text-[#111827] hover:border-[#163300]'
              }`}
            >
              <span>
                <span className="block text-[17px] font-bold">
                  {option.title}
                </span>
                {option.description && (
                  <span className="mt-1 block text-[16px] leading-6 text-[#4B5563]">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {statementValueType === 'monthly_pension' && (
        <div className="mt-5">
          <NumberInput
            label="Projected monthly pension at retirement"
            value={statementAmount}
            onChange={setStatementAmount}
            placeholder="E.g., 45"
          />
        </div>
      )}

      {statementValueType === 'capital_amount' && (
        <div className="mt-5 space-y-3">
          <NumberInput
            label="Capital amount / one-time value"
            value={statementAmount}
            onChange={setStatementAmount}
            placeholder="E.g., 8,500"
          />
          <div className="flex items-start gap-3 rounded-[8px] bg-[#EEF6EA] px-5 py-3 text-left text-[#4A4F58]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5A9A23]">
              <Info className="h-3.5 w-3.5 text-white" />
            </span>
            <p className="text-[14px] leading-5">
              Enter the amount shown on your statement. A rough number is enough
              for this check.
            </p>
          </div>
        </div>
      )}

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
