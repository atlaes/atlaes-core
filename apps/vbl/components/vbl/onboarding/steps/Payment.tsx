'use client';

import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { createClaim, createCheckoutSession } from '@/lib/onboarding-api';

interface PaymentProps {
  onNext: () => void;
}

interface PaymentCopy {
  heading: string;
  intro: string;
  depositTitle?: string;
  depositLabel: string;
  checklistHeading: string;
  checklist: string[];
  feeBullets: { label: string; text: string }[];
  feeFootnote?: string;
  calloutHeading: string;
  calloutBullets: string[];
  bankNote: string;
  secureLabel: string;
  buttonLabel: string;
  processingLabel: string;
}

// Item 6: the bAV (private pension type) paygate reuses the same Stripe
// checkout/claim-creation flow as the standard VBL/ZVK paygate — only the
// copy differs. Keeping both variants in one config object (per Figma
// VBL-1 for 'public' and VBL-26 for 'private') avoids duplicating JSX.
const PAYMENT_COPY: Record<'public' | 'private', PaymentCopy> = {
  public: {
    heading: 'Start your refund claim',
    intro: 'Pay the €199 deposit to start your company pension refund claim.',
    depositLabel: 'deposit — credited toward your service fee',
    checklistHeading: '',
    checklist: [],
    feeBullets: [
      { label: 'Service fee:', text: '9.75% of the refunded amount' },
      {
        label: 'Minimum fee:',
        text: '€199 is the minimum total fee for our service',
      },
      {
        label: 'Deposit:',
        text: 'You pay €199 upfront and it counts toward your final service fee',
      },
      {
        label: 'Remaining fee:',
        text: 'Any amount above €199 is only due after your refund is approved',
      },
      {
        label: 'Money-back guarantee:',
        text: 'The €199 deposit is fully refunded if the pension provider rejects your claim',
      },
    ],
    calloutHeading: '',
    calloutBullets: [],
    bankNote:
      'If approved, the refund will be paid directly to the bank account you provide.',
    secureLabel: 'Secure payment via Stripe',
    buttonLabel: 'Pay €199 deposit',
    processingLabel: 'Redirecting to payment...',
  },
  private: {
    heading: 'Start your bAV cash-out request',
    intro: '',
    depositTitle: 'Deposit',
    depositLabel: 'credited toward your service fee',
    checklistHeading: 'What happens next:',
    checklist: [
      'Upload your ID and required documents',
      'Confirm your pension, employer and payment details',
      'Review and sign your cash-out request online',
      'CompanyPension submits your request to the pension provider',
    ],
    feeBullets: [
      { label: '', text: '9.75% of the approved cash-out amount' },
      { label: '', text: 'Minimum fee: €199' },
    ],
    feeFootnote:
      'Any remaining balance is payable only after the payout is received.',
    calloutHeading: 'If the cash-out cannot be submitted after review:',
    calloutBullets: [
      '€79 is retained for the digital claim setup and document check',
      '€120 is refunded to you',
    ],
    bankNote:
      'CompanyPension provides a digital claim platform. We do not provide legal, pension, tax or financial advice. You remain the claimant and approved funds are paid directly to your own account.',
    secureLabel: '✓ Secure payment via Stripe',
    buttonLabel: 'Pay €199 and complete your claim',
    processingLabel: 'Redirecting to payment...',
  },
};

export const Payment: React.FC<PaymentProps> = ({ onNext }) => {
  const { data, updateData } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPrivate = data.pensionType === 'private';
  const copy = PAYMENT_COPY[isPrivate ? 'private' : 'public'];

  // Auto-skip if payment is already completed
  React.useEffect(() => {
    if (data.paymentCompleted) {
      onNext();
    }
  }, [data.paymentCompleted, onNext]);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // Create claim if we don't have one yet
      let claimId = data.claimId;
      if (!claimId) {
        const claimResult = await createClaim();
        claimId = claimResult.claim.id;
        updateData({ claimId });
        localStorage.setItem('vbl_draft_claimId', claimId);
      }

      // Create Stripe Checkout Session and redirect
      const { url } = await createCheckoutSession(claimId);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'vbl_onboarding_payment_seed',
          JSON.stringify({
            pensionType: data.pensionType,
            membership: data.membership,
          })
        );
      }
      window.location.href = url;
    } catch (err) {
      console.error('Payment initiation failed:', err);
      setError('Unable to start payment. Please try again or contact support.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Title */}
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        {copy.heading}
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      {copy.intro && (
        <p className="text-gray-600 text-center mb-8">{copy.intro}</p>
      )}

      {/* Payment Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        {/* Deposit Amount card — centered pill per Figma VBL-1 (public),
            or a label/amount row per Figma VBL-26 (bAV/private) */}
        {isPrivate ? (
          <div className="bg-gray-100 rounded-xl px-4 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {copy.depositTitle}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {copy.depositLabel}
              </p>
            </div>
            <p className="text-2xl font-bold text-[#163300] leading-none">
              €199
            </p>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl py-5 mb-6 text-center">
            <p className="text-3xl font-bold text-[#163300] leading-none">
              €199
            </p>
            <p className="text-sm text-gray-600 mt-1">{copy.depositLabel}</p>
          </div>
        )}

        {/* bAV "What happens next" checklist (Item 6 / VBL-26) */}
        {copy.checklistHeading && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              {copy.checklistHeading}
            </p>
            <div className="space-y-3">
              {copy.checklist.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-6" />
          </div>
        )}

        {/* Fee Breakdown List */}
        <div className={isPrivate ? 'mb-2' : 'space-y-3 mb-6'}>
          {isPrivate && (
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Service fee:
            </p>
          )}
          <div className={isPrivate ? 'space-y-1 mb-1' : 'space-y-3'}>
            {copy.feeBullets.map((bullet, index) =>
              isPrivate ? (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-sm text-gray-700">•</span>
                  <p className="text-sm text-gray-700">{bullet.text}</p>
                </div>
              ) : (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>{bullet.label}</strong> {bullet.text}
                  </p>
                </div>
              )
            )}
          </div>
          {copy.feeFootnote && (
            <p className="text-xs text-gray-500 mb-6">{copy.feeFootnote}</p>
          )}
        </div>

        {/* bAV "cannot be submitted after review" callout (Item 6 / VBL-26) */}
        {copy.calloutHeading && (
          <div className="bg-[#F0FDE4] rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {copy.calloutHeading}
            </p>
            <div className="space-y-1">
              {copy.calloutBullets.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-sm text-gray-700">•</span>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank account / disclaimer note */}
        <p className="text-xs text-gray-500 text-center mb-6">
          {copy.bankNote}
        </p>
        <p className="text-xs text-gray-500 text-center mb-6">
          {copy.secureLabel}
        </p>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-[#163300] border-t-transparent rounded-full animate-spin" />
              {copy.processingLabel}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              {copy.buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Payment;
