'use client';

import React from 'react';
import { ArrowRight, ChevronDown, HelpCircle } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface MembershipProps {
  onNext: () => void;
}

const PENSION_PROVIDERS = [
  { value: 'VBL', label: 'VBL' },
  { value: 'ZVK', label: 'ZVK' },
  { value: 'KVBW', label: 'KVBW' },
  { value: 'VddB', label: 'VddB' },
  { value: 'VddKO', label: 'VddKO' },
] as const;

export const Membership: React.FC<MembershipProps> = ({ onNext }) => {
  const { data, updateMembership } = useOnboarding();

  const canProceed = data.membership.pensionProvider !== '';

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Pension membership details
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Enter your supplementary pension scheme membership information.
      </p>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Pension Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplementary pension provider
          </label>
          <div className="relative">
            <select
              value={data.membership.pensionProvider}
              onChange={(e) =>
                updateMembership({
                  pensionProvider: e.target.value as typeof data.membership.pensionProvider,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Select Supplementary Pension Provider</option>
              {PENSION_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Membership Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Membership number
          </label>
          <input
            type="text"
            value={data.membership.membershipNumber}
            onChange={(e) => updateMembership({ membershipNumber: e.target.value })}
            placeholder="Enter your membership number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          <div className="flex items-center gap-2 mt-2 text-gray-500">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">You can find this on correspondence letters.</span>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full mt-8 py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
          canProceed
            ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Membership;
