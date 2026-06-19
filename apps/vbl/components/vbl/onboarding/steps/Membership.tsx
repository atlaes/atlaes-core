'use client';

import React from 'react';
import { ArrowRight, ChevronDown, Info } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { StageMembershipDetails } from './StageMembershipDetails';

interface MembershipProps {
  onNext: () => void;
}

const PENSION_PROVIDERS = [
  { value: 'VBL', label: 'VBL', shortLabel: 'VBL' },
  { value: 'ZVK', label: 'ZVK', shortLabel: 'ZVK' },
  { value: 'KVBW', label: 'KVBW', shortLabel: 'KVBW' },
  { value: 'VddB', label: 'VddB', shortLabel: 'VddB' },
  { value: 'VddKO', label: 'VddKO', shortLabel: 'VddKO' },
] as const;

export const Membership: React.FC<MembershipProps> = ({ onNext }) => {
  const { data, updateMembership, canProceedFromSubStep } = useOnboarding();

  // Stage / orchestra (VddB, VddKO) needs membership number plus an extended
  // employment details form on the same step.
  const isStageProvider =
    data.membership.pensionProvider === 'VddB' ||
    data.membership.pensionProvider === 'VddKO';

  // Pension provider is pre-selected from eligibility flow
  const isProviderPreset = data.membership.pensionProvider !== '';
  const canProceed = canProceedFromSubStep('membership');

  // Get the selected provider for dynamic labeling
  const selectedProvider = PENSION_PROVIDERS.find(
    (p) => p.value === data.membership.pensionProvider
  );

  const providerLabel = selectedProvider?.label || data.membership.pensionProvider || '';

  // Dynamic membership number label and helper text based on selection
  const membershipNumberLabel = providerLabel
    ? `${providerLabel} membership number`
    : 'Membership number';

  const membershipNumberPlaceholder = providerLabel
    ? `Enter your ${providerLabel} membership number`
    : 'Enter your membership number';

  const helperText = providerLabel
    ? `You can find this number on letters or statements from ${providerLabel}.`
    : 'You can find this number on letters or statements from your pension provider.';

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
        {/* Pension Provider — read-only if pre-selected from eligibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplementary pension:
          </label>
          {/* Client #12: when the provider is carried over from the calculator
              or eligibility flow, show it as locked display — the user cannot
              change it here because it's tied to the claim they're filing. */}
          {isProviderPreset ? (
            <div
              className="w-full px-4 py-3 rounded-lg text-gray-700 font-medium"
              style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
            >
              {providerLabel}
            </div>
          ) : (
            <div className="relative">
              <select
                value={data.membership.pensionProvider}
                onChange={(e) =>
                  updateMembership({ pensionProvider: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="">Select company pension provider</option>
                {PENSION_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Membership Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {membershipNumberLabel}
          </label>
          <input
            type="text"
            value={data.membership.membershipNumber}
            onChange={(e) => updateMembership({ membershipNumber: e.target.value })}
            placeholder={membershipNumberPlaceholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          {/* Info Banner */}
          <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
            <p className="text-sm text-[#163300]">
              {helperText}
            </p>
          </div>
        </div>

        {isStageProvider && (
          <div className="border-t border-gray-200 pt-6">
            <StageMembershipDetails embedded />
          </div>
        )}
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
