'use client';

import React, { useState } from 'react';
import { CreditCard, Check, Lock } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface PaymentProps {
  onNext: () => void;
}

export const Payment: React.FC<PaymentProps> = ({ onNext }) => {
  const { updateData } = useOnboarding();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // In real implementation, this would integrate with Stripe/payment provider
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      updateData({
        paymentCompleted: true,
        paymentReference: `PAY-${Date.now()}`,
      });
      onNext();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Title */}
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Complete your registration
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Pay a small deposit to start your refund claim.
      </p>

      {/* Payment Card */}
      <div className="bg-[#F0FDE4] rounded-xl p-6 mb-6">
        {/* Deposit Amount */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#163300]/10">
          <span className="font-medium text-gray-700">Deposit (Refundable)</span>
          <span className="text-3xl font-bold text-[#163300]">€199</span>
        </div>

        {/* Benefits List */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">
              Final fee: <strong>9.75%</strong> of your refund
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">Deposit deducted later</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-[#163300]" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>100% money-back guarantee</strong> if unsuccessful
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-6">
          <Lock className="w-4 h-4" />
          <span>Your payment is secured with 256-bit SSL encryption.</span>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-[#163300] border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay €199 deposit
            </>
          )}
        </button>
      </div>

      {/* Additional Info */}
      <p className="text-xs text-gray-500 text-center">
        By proceeding, you agree to our{' '}
        <a href="/terms" className="text-[#163300] underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-[#163300] underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
};

export default Payment;
