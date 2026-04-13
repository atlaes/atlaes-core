'use client';

import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface StageMembershipDetailsProps {
  onNext: () => void;
}

// Stage / orchestra (VddB / VddKO) extended sub-form — Figma VBL-4/5.
// Rendered inline inside the Membership step when pensionProvider is
// VddB or VddKO, replacing the simple membership-number input.
const REASONS_FOR_LEAVING = [
  { value: 'contract_ended', label: 'Contract ended / not renewed' },
  { value: 'health', label: 'Health reasons / injury' },
  { value: 'career_change', label: 'Career change' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'other', label: 'Other (please specify)' },
] as const;

export const StageMembershipDetails: React.FC<StageMembershipDetailsProps> = ({
  onNext,
}) => {
  const { data, updateStageDetails, canProceedFromSubStep } = useOnboarding();
  const s = data.membership.stageDetails;
  const canProceed = canProceedFromSubStep('membership');

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Stage / orchestra employment details
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Please provide details about your last stage or orchestra employment in Germany.
      </p>

      {/* Section 1 — Last employment */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-[#163300] mb-4">
          Last stage / orchestra employment in Germany
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name of the stage / orchestra
            </label>
            <input
              type="text"
              value={s.stageName}
              onChange={(e) => updateStageDetails({ stageName: e.target.value })}
              placeholder="e.g. Berlin State Opera"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your role / position
            </label>
            <input
              type="text"
              value={s.rolePosition}
              onChange={(e) => updateStageDetails({ rolePosition: e.target.value })}
              placeholder="e.g. Violinist, Actor, Stage technician"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              When did this employment end?
            </label>
            <input
              type="date"
              value={s.employmentEndDate}
              onChange={(e) =>
                updateStageDetails({ employmentEndDate: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section 2 — Leaving employment */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-[#163300] mb-4">
          Leaving stage / orchestra employment
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          Have you permanently stopped working in stage / orchestra employment in Germany?
        </p>
        <div className="flex items-center gap-6 mb-4">
          {(['yes', 'no'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="permanentlyStopped"
                checked={s.permanentlyStopped === v}
                onChange={() => updateStageDetails({ permanentlyStopped: v })}
                className="w-4 h-4 text-[#9FE870] focus:ring-[#9FE870]"
              />
              <span className="text-sm text-gray-700 capitalize">{v}</span>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for leaving
          </label>
          <div className="relative">
            <select
              value={s.reasonForLeaving}
              onChange={(e) =>
                updateStageDetails({ reasonForLeaving: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Select a reason</option>
              {REASONS_FOR_LEAVING.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {s.reasonForLeaving === 'other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other (please specify)
            </label>
            <input
              type="text"
              value={s.reasonForLeavingOther}
              onChange={(e) =>
                updateStageDetails({ reasonForLeavingOther: e.target.value })
              }
              placeholder="Other reason for leaving"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
        )}
      </div>

      {/* Section 3 — Current occupation */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-[#163300] mb-4">
          Current occupation
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What is your current occupation?
          </label>
          <input
            type="text"
            value={s.currentOccupation}
            onChange={(e) =>
              updateStageDetails({ currentOccupation: e.target.value })
            }
            placeholder="e.g. Office employee, Self-employed, Freelancer"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>
        <p className="text-sm text-gray-700 mb-3">
          Are you currently unable to work for health reasons?
        </p>
        <div className="flex items-center gap-6">
          {(['no', 'yes'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="unableToWorkHealth"
                checked={s.unableToWorkHealth === v}
                onChange={() => updateStageDetails({ unableToWorkHealth: v })}
                className="w-4 h-4 text-[#9FE870] focus:ring-[#9FE870]"
              />
              <span className="text-sm text-gray-700 capitalize">{v}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
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

export default StageMembershipDetails;
