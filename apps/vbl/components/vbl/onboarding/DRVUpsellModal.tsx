'use client';

import React from 'react';
import { X, ArrowRight, Bell, Calendar } from 'lucide-react';

interface DRVUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRemindLater: () => void;
  onStartClaim: () => void;
  eligibilityDate?: string; // If provided, shows time-based variant
  isEligibleNow?: boolean; // If true, shows immediate variant
}

export const DRVUpsellModal: React.FC<DRVUpsellModalProps> = ({
  isOpen,
  onClose,
  onRemindLater,
  onStartClaim,
  eligibilityDate,
  isEligibleNow = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header with Calendar Icon */}
        <div className="pt-8 pb-4 px-6 flex justify-center">
          <div className="w-16 h-16 bg-[#6366F1] rounded-2xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            German State Pension Refund
          </h2>

          {isEligibleNow ? (
            <>
              {/* Immediate Eligibility Variant */}
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Based on your nationality, residence, and contribution history, you appear to be eligible to also apply for your German state pension refund.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
                  <p className="text-green-800 font-medium">You are eligible</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                This is a separate and optional claim process from your supplementary refund.
              </p>

              {/* Action Buttons */}
              <button
                onClick={onStartClaim}
                className="w-full py-3 px-6 bg-[#6366F1] text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#4F46E5] transition-colors mb-3"
              >
                Start state pension refund claim
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Not now
              </button>
            </>
          ) : (
            <>
              {/* Time-Based Eligibility Variant */}
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Based on your nationality, residence, and last contribution date, you will become eligible to apply for a German state pension refund from:
                </p>
                <div className="bg-[#6366F1] text-white rounded-lg py-3 px-6 inline-block">
                  <p className="font-semibold text-lg">
                    {eligibilityDate || 'DD MMM YYYY'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                You don't need to remember this — we can notify you when the time comes.
              </p>

              {/* Action Buttons */}
              <button
                onClick={onRemindLater}
                className="w-full py-3 px-6 bg-[#6366F1] text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#4F46E5] transition-colors mb-3"
              >
                <Bell className="w-4 h-4" />
                Remind me when I'm eligible
              </button>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                No thanks
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DRVUpsellModal;
