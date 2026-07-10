'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  User,
  CreditCard as CardIcon,
  MapPin,
  Landmark,
  PenTool,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldPlus,
  AlertCircle,
} from 'lucide-react';
import {
  useOnboarding,
  SubmitDetailsSubStep,
} from '@/contexts/OnboardingContext';
import { submitClaim, markStepComplete } from '@/lib/onboarding-api';

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland',
  NL: 'Netherlands',
  BE: 'Belgium',
  FR: 'France',
  GB: 'United Kingdom',
  US: 'United States',
  OTHER: 'Other',
};

const REASON_FOR_LEAVING_LABELS: Record<string, string> = {
  contract_ended: 'Contract ended / not renewed',
  health: 'Health reasons / injury',
  career_change: 'Career change',
  retirement: 'Retirement',
  relocation: 'Relocation',
  other: 'Other (please specify)',
};

const HEALTH_INSURANCE_TYPE_LABELS: Record<string, string> = {
  statutory: 'Statutory health insurance / public health fund',
  private: 'Private health insurance',
  not_sure: 'I am not sure',
};

interface ReviewSection {
  id: string;
  title: string;
  subStep: SubmitDetailsSubStep;
  icon: React.ReactNode;
}

// Item 27: base accordion order. The "Employment Details" section is
// inserted between Bank details and Signature only for stage/orchestra
// (VddB / VddKO) claimants — see design reference Eligibility/VBL-19.png
// ("Review your refund request", accordion: Personal information, Address,
// Pension details, Bank details, Employment Details, Signature).
const BASE_REVIEW_SECTIONS: ReviewSection[] = [
  {
    id: 'personal',
    title: 'Personal information',
    subStep: 'identity',
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 'address',
    title: 'Address',
    subStep: 'address',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    id: 'membership',
    title: 'Pension details',
    subStep: 'membership',
    icon: <CardIcon className="w-5 h-5" />,
  },
  {
    id: 'bank',
    title: 'Bank details',
    subStep: 'bank-details',
    icon: <Landmark className="w-5 h-5" />,
  },
];

const EMPLOYMENT_DETAILS_SECTION: ReviewSection = {
  id: 'employment',
  title: 'Employment Details',
  subStep: 'membership',
  icon: <CardIcon className="w-5 h-5" />,
};

// Task 15: Health insurance — bAV/private pension type claimants only. Per
// design VBL-24/VBL-25, it sits after Pension details / Address and before
// Bank details in the accordion.
const HEALTH_INSURANCE_SECTION: ReviewSection = {
  id: 'health-insurance',
  title: 'Health insurance',
  subStep: 'health-insurance',
  icon: <ShieldPlus className="w-5 h-5" />,
};

const SIGNATURE_SECTION: ReviewSection = {
  id: 'signature',
  title: 'Signature',
  subStep: 'signature',
  icon: <PenTool className="w-5 h-5" />,
};

function getSubmitErrorMessage(error: unknown): string {
  const responseData = (
    error as {
      response?: {
        data?: {
          error?: string;
          message?: string;
          details?: unknown;
        };
      };
    }
  ).response?.data;

  if (Array.isArray(responseData?.details)) {
    return responseData.details.join(', ');
  }
  if (typeof responseData?.details === 'string') {
    return responseData.details;
  }
  if (responseData?.error) {
    return responseData.error;
  }
  if (responseData?.message) {
    return responseData.message;
  }
  return error instanceof Error
    ? error.message
    : 'Failed to submit claim. Please try again.';
}

interface ReviewSubmitProps {
  onSubmitSuccess?: () => void;
  onEditSection?: (subStep: SubmitDetailsSubStep) => void;
  // When provided (public/stage get-started flow, where a Confirm step and a
  // terminal Signature step now follow Review), the primary button advances to
  // the next substep instead of submitting the claim here. Legacy / bAV flows
  // omit this prop and keep Review as the terminal submit step.
  onContinue?: () => void;
}

export const ReviewSubmit: React.FC<ReviewSubmitProps> = ({
  onSubmitSuccess,
  onEditSection,
  onContinue,
}) => {
  const { data, updateSuccessData, setCurrentSubStep, canProceedFromSubStep } =
    useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Item 27: stage/orchestra (VddB, VddKO) claimants get an additional
  // "Employment Details" accordion row, between Bank details and Signature.
  const isStageProvider =
    data.membership.pensionProvider === 'VddB' ||
    data.membership.pensionProvider === 'VddKO';

  // Task 15: Health insurance only applies to bAV/private pension type
  // claimants (see getSubmitDetailsSubsteps in OnboardingContext.tsx).
  const isPrivatePensionType = data.pensionType === 'private';

  // In the new public/stage order (onContinue provided), the Signature step
  // comes AFTER Review (Review → Confirm → Signature), so a Signature
  // accordion section here would be meaningless — and its "Edit information"
  // link was a Confirm bypass (jump straight to the terminal Signature step,
  // draw, Continue → submit without the Confirm declarations ever being
  // completed). Don't render it at all in that mode.
  const reviewSections: ReviewSection[] = [
    ...BASE_REVIEW_SECTIONS,
    ...(isPrivatePensionType ? [HEALTH_INSURANCE_SECTION] : []),
    ...(isStageProvider ? [EMPLOYMENT_DETAILS_SECTION] : []),
    ...(onContinue ? [] : [SIGNATURE_SECTION]),
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!match) return dateString;
    const date = new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    );
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleEditSection = (subStep: SubmitDetailsSubStep) => {
    if (onEditSection) {
      onEditSection(subStep);
    } else {
      setCurrentSubStep(subStep);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const claimId = data.claimId;
      if (!claimId) {
        throw new Error(
          'No claim found. Please restart the onboarding process.'
        );
      }

      // Mark final review steps as complete
      await markStepComplete(claimId, 'reviewInformation');
      await markStepComplete(claimId, 'finalConfirmation');

      // Submit the claim (data was already saved incrementally per substep)
      const submitResult = await submitClaim(claimId);

      // Clean up draft from localStorage
      localStorage.removeItem('vbl_draft_claimId');

      updateSuccessData({
        submissionId: submitResult.claim.id,
        submittedAt:
          (submitResult.claim.submittedAt as string) ||
          new Date().toISOString(),
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(getSubmitErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  const isSectionComplete = (subStep: SubmitDetailsSubStep): boolean => {
    return canProceedFromSubStep(subStep);
  };

  const renderSectionContent = (section: ReviewSection) => {
    switch (section.id) {
      case 'personal':
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            <p className="text-gray-700">
              <span className="text-gray-500">Name:</span>{' '}
              {[
                data.identity.firstName,
                data.identity.middleName,
                data.identity.lastName,
              ]
                .filter((part) => part.trim() !== '')
                .join(' ') || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Date of birth:</span>{' '}
              {formatDate(data.identity.dateOfBirth) || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Gender:</span>{' '}
              {GENDER_LABELS[data.identity.gender] || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Nationality:</span>{' '}
              {data.identity.nationality || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Place of birth:</span>{' '}
              {data.identity.placeOfBirth || 'Not provided'}
            </p>
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      case 'address':
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            <p className="text-gray-700">
              <span className="text-gray-500">Street and house number:</span>{' '}
              {data.address.streetAndNumber || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Postal code:</span>{' '}
              {data.address.postalCode || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">City:</span>{' '}
              {data.address.city || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Country:</span>{' '}
              {COUNTRY_LABELS[data.address.country] ||
                data.address.country ||
                'Not provided'}
            </p>
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      case 'membership':
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            <p className="text-gray-700">
              <span className="text-gray-500">Scheme:</span>{' '}
              {data.membership.pensionProvider || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Membership number:</span>{' '}
              {data.membership.membershipNumber || 'Not provided'}
            </p>
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      case 'health-insurance': {
        // Task 15: incomplete state (VBL-25) shows a red callout + "Fix
        // health insurance details" link instead of the field summary.
        const hi = data.healthInsurance;
        const isComplete = isSectionComplete('health-insurance');
        if (!isComplete) {
          return (
            <div className="pt-4 pb-2">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p>
                    We couldn't find a completed health insurance upload or
                    confirmation. Please review and confirm your health
                    insurance details before submitting your request.
                  </p>
                  <button
                    onClick={() => handleEditSection(section.subStep)}
                    className="mt-2 font-medium underline hover:no-underline"
                  >
                    Fix health insurance details →
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            <p className="text-gray-700">
              <span className="text-gray-500">Type of health insurance:</span>{' '}
              {HEALTH_INSURANCE_TYPE_LABELS[hi.type] || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Health insurance provider:</span>{' '}
              {hi.providerName || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">
                Health insurance provider address:
              </span>{' '}
              {hi.providerAddress || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Insured since:</span>{' '}
              {hi.insuredSinceMonth || hi.insuredSinceYear
                ? [hi.insuredSinceMonth, hi.insuredSinceYear]
                    .filter(Boolean)
                    .join(' ')
                : 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Place of birth:</span>{' '}
              {hi.placeOfBirth || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Country of birth:</span>{' '}
              {hi.countryOfBirth || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Health insurance number:</span>{' '}
              {hi.insuranceNumber || 'Not provided'}
            </p>
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      }
      case 'bank':
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            {data.bankDetails.accountHolder && (
              <p className="text-gray-700">
                <span className="text-gray-500">Account holder name:</span>{' '}
                {data.bankDetails.accountHolder}
              </p>
            )}
            {data.bankDetails.iban ? (
              <p className="text-gray-700">
                <span className="text-gray-500">IBAN:</span>{' '}
                {data.bankDetails.iban}
              </p>
            ) : (
              <p className="text-gray-700">
                {data.bankDetails.accountOption === 'open_free_account' &&
                  'Will open EUR account'}
                {data.bankDetails.accountOption === 'trusted_third_party' &&
                  'Using third-party account'}
              </p>
            )}
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      case 'employment': {
        // Item 27: stage/orchestra employment details, shown only for VddB /
        // VddKO claimants. Field order per design reference
        // Eligibility/VBL-4.png and VBL-5.png: stage name, role, employment
        // end date, permanently stopped, reason for leaving, current
        // occupation, health flag.
        const stage = data.membership.stageDetails;
        const reasonLabel =
          stage.reasonForLeaving === 'other'
            ? stage.reasonForLeavingOther || 'Not provided'
            : REASON_FOR_LEAVING_LABELS[stage.reasonForLeaving] ||
              'Not provided';
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            <p className="text-gray-700">
              <span className="text-gray-500">Stage or orchestra:</span>{' '}
              {stage.stageName || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Role or position:</span>{' '}
              {stage.rolePosition || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Employment end date:</span>{' '}
              {formatDate(stage.employmentEndDate) || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">
                Permanently stopped working:
              </span>{' '}
              {stage.permanentlyStopped
                ? stage.permanentlyStopped === 'yes'
                  ? 'Yes'
                  : 'No'
                : 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Reason for leaving:</span>{' '}
              {reasonLabel}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Current occupation:</span>{' '}
              {stage.currentOccupation || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">
                Unable to work for health reasons:
              </span>{' '}
              {stage.unableToWorkHealth
                ? stage.unableToWorkHealth === 'yes'
                  ? 'Yes'
                  : 'No'
                : 'Not provided'}
            </p>
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      }
      case 'signature':
        return (
          <div className="pt-4 pb-2">
            {/* Only claim "Completed" when a signature actually exists —
                previously this rendered the green check unconditionally. */}
            {data.signature.signatureData || data.signature.signatureFile ? (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                <Check className="w-4 h-4 text-[#9FE870]" />
                <span>Signature Completed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-700 mb-3">
                <AlertCircle className="w-4 h-4" />
                <span>No signature added yet</span>
              </div>
            )}
            {data.signature.signatureData && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white mb-3">
                <img
                  src={data.signature.signatureData}
                  alt="Your signature"
                  className="max-h-20 object-contain"
                />
              </div>
            )}
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline text-sm"
            >
              Edit information
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Final review fix (IMPORTANT 5): bAV/private claimants get the VBL-24/25
  // "lump-sum settlement" copy instead of the refund-flavored copy, matching
  // Get-Started/Private-Flow/VBL-24.png and VBL-25.png. Those two screenshots
  // disagree on the heading and button label between the enabled (VBL-24)
  // and disabled (VBL-25) states — VBL-24: heading "Review your bAV cash-out
  // request", button "Submit lump-sum settlement request →"; VBL-25:
  // heading "Review your lump-sum settlement request", button "Submit bAV
  // cash-out request →". Per the final-review triage note, VBL-24's
  // enabled-state wording is used for both states here (documented once,
  // rather than swapping copy when the button becomes enabled/disabled).
  const reviewHeading = isPrivatePensionType
    ? 'Review your bAV cash-out request'
    : 'Review your refund request';
  const reviewIntro = isPrivatePensionType
    ? 'Please review your information carefully before submitting your bAV cash-out request.'
    : 'Please review your information before submitting your refund request.';
  const submitButtonLabel = isPrivatePensionType
    ? 'Submit lump-sum settlement request'
    : 'Submit claim';
  const infoBoxText = isPrivatePensionType
    ? 'The information confirmed here will be used in the official lump-sum settlement request submitted to the pension provider.'
    : null;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        {reviewHeading}
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">{reviewIntro}</p>

      {/* Accordion Sections */}
      <div className="space-y-3 mb-8">
        {reviewSections.map((section) => {
          // Task 15 (VBL-25): the Health insurance section auto-expands and
          // gets red-highlighted styling + an inline error label while
          // incomplete, instead of the default green accordion look.
          const isComplete = isSectionComplete(section.subStep);
          const isIncompleteHealthInsurance =
            section.id === 'health-insurance' && !isComplete;
          const isExpanded =
            expandedSections.has(section.id) || isIncompleteHealthInsurance;

          return (
            <div
              key={section.id}
              className={`rounded-xl overflow-hidden border ${
                isIncompleteHealthInsurance
                  ? 'border-red-300 bg-red-50'
                  : 'border-[#9FE870] bg-[#F0FDE4]'
              }`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isIncompleteHealthInsurance
                        ? 'bg-red-200 text-red-700'
                        : 'bg-[#9FE870] text-[#163300]'
                    }`}
                  >
                    {section.icon}
                  </div>
                  <span
                    className={`font-semibold ${
                      isIncompleteHealthInsurance
                        ? 'text-red-700'
                        : 'text-[#163300]'
                    }`}
                  >
                    {section.title}
                  </span>
                  {isIncompleteHealthInsurance && (
                    <span className="flex items-center gap-1 text-sm font-medium text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Health insurance confirmation required
                    </span>
                  )}
                </div>
                <div
                  className={
                    isIncompleteHealthInsurance
                      ? 'text-red-600'
                      : 'text-[#9FE870]'
                  }
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-5 pb-4">{renderSectionContent(section)}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Banner — bAV/private only (IMPORTANT 5, VBL-24/25) */}
      {infoBoxText && (
        <div className="mb-4 bg-[#F0FDE4] rounded-lg p-4 text-sm text-[#163300]">
          {infoBoxText}
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Primary Button.
          - onContinue provided (public/stage confirm flow): advance to the
            Confirm step; Review is no longer terminal, so no submit here.
          - otherwise (legacy / bAV): submit the claim.
          Task 15 (VBL-25): disabled while the bAV/private Health insurance
          section is incomplete — type + (document OR provider name) must be
          present, mirrored from isHealthInsuranceComplete in
          OnboardingContext.tsx via canProceedFromSubStep. */}
      {onContinue ? (
        <button
          onClick={onContinue}
          className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors"
        >
          Continue to confirmation
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (isPrivatePensionType && !isSectionComplete('health-insurance'))
          }
          className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-[#163300] border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {submitButtonLabel}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ReviewSubmit;
