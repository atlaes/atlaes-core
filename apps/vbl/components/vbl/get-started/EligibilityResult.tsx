'use client';

import React, { useState } from 'react';
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
  const [stageReminderStep, setStageReminderStep] = useState<
    'initial' | 'form' | 'set'
  >('initial');
  const [reminderEmail, setReminderEmail] = useState('');

  const handleContinueSecurely = () => {
    confirmEligibility();
  };

  const isPublic = data.employmentType === 'public_sector';
  const isStage = data.employmentType === 'stage_performing_arts';
  const isStageUpload = isStage && data.stageEntryPath === 'upload';

  if (result === 'eligible') {
    const isPrivate = data.employmentType === 'private_sector';

    if (isPublic || isStage) {
      return (
        <div className="mx-auto flex min-h-[470px] max-w-[760px] flex-col items-center justify-center text-center">
          <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#9FE870]">
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#163300]">
              <Check className="h-11 w-11 text-[#9FE870]" strokeWidth={3} />
            </div>
          </div>

          <h2 className="mb-8 text-[26px] font-bold leading-tight text-[#111827] md:whitespace-nowrap">
            Your refund can be started with CompanyPension
          </h2>

          <button
            onClick={handleContinueSecurely}
            className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860]"
          >
            {isStageUpload ? 'Create secure claim' : 'Create your secure claim'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      );
    }

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
    if (isStage) {
      if (stageReminderStep === 'set') {
        return (
          <div className="mx-auto flex min-h-[470px] max-w-[620px] flex-col items-center justify-center text-center">
            <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#9FE870]">
              <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#163300]">
                <Check className="h-11 w-11 text-[#9FE870]" strokeWidth={3} />
              </div>
            </div>

            <h2 className="mb-4 text-[26px] font-bold leading-tight text-[#111827]">
              Reminder set
            </h2>
            <p className="max-w-[460px] text-[16px] leading-6 text-[#4B5563]">
              {isStageUpload
                ? 'We will remind you when your VddB/VddKO refund can be started with CompanyPension.'
                : "We'll email you when you can start your refund."}
            </p>
            {isStageUpload && (
              <button
                type="button"
                onClick={reset}
                className="mt-8 flex h-12 w-full max-w-[400px] items-center justify-center rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860]"
              >
                Return to start
              </button>
            )}
          </div>
        );
      }

      if (stageReminderStep === 'form') {
        return (
          <div className="mx-auto flex min-h-[470px] max-w-[620px] flex-col items-center justify-center text-center">
            <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#EEF6EA]">
              <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#5A9A23]">
                <Clock className="h-11 w-11 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h2 className="mb-4 text-[26px] font-bold leading-tight text-[#111827]">
              {isStageUpload
                ? 'Notify me when I can start'
                : 'Your refund cannot be started yet'}
            </h2>
            <p className="mb-8 max-w-[520px] text-[16px] leading-6 text-[#4B5563]">
              {isStageUpload
                ? 'Enter your email and we will remind you when the waiting period has passed.'
                : `You can return on or after ${waitingInfo.eligibleDate}.`}
            </p>

            <label className="mb-2 w-full max-w-[400px] text-left text-[15px] font-semibold text-[#4A4F58]">
              Email address
            </label>
            <input
              type="email"
              placeholder="Email"
              value={reminderEmail}
              onChange={(event) => setReminderEmail(event.target.value)}
              className="mb-5 h-12 w-full max-w-[400px] rounded-[8px] border border-[#D3DAE8] bg-white px-4 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
            />

            <button
              type="button"
              onClick={() => setStageReminderStep('set')}
              disabled={!reminderEmail}
              className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Set reminder
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-4 max-w-[430px] text-[14px] italic leading-5 text-[#6B7280]">
              We&apos;ll send you an email reminder when you can start your
              refund.
            </p>
          </div>
        );
      }

      return (
        <div className="mx-auto flex min-h-[470px] max-w-[620px] flex-col items-center justify-center text-center">
          <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#EEF6EA]">
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#5A9A23]">
              <Clock className="h-11 w-11 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h2 className="mb-4 text-[26px] font-bold leading-tight text-[#111827]">
            Your refund cannot be started yet
          </h2>
          <p className="mb-8 max-w-[460px] text-[16px] leading-6 text-[#4B5563]">
            You can return on or after {waitingInfo.eligibleDate}.
          </p>

          <button
            type="button"
            onClick={() => setStageReminderStep('form')}
            className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860]"
          >
            <Bell className="h-5 w-5" />
            Notify me when I can start
          </button>
          <p className="mt-4 text-[14px] italic leading-5 text-[#6B7280]">
            We&apos;ll send you an email reminder.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 text-[15px] font-semibold text-[#163300] underline underline-offset-2 transition hover:text-[#2A5A00]"
          >
            Back
          </button>
        </div>
      );
    }

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
    if (isPublic || isStage) {
      return (
        <div className="mx-auto flex min-h-[470px] max-w-[620px] flex-col items-center justify-center text-center">
          <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#F5D4CF]">
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#B92513]">
              <X className="h-12 w-12 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h2 className="mb-8 max-w-[520px] text-[26px] font-bold leading-tight text-[#111827]">
            This refund cannot currently be claimed with CompanyPension
          </h2>

          <button
            onClick={reset}
            className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860]"
          >
            <ArrowLeft className="h-5 w-5" />
            Return to start
          </button>
        </div>
      );
    }

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
