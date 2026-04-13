'use client';

import React from 'react';
import { ArrowRight, Check, Bell } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface SuccessScreenProps {
  onGoToDashboard: () => void;
  onShowDRVUpsell?: () => void;
  onStartDRVClaim?: () => void;
  onRemindDRV?: () => void;
  drvEligibilityDate?: string; // If provided, user will be eligible in the future
  isDRVEligibleNow?: boolean; // If true, user is immediately eligible
  // Figma VBL-23/24: mixed-claim continuation block. Shown only when the
  // user still has a second claim to file (e.g. the just-submitted public
  // claim is followed by a pending private-sector settlement).
  otherClaimLabel?: string;
  otherClaimProvider?: string;
  onStartOtherClaim?: () => void;
}

const WHAT_HAPPENS_NEXT = [
  'The pension provider reviews your application',
  "Once the refund is granted, we'll notify you so you can download the official refund statement and settle any remaining service fee.",
  'The refund is paid directly to the bank account you provided',
];

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  onGoToDashboard,
  onShowDRVUpsell,
  onStartDRVClaim,
  onRemindDRV,
  drvEligibilityDate,
  isDRVEligibleNow = false,
  otherClaimLabel,
  otherClaimProvider,
  onStartOtherClaim,
}) => {
  const hasOtherClaim = !!(otherClaimLabel && onStartOtherClaim);
  const { data, updateSuccessData } = useOnboarding();

  const handleRemindDRV = () => {
    updateSuccessData({ drvReminderSet: true });
    if (onRemindDRV) {
      onRemindDRV();
    }
  };

  const showDRVSection = drvEligibilityDate || isDRVEligibleNow;

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success Checkmark */}
      <div className="w-24 h-24 bg-[#9FE870] rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-12 h-12 text-[#163300]" strokeWidth={3} />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Your refund claim has been submitted
      </h2>

      {/* Subtitle */}
      <p className="text-gray-600 mb-8">
        Processing usually takes <span className="font-semibold">4-8 weeks</span>. You don't need to take any action during this time unless we contact you.
      </p>

      {/* What happens next box */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
        <h3 className="font-semibold text-gray-900 mb-4">What happens next:</h3>
        <ul className="space-y-3">
          {WHAT_HAPPENS_NEXT.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-5 h-5 bg-[#9FE870] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-[#163300]" strokeWidth={3} />
              </div>
              <span className="text-sm text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Email updates note */}
      <p className="text-sm text-gray-500 mb-6">
        You'll receive email updates if anything is required from you.
      </p>

      {/* Go to Dashboard Button */}
      <button
        onClick={onGoToDashboard}
        className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors mb-8"
      >
        Go to your dashboard
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Mixed-claim continuation block — Figma VBL-23/24 */}
      {hasOtherClaim && (
        <>
          <div className="border-t border-gray-200 mb-8" />
          <div className="border border-gray-200 rounded-xl p-6 mb-8 text-center">
            <h3 className="text-base font-semibold text-[#163300] mb-2">
              Continue with another supplementary pension
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              These pensions are legally separate and must be claimed one at a time. You can start your next claim now or come back to it later from your dashboard.
            </p>
            <button
              onClick={onStartOtherClaim}
              className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors"
            >
              Continue with {otherClaimLabel}
              {otherClaimProvider ? ` (${otherClaimProvider})` : ''}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Divider */}
      {showDRVSection && !hasOtherClaim && <div className="border-t border-gray-200 mb-8" />}

      {/* DRV Upsell Section */}
      {showDRVSection && (
        <div className="bg-[#6366F1] rounded-xl overflow-hidden text-white">
          {/* Header */}
          <div className="bg-[#4F46E5] px-6 py-3">
            <h3 className="font-semibold">German State Pension (DRV)</h3>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {isDRVEligibleNow ? (
              <>
                <p className="text-lg font-medium mb-2">
                  You are also eligible for a<br />German state pension refund
                </p>
                <p className="text-sm text-white/80 mb-4">
                  Based on your nationality, residence, and contribution history, you appear to be <span className="font-semibold text-white">eligible</span> to also apply for your German state pension refund.
                </p>
                <p className="text-sm text-white/80 mb-6">
                  This is a <span className="font-semibold text-white">separate and optional claim</span> process from your supplementary refund.
                </p>
                <button
                  onClick={onStartDRVClaim}
                  className="w-full py-3 px-6 bg-white text-[#4F46E5] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors mb-3"
                >
                  Start state pension refund claim
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onGoToDashboard}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Not now
                </button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Later, you may also be eligible for a<br />German state pension refund
                </p>
                <p className="text-sm text-white/80 mb-4">
                  Based on your nationality, residence, and last contribution date, you will become <span className="font-semibold text-white">eligible</span> to apply for a German state pension refund from:
                </p>

                {/* Eligibility Date Box */}
                <div className="bg-white/10 rounded-lg py-2 px-4 mb-4 inline-block">
                  <span className="text-white font-medium">
                    {drvEligibilityDate || 'DD MMM YYYY'}
                  </span>
                </div>

                <p className="text-sm text-white/80 mb-6">
                  You don't need to remember this — we can notify you when the time comes.
                </p>

                <button
                  onClick={handleRemindDRV}
                  disabled={data.successData?.drvReminderSet}
                  className={`w-full py-3 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors mb-3 ${
                    data.successData?.drvReminderSet
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-[#4F46E5] hover:bg-gray-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {data.successData?.drvReminderSet ? 'Reminder set!' : "Remind me when I'm eligible"}
                </button>
                <button
                  onClick={onGoToDashboard}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  No thanks
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessScreen;
