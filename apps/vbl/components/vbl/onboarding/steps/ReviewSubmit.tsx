'use client';

import React, { useState } from 'react';
import { ArrowRight, User, CreditCard as CardIcon, MapPin, Landmark, PenTool, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useOnboarding, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import {
  createClaim,
  updateClaim,
  attachDocument,
  attachSignatureToClaim,
  submitClaim,
  markStepComplete,
} from '@/lib/onboarding-api';

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

interface ReviewSection {
  id: string;
  title: string;
  subStep: SubmitDetailsSubStep;
  icon: React.ReactNode;
}

const REVIEW_SECTIONS: ReviewSection[] = [
  { id: 'personal', title: 'Personal information', subStep: 'identity', icon: <User className="w-5 h-5" /> },
  { id: 'address', title: 'Address', subStep: 'address', icon: <MapPin className="w-5 h-5" /> },
  { id: 'membership', title: 'Membership', subStep: 'membership', icon: <CardIcon className="w-5 h-5" /> },
  { id: 'bank', title: 'Bank details', subStep: 'bank-details', icon: <Landmark className="w-5 h-5" /> },
  { id: 'signature', title: 'Signature', subStep: 'signature', icon: <PenTool className="w-5 h-5" /> },
];

interface ReviewSubmitProps {
  onSubmitSuccess?: () => void;
  onEditSection?: (subStep: SubmitDetailsSubStep) => void;
}

export const ReviewSubmit: React.FC<ReviewSubmitProps> = ({ onSubmitSuccess, onEditSection }) => {
  const { data, updateData, updateSuccessData, setCurrentSubStep, canProceedFromSubStep } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
      // 1. Create claim
      const claimResult = await createClaim();
      const claimId = claimResult.claim.id;
      updateData({ claimId });

      // 2. Update claim with all collected data
      // Prefer OCR-extracted first/last over splitting fullName
      const firstName = data.identity.firstName || data.identity.fullName.trim().split(/\s+/)[0] || '';
      const lastName = data.identity.lastName || data.identity.fullName.trim().split(/\s+/).slice(1).join(' ') || '';

      await updateClaim(claimId, {
        claimType: 'own_refund',
        firstName,
        lastName,
        dateOfBirth: data.identity.dateOfBirth || undefined,
        gender: data.identity.gender || undefined,
        passportNumber: data.identity.passportNumber || undefined,
        nationality: data.identity.nationality || undefined,
        placeOfBirth: data.identity.placeOfBirth || undefined,
        passportIssueDate: data.identity.passportIssueDate || undefined,
        passportExpiryDate: data.identity.passportExpiryDate || undefined,
        currentAddressLine1: data.address.streetAndNumber,
        currentPostalCode: data.address.postalCode,
        currentCity: data.address.city,
        currentCountry: data.address.country,
        iban: data.bankDetails.iban || undefined,
        accountHolderName: data.bankDetails.accountHolder || undefined,
      });

      // 3. Attach document (passport) if uploaded
      if (data.documentId) {
        await attachDocument(claimId, data.documentId, 'passport');
      }

      // 4. Attach signature if uploaded
      if (data.signatureId) {
        await attachSignatureToClaim(claimId, data.signatureId);
      }

      // 5. Mark VBL-relevant steps as complete
      await Promise.all([
        markStepComplete(claimId, 'claimType'),
        markStepComplete(claimId, 'passportUpload'),
        markStepComplete(claimId, 'currentAddress'),
        markStepComplete(claimId, 'signDocuments'),
        markStepComplete(claimId, 'reviewInformation'),
        markStepComplete(claimId, 'finalConfirmation'),
      ]);

      // 6. Submit claim
      const submitResult = await submitClaim(claimId);

      // Update success data with real submission info
      updateSuccessData({
        submissionId: submitResult.claim.id,
        submittedAt: submitResult.claim.submittedAt as string || new Date().toISOString(),
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit claim. Please try again.'
      );
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
              <span className="text-gray-500">Name:</span> {data.identity.fullName || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Date of birth:</span> {formatDate(data.identity.dateOfBirth) || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Gender:</span> {GENDER_LABELS[data.identity.gender] || 'Not provided'}
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
          <div className="space-y-1 text-sm pt-4 pb-2">
            <p className="text-gray-700">{data.address.streetAndNumber || 'Not provided'}</p>
            <p className="text-gray-700">
              {data.address.postalCode} {data.address.city}
            </p>
            <p className="text-gray-700">{COUNTRY_LABELS[data.address.country] || data.address.country}</p>
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
              <span className="text-gray-500">Scheme:</span> {data.membership.pensionProvider || 'Not provided'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Membership number:</span> {data.membership.membershipNumber || 'Not provided'}
            </p>
            <button
              onClick={() => handleEditSection(section.subStep)}
              className="text-[#163300] font-medium hover:underline mt-2"
            >
              Edit information
            </button>
          </div>
        );
      case 'bank':
        return (
          <div className="space-y-2 text-sm pt-4 pb-2">
            {data.bankDetails.accountHolder && (
              <p className="text-gray-700">
                <span className="text-gray-500">Account holder:</span> {data.bankDetails.accountHolder}
              </p>
            )}
            {data.bankDetails.iban ? (
              <p className="text-gray-700">
                <span className="text-gray-500">IBAN:</span> {data.bankDetails.iban}
              </p>
            ) : (
              <p className="text-gray-700">
                {data.bankDetails.accountOption === 'open_free_account' && 'Will open free EUR account'}
                {data.bankDetails.accountOption === 'trusted_third_party' && 'Using third-party account'}
                {data.bankDetails.accountOption === 'add_later' && 'Will add IBAN later'}
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
      case 'signature':
        return (
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <Check className="w-4 h-4 text-[#9FE870]" />
              <span>Signature Completed</span>
            </div>
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

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Review your claim
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Please review your information before submitting your refund claim.
      </p>

      {/* Accordion Sections */}
      <div className="space-y-3 mb-8">
        {REVIEW_SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const isComplete = isSectionComplete(section.subStep);

          return (
            <div
              key={section.id}
              className="border border-[#9FE870] rounded-xl overflow-hidden bg-[#F0FDE4]"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center text-[#163300]">
                    {section.icon}
                  </div>
                  <span className="font-semibold text-[#163300]">{section.title}</span>
                </div>
                <div className="text-[#9FE870]">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  {renderSectionContent(section)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-[#163300] border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            Submit Refund Claim
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};

export default ReviewSubmit;
