'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Info } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';

const GERMAN_FEDERAL_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin (West)',
  'Berlin (East)',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia',
] as const;

export const FederalState: React.FC = () => {
  const { data, goNext, goBack } = useEligibility();
  const [selected, setSelected] = useState(data.federalState || '');
  const [showStateNotice, setShowStateNotice] = useState(false);
  // Stage/Orchestra is eligible in all states — the field only affects
  // which BBG contribution cap applies. Public sector, in contrast, has
  // state-dependent eligibility rules.
  const isStage = data.employmentType === 'stage_performing_arts';
  const isPublic = data.employmentType === 'public_sector';

  const handleContinue = () => {
    if (!selected) return;
    goNext({ federalState: selected });
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          {isPublic
            ? 'Where was your public-sector employer located?'
            : 'Where was your employer located?'}
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[620px] text-[16px] leading-6 text-[#4B5563]">
          {isStage
            ? 'This determines the contribution cap used for your refund calculation.'
            : 'Select the German federal state where your employer was based. CompanyPension currently only checks contributions in West Germany states.'}
        </p>
      </div>

      <p className="mb-2 text-[15px] font-medium text-[#1F2937]">
        {isPublic ? "Employer's federal state" : 'German federal state'}
      </p>

      <div className="relative">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-12 w-full cursor-pointer appearance-none rounded-[8px] border border-[#D3DAE8] bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
        >
          <option value="">Select federal state</option>
          {GERMAN_FEDERAL_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {isPublic && (
        <>
          <button
            type="button"
            onClick={() => setShowStateNotice((value) => !value)}
            className="mt-3 text-[16px] font-bold text-[#163300] underline underline-offset-2"
          >
            My state is not listed &gt;
          </button>

          {showStateNotice && (
            <div className="mt-6 flex gap-4 rounded-[16px] bg-[#EEF6EA] px-6 py-5 text-[#3F464F]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5A9A23]">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[18px] font-bold">
                  This refund cannot currently be estimated with CompanyPension
                </p>
                <p className="mt-2 text-[16px] leading-7">
                  CompanyPension currently checks VBL West contribution refunds.
                  If your contributions were paid only while working in a state
                  that is not listed, this refund cannot currently continue
                  through the online calculator.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {showStateNotice ? (
        <div className="mt-16 flex items-center justify-between gap-4">
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
            disabled={!selected}
            className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] bg-[#9FE870] px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Continue
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="mx-auto mt-16 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default FederalState;
