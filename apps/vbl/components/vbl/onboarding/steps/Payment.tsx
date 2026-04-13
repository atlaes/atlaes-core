'use client';

import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { createClaim, createCheckoutSession } from '@/lib/onboarding-api';

interface PaymentProps {
  onNext: () => void;
}

export const Payment: React.FC<PaymentProps> = ({ onNext }) => {
  const { data, updateData } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      window.location.href = url;
    } catch (err) {
      console.error('Payment initiation failed:', err);
      setError(
        'Unable to start payment. Please try again or contact support.'
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Title */}
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Start your refund claim
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Pay the €199 deposit to begin your company pension refund claim.
      </p>

      {/* Payment Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        {/* Deposit Amount — centered pill card per Figma VBL-1 */}
        <div className="bg-gray-100 rounded-xl py-5 mb-6 text-center">
          <p className="text-3xl font-bold text-[#163300] leading-none">€199</p>
          <p className="text-sm text-gray-600 mt-1">deposit (minimum fee)</p>
        </div>

        {/* Fee Breakdown List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Service fee:</strong> 9.75% of the refunded amount
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Minimum fee:</strong> €199 is the minimum total fee for our service
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Deposit:</strong> You pay the €199 upfront and it counts toward your final service fee
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Remaining fee:</strong> Any amount above €199 is only due after your refund is approved
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#163300] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Money-back guarantee:</strong> The €199 deposit is fully refunded if the pension authority rejects your claim
            </p>
          </div>
        </div>

        {/* Bank account note */}
        <p className="text-xs text-gray-500 text-center mb-6">
          Your refund will be paid directly to your own bank account.
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
              Redirecting to payment...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay €199 deposit
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Payment;
