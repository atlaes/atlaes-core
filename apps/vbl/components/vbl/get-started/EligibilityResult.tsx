'use client';

import React from 'react';
import { Check, X, ArrowRight, ArrowLeft, Clock, Bell } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';

export const EligibilityResult: React.FC = () => {
  const {
    result,
    ineligibilityInfo,
    waitingInfo,
    reviewInfo,
    reset,
    data,
    confirmEligibility,
  } = useEligibility();

  const handleContinueSecurely = () => {
    confirmEligibility();
  };

  if (result === 'eligible') {
    const isPrivate = data.employmentType === 'private_sector';

    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <div className="w-20 h-20 rounded-full bg-[#9FE870] flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-[#163300]" strokeWidth={3} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {isPrivate
            ? 'A lump-sum settlement may be possible'
            : "You're eligible to continue"}
        </h2>
        <p className="text-gray-600 mb-4">
          {isPrivate
            ? 'Based on your answers, a lump-sum settlement (Abfindung) of your company pension may be possible.'
            : 'Based on your answers, you can proceed with preparing and submitting your supplementary pension refund claim.'}
        </p>

        {isPrivate && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600">
              Final eligibility depends on confirmation by the pension provider
              and your former employer.
            </p>
          </div>
        )}

        {!isPrivate && <div className="mb-4" />}

        <button
          onClick={handleContinueSecurely}
          className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors"
        >
          {isPrivate ? 'Start Claim' : 'Continue securely'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (result === 'review' && reviewInfo) {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <div className="w-20 h-20 rounded-full bg-[#9FE870] flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-[#163300]" strokeWidth={2.5} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {reviewInfo.title}
        </h2>
        <p className="text-gray-600 mb-4">{reviewInfo.message}</p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
          {reviewInfo.disclaimerParagraphs.map((paragraph, i) => (
            <p key={i} className={`text-sm text-gray-600 ${i > 0 ? 'mt-2' : ''}`}>
              {paragraph}
            </p>
          ))}
        </div>

        <button
          onClick={handleContinueSecurely}
          className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors"
        >
          Proceed with review
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (result === 'waiting' && waitingInfo) {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <div className="w-20 h-20 rounded-full bg-[#9FE870] flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-[#163300]" strokeWidth={2.5} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {waitingInfo.title}
        </h2>
        <p className="text-gray-600 mb-4">{waitingInfo.message}</p>
        <p className="text-[#163300] font-semibold mb-8">
          You&apos;ll become eligible to apply on or after
          <br />
          {waitingInfo.eligibleDate}
        </p>

        <button
          onClick={reset}
          className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors mb-2"
        >
          <Bell className="w-4 h-4" />
          Notify me when I&apos;m eligible
        </button>
        <p className="text-sm text-gray-500 italic mb-4">
          We&apos;ll send you an email reminder.
        </p>
        <button
          onClick={reset}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  if (result === 'not_eligible' && ineligibilityInfo) {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
            <X className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {ineligibilityInfo.title}
        </h2>
        <p className="text-gray-600 mb-2">{ineligibilityInfo.message}</p>
        {ineligibilityInfo.secondaryMessage && (
          <p className="text-gray-600 mb-8">
            {ineligibilityInfo.secondaryMessage}
          </p>
        )}
        {!ineligibilityInfo.secondaryMessage && <div className="mb-8" />}

        <button
          onClick={reset}
          className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    );
  }

  return null;
};

export default EligibilityResult;
