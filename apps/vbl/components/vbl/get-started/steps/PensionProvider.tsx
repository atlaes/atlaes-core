'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PensionProviderType } from '@/components/vbl/get-started/flows';
import { PUBLIC_PENSION_PROVIDERS_BY_STATE } from '@/components/vbl/company-pension-providers';

export const PensionProvider: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<PensionProviderType>(
    data.pensionProvider || ''
  );
  const providers = useMemo(
    () => PUBLIC_PENSION_PROVIDERS_BY_STATE[data.federalState] || [],
    [data.federalState]
  );

  useEffect(() => {
    if (selected && !providers.includes(selected)) {
      setSelected('');
    }
  }, [providers, selected]);

  const handleContinue = () => {
    if (!selected) return;
    goNext({ pensionProvider: selected });
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

      <div className="relative">
        <select
          value={selected}
          onChange={(e) =>
            setSelected(e.target.value as PensionProviderType)
          }
          className="h-12 w-full cursor-pointer appearance-none rounded-[8px] border border-[#D3DAE8] bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
        >
          <option value="">Select company pension</option>
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
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

export default PensionProvider;
