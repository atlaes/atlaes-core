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
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Select your company pension provider
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Choose the provider your employer paid company pension contributions to.
      </p>

      <p className="text-sm font-medium text-gray-700 mb-2">
        Company pension
      </p>

      <div className="relative mb-6">
        <select
          value={selected}
          onChange={(e) =>
            setSelected(e.target.value as PensionProviderType)
          }
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700"
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
        className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PensionProvider;
