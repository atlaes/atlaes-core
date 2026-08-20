'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PrivatePensionProviderType } from '@/components/vbl/get-started/flows';

const PROVIDERS: { id: PrivatePensionProviderType; label: string }[] = [
  { id: 'Allianz', label: 'Allianz' },
  { id: 'Axa', label: 'AXA' },
  { id: 'Swiss_Life', label: 'Swiss Life' },
  { id: 'ERGO', label: 'ERGO' },
  { id: 'R_V', label: 'R+V' },
  { id: 'Nuernberger', label: 'Nürnberger' },
  { id: 'HDI', label: 'HDI' },
  { id: 'BVV', label: 'BVV' },
  { id: 'Other', label: 'Other provider' },
];

export const PrivatePensionProvider: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<PrivatePensionProviderType>(
    data.privatePensionProvider || ''
  );
  const [otherName, setOtherName] = useState(
    data.privatePensionProviderOther || ''
  );

  const canContinue =
    selected !== '' && (selected !== 'Other' || otherName.trim() !== '');

  const handleContinue = () => {
    if (!canContinue) return;
    goNext({
      privatePensionProvider: selected,
      privatePensionProviderOther: selected === 'Other' ? otherName.trim() : '',
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Figma 1451-2591 / 1156-3132 (tester feedback 2026-08-04) */}
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Which company pension did you contribute to?
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Select the pension scheme you paid into during your employment.
      </p>

      <p className="text-sm font-medium text-gray-700 mb-2">Pension provider</p>

      <div className="relative mb-4">
        <select
          aria-label="Pension provider"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value as PrivatePensionProviderType);
            if (e.target.value !== 'Other') setOtherName('');
          }}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700"
        >
          <option value="">Select provider</option>
          {PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {selected === 'Other' && (
        <input
          type="text"
          value={otherName}
          onChange={(e) => setOtherName(e.target.value)}
          placeholder="Enter pension provider name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700 mb-4"
        />
      )}

      <div className="mb-2" />

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PrivatePensionProvider;
