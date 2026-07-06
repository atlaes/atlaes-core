'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { StageMembershipDetails } from './StageMembershipDetails';

interface MembershipProps {
  onNext: () => void;
  // Item 26: lets this step intercept the global Back button while it's on
  // the second of its two internal stage-details screens, so Back returns
  // to the first screen instead of leaving the membership sub-step. Pass
  // null to release control back to the flow's default substep-level Back
  // behavior. Same mechanism as Identity.tsx / BankDetails.tsx.
  setBackOverride?: (handler: (() => void) | null) => void;
}

// Item 26: the combined "Stage or orchestra employment details" screen is
// split into two sequential internal phases for stage/orchestra providers
// (VddB, VddKO) — mirrors the BankDetails phase pattern. Non-stage
// providers never leave 'details'.
type MembershipPhase = 'details' | 'stage-screen-1' | 'stage-screen-2';

const PENSION_PROVIDERS = [
  { value: 'VBLklassik', label: 'VBLklassik', shortLabel: 'VBLklassik' },
  { value: 'VBLextra', label: 'VBLextra', shortLabel: 'VBLextra' },
  { value: 'VBL', label: 'VBL', shortLabel: 'VBL' },
  { value: 'ZVK', label: 'ZVK', shortLabel: 'ZVK' },
  { value: 'KVBW', label: 'KVBW', shortLabel: 'KVBW' },
  { value: 'VddB', label: 'VddB', shortLabel: 'VddB' },
  { value: 'VddKO', label: 'VddKO', shortLabel: 'VddKO' },
] as const;

export const Membership: React.FC<MembershipProps> = ({
  onNext,
  setBackOverride,
}) => {
  const { data, updateMembership, canProceedFromSubStep } = useOnboarding();

  // Stage / orchestra (VddB, VddKO) needs membership number plus an extended
  // employment details form on the same step.
  const isStageProvider =
    data.membership.pensionProvider === 'VddB' ||
    data.membership.pensionProvider === 'VddKO';

  // Item 26: two-screen split for stage providers. Self-review rule: on
  // resume (loadFromClaim) or any fresh mount, always land on screen 1 —
  // the simplest safe default regardless of how complete the saved stage
  // data already is.
  const [phase, setPhase] = useState<MembershipPhase>(
    isStageProvider ? 'stage-screen-1' : 'details'
  );

  const s = data.membership.stageDetails;

  const screen1Valid =
    s.stageName.trim() !== '' &&
    s.rolePosition.trim() !== '' &&
    s.employmentEndDate !== '';

  const screen2Valid = (() => {
    const reasonOk =
      s.reasonForLeaving !== '' &&
      (s.reasonForLeaving !== 'other' || s.reasonForLeavingOther.trim() !== '');
    return (
      s.permanentlyStopped !== '' &&
      reasonOk &&
      s.currentOccupation.trim() !== '' &&
      s.unableToWorkHealth !== ''
    );
  })();

  const handleBackToScreen1 = useCallback(() => {
    setPhase('stage-screen-1');
  }, []);

  // Safety net: the pension provider can arrive slightly after this
  // component mounts (e.g. the Stripe-return sessionStorage restore in
  // GetStartedOnboardingFlow), which would otherwise leave phase stuck on
  // 'details' for a stage provider. Promote to screen 1 if that happens;
  // never demote away from an in-progress stage phase.
  useEffect(() => {
    if (isStageProvider && phase === 'details') {
      setPhase('stage-screen-1');
    }
  }, [isStageProvider, phase]);

  // Register/release the global Back override while on screen 2. Screen 1
  // relies on the flow's default Back behavior (leaving the membership
  // sub-step entirely), matching BankDetails' destination phase.
  useEffect(() => {
    if (!setBackOverride) return;
    if (isStageProvider && phase === 'stage-screen-2') {
      setBackOverride(handleBackToScreen1);
    } else {
      setBackOverride(null);
    }
    return () => setBackOverride(null);
  }, [isStageProvider, phase, setBackOverride, handleBackToScreen1]);

  const handleContinue = () => {
    if (isStageProvider) {
      if (phase === 'stage-screen-1') {
        setPhase('stage-screen-2');
        return;
      }
      if (phase === 'stage-screen-2') {
        onNext();
        return;
      }
    }
    onNext();
  };

  // Overall substep completion (used for the tab bar / review-section
  // completeness check) is unchanged — canProceedFromSubStep('membership')
  // still requires every field across both screens.
  const canProceedOverall = canProceedFromSubStep('membership');
  const canProceed = isStageProvider
    ? phase === 'stage-screen-1'
      ? screen1Valid
      : screen2Valid
    : canProceedOverall;

  // Client #15: the pension provider is always known by this point — it's
  // set during eligibility (public flow) or the calculator bridge
  // (sessionStorage) before the user ever reaches this screen. There is no
  // provider dropdown here anymore; we only ever show the locked, read-only
  // institution display. If the provider is somehow empty (edge case), we
  // still render the read-only block with whatever is in context rather
  // than falling back to a picker.
  const selectedProvider = PENSION_PROVIDERS.find(
    (p) => p.value === data.membership.pensionProvider
  );

  const providerLabel =
    selectedProvider?.label || data.membership.pensionProvider || '';
  const displayProviderLabel =
    providerLabel === 'VBL' ? 'VBLklassik' : providerLabel;
  const isVblProvider =
    providerLabel === 'VBL' ||
    providerLabel === 'VBLklassik' ||
    providerLabel === 'VBLextra';

  // All copy on this screen is derived dynamically from the actual
  // provider name substituted in, per the design reference helper copy
  // pattern ("You can find this number on letters or statements from VBL.").
  const providerNameForCopy = isVblProvider ? 'VBL' : providerLabel;

  // Dynamic membership number label and helper text based on selection
  const membershipNumberLabel = isVblProvider
    ? 'VBL insurance number'
    : providerLabel
      ? `${providerLabel} membership number`
      : 'Membership number';

  const membershipNumberPlaceholder = providerNameForCopy
    ? `Enter your ${providerNameForCopy} ${isVblProvider ? 'insurance' : 'membership'} number`
    : 'Enter your membership number';

  const helperText = providerNameForCopy
    ? `You can find this number on letters or statements from ${providerNameForCopy}.`
    : 'You can find this number on letters or statements from your pension provider.';

  // Item 26: screen 2 gets its own heading/intro per the design reference
  // (Eligibility/VBL-5.png — "Leaving stage or orchestra employment" /
  // "Please provide a few more details for your refund request."). Screen 1
  // keeps the original combined-screen heading/intro (Eligibility/VBL-4.png).
  const isStageScreen2 = isStageProvider && phase === 'stage-screen-2';
  const heading = isStageScreen2
    ? 'Leaving stage or orchestra employment'
    : isStageProvider
      ? 'Stage or orchestra employment details'
      : providerNameForCopy
        ? `${providerNameForCopy} pension details`
        : 'Pension details';
  const intro = isStageScreen2
    ? 'Please provide a few more details for your refund request.'
    : isStageProvider
      ? 'Please provide details about your last stage or orchestra employment in Germany.'
      : providerNameForCopy
        ? `Enter the details from your ${providerNameForCopy} document.`
        : 'Enter the details from your pension document.';

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        {heading}
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">{intro}</p>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Pension Provider — always a locked, read-only display. Client
            #15: the institution is fixed by the time the user reaches this
            screen (eligibility sets it for the public flow; the calculator
            bridge sets it via sessionStorage for the others), so it is
            never re-editable here — there is no dropdown fallback, even if
            the provider were somehow empty in context. Item 26: hidden on
            stage screen 2, matching the design reference (Eligibility/
            VBL-5.png doesn't repeat this block on the second screen). */}
        {!isStageScreen2 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected company pension
            </label>
            <div
              className="w-full px-4 py-3 rounded-lg text-gray-700 font-medium"
              style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
            >
              {displayProviderLabel}
            </div>
          </div>
        )}

        {!isStageProvider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {membershipNumberLabel}
            </label>
            <input
              type="text"
              name="membership-reference"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={data.membership.membershipNumber}
              onChange={(e) =>
                updateMembership({ membershipNumber: e.target.value })
              }
              placeholder={membershipNumberPlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
            {/* Info Banner */}
            <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-center gap-3">
              <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
              <p className="text-sm text-[#163300]">{helperText}</p>
            </div>
          </div>
        )}

        {isStageProvider && (
          <div className="pt-2">
            <StageMembershipDetails
              embedded
              section={
                phase === 'stage-screen-2'
                  ? 'leaving-occupation'
                  : 'last-employment'
              }
            />
          </div>
        )}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
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
