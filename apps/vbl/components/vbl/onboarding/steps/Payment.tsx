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
        Pay a refundable deposit to begin processing your supplementary pension refund.
      </p>

      {/* Payment Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        {/* Deposit Amount */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <span className="font-medium text-gray-700">Refundable deposit (minimum fee):</span>
          <span className="text-3xl font-bold text-[#163300]">€199</span>
        </div>

        {/* Fee Breakdown List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Service fee:</strong> 9.75% of the refunded amount
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Minimum fee:</strong> €199 (paid upfront as a deposit)
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Remainder:</strong> Any difference between €199 and the final service fee is payable after the refund is granted
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Money-back guarantee:</strong> The €199 deposit is fully refunded if no refund is granted
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-6">
          <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-[#163300]" />
          </div>
          <span>Your payment is secured with 256-bit SSL encryption.</span>
        </div>

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
