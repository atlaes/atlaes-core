'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, FileText, CheckCircle } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import { useClaimQuery, useClaimDocumentsQuery, useCompleteStepMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { ClaimStepName } from '@/lib/claims-api';

interface AccordionSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  isComplete: boolean;
  children: React.ReactNode;
}

function AccordionSection({
  title,
  isExpanded,
  onToggle,
  onEdit,
  isComplete,
  children,
}: AccordionSectionProps) {
  return (
    <div className={`claims-accordion-section ${isExpanded ? 'expanded' : ''}`}>
      <button type="button" className="claims-accordion-header" onClick={onToggle}>
        <div className="claims-accordion-header-left">
          {isComplete ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <div className="claims-accordion-incomplete" />
          )}
          <span className="claims-accordion-title">{title}</span>
        </div>
        <div className="claims-accordion-header-right">
          <button
            type="button"
            className="claims-accordion-edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>
      {isExpanded && <div className="claims-accordion-content">{children}</div>}
    </div>
  );
}

interface ReviewInformationProps {
  claimId: string;
}

export default function ReviewInformation({ claimId }: ReviewInformationProps) {
  const { data: claim } = useClaimQuery(claimId);
  const { data: documents } = useClaimDocumentsQuery(claimId);
  const completeMutation = useCompleteStepMutation();
  const { goToStep, goToNextStep } = useClaimsStore();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['personal', 'address', 'german', 'bank'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleEdit = (step: ClaimStepName) => {
    goToStep(step);
  };

  const handleContinue = async () => {
    await completeMutation.mutateAsync({ claimId, stepName: 'reviewInformation' });
    goToNextStep();
  };

  const isSubmitting = completeMutation.isPending;

  const formatAddress = (address: { addressLine1?: string; city?: string; postalCode?: string; country?: string } | null | undefined) => {
    if (!address) return 'Not provided';
    const parts = [address.addressLine1, address.city, address.postalCode, address.country].filter(Boolean);
    return parts.join(', ') || 'Not provided';
  };

  const formatGermanAddress = (address: { streetAddress?: string; city?: string; postalCode?: string } | null | undefined) => {
    if (!address) return 'Not provided';
    const parts = [address.streetAddress, address.city, address.postalCode].filter(Boolean);
    return parts.join(', ') || 'Not provided';
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAuthority = (authority: string | null | undefined) => {
    if (!authority) return 'Not selected';
    const labels: Record<string, string> = {
      notary_public: 'Notary Public',
      local_government: 'Local Government Office',
      bank_branch: 'Bank Branch',
      police: 'Police Station',
      embassy: 'German Embassy/Consulate',
      justice_of_peace: 'Justice of the Peace',
    };
    return labels[authority] || authority;
  };

  const formatAbmeldungMethod = (method: string | null | undefined) => {
    if (!method) return 'Not selected';
    const labels: Record<string, string> = {
      uploaded: 'Document uploaded',
      manual: 'Will obtain manually',
      service_requested: 'Service requested (+€50)',
    };
    return labels[method] || method;
  };

  const getDocument = (role: string) => {
    return documents?.find((doc) => doc.documentRole === role);
  };

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="reviewInformation"
      title="Review Your Information"
      description="Please review all the information you've provided. Click 'Edit' to make changes to any section."
      canContinue={!isSubmitting}
      onContinue={handleContinue}
      continueText="Continue to Confirmation"
    >
      <div className="claims-review-section">
        {/* Personal Information */}
        <AccordionSection
          title="Personal Information"
          isExpanded={expandedSections.has('personal')}
          onToggle={() => toggleSection('personal')}
          onEdit={() => handleEdit('claimType')}
          isComplete={!!claim?.claimType}
        >
          <div className="claims-review-grid">
            <div className="claims-review-item">
              <span className="claims-review-label">Claim Type</span>
              <span className="claims-review-value">
                {claim?.claimType === 'own_refund'
                  ? 'Own pension refund'
                  : claim?.claimType === 'surviving_spouse'
                  ? 'Surviving spouse claim'
                  : 'Not selected'}
              </span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Passport</span>
              <span className="claims-review-value">
                {getDocument('passport') ? (
                  <span className="claims-review-file">
                    <FileText className="w-4 h-4" />
                    {getDocument('passport')?.fileName}
                  </span>
                ) : (
                  'Not uploaded'
                )}
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* Current Address */}
        <AccordionSection
          title="Current Address"
          isExpanded={expandedSections.has('address')}
          onToggle={() => toggleSection('address')}
          onEdit={() => handleEdit('currentAddress')}
          isComplete={!!claim?.currentAddress?.addressLine1}
        >
          <div className="claims-review-grid">
            <div className="claims-review-item full-width">
              <span className="claims-review-label">Address</span>
              <span className="claims-review-value">{formatAddress(claim?.currentAddress)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Last Address in Germany */}
        <AccordionSection
          title="Last Address in Germany"
          isExpanded={expandedSections.has('german')}
          onToggle={() => toggleSection('german')}
          onEdit={() => handleEdit('lastAddressInGermany')}
          isComplete={!!claim?.lastGermanAddress?.streetAddress}
        >
          <div className="claims-review-grid">
            <div className="claims-review-item">
              <span className="claims-review-label">German Address</span>
              <span className="claims-review-value">{formatGermanAddress(claim?.lastGermanAddress)}</span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Move-out Date</span>
              <span className="claims-review-value">{formatDate(claim?.moveOutDate)}</span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Abmeldung</span>
              <span className="claims-review-value">{formatAbmeldungMethod(claim?.abmeldungMethod)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Social Insurance */}
        <AccordionSection
          title="Social Insurance Information"
          isExpanded={expandedSections.has('insurance')}
          onToggle={() => toggleSection('insurance')}
          onEdit={() => handleEdit('germanSocialInsurance')}
          isComplete={true} // Optional step
        >
          <div className="claims-review-grid">
            <div className="claims-review-item">
              <span className="claims-review-label">SV-Nummer</span>
              <span className="claims-review-value">
                {claim?.germanSocialInsuranceNumber || 'Not provided (optional)'}
              </span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Payslip</span>
              <span className="claims-review-value">
                {getDocument('payslip') ? (
                  <span className="claims-review-file">
                    <FileText className="w-4 h-4" />
                    {getDocument('payslip')?.fileName}
                  </span>
                ) : (
                  'Not uploaded (optional)'
                )}
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* Bank Details */}
        <AccordionSection
          title="Bank Details"
          isExpanded={expandedSections.has('bank')}
          onToggle={() => toggleSection('bank')}
          onEdit={() => handleEdit('bankDetails')}
          isComplete={!!claim?.bankDetails?.accountHolderName}
        >
          <div className="claims-review-grid">
            <div className="claims-review-item">
              <span className="claims-review-label">Currency</span>
              <span className="claims-review-value">{claim?.preferredCurrency || 'Not selected'}</span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Account Holder</span>
              <span className="claims-review-value">
                {claim?.bankDetails?.accountHolderName || 'Not provided'}
              </span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Bank</span>
              <span className="claims-review-value">{claim?.bankDetails?.bankName || 'Not provided'}</span>
            </div>
            {claim?.bankDetails?.iban && (
              <div className="claims-review-item">
                <span className="claims-review-label">IBAN</span>
                <span className="claims-review-value">{claim.bankDetails.iban}</span>
              </div>
            )}
            {claim?.bankDetails?.bsb && (
              <div className="claims-review-item">
                <span className="claims-review-label">BSB</span>
                <span className="claims-review-value">{claim.bankDetails.bsb}</span>
              </div>
            )}
            {claim?.bankDetails?.accountNumber && (
              <div className="claims-review-item">
                <span className="claims-review-label">Account Number</span>
                <span className="claims-review-value">{claim.bankDetails.accountNumber}</span>
              </div>
            )}
            {claim?.bankDetails?.swiftBic && (
              <div className="claims-review-item">
                <span className="claims-review-label">SWIFT/BIC</span>
                <span className="claims-review-value">{claim.bankDetails.swiftBic}</span>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Signature */}
        <AccordionSection
          title="Signature"
          isExpanded={expandedSections.has('signature')}
          onToggle={() => toggleSection('signature')}
          onEdit={() => handleEdit('signDocuments')}
          isComplete={!!claim?.signatureAuthority}
        >
          <div className="claims-review-grid">
            <div className="claims-review-item">
              <span className="claims-review-label">Certifying Authority</span>
              <span className="claims-review-value">{formatAuthority(claim?.signatureAuthority)}</span>
            </div>
          </div>
        </AccordionSection>

        {/* Identity Verification */}
        <AccordionSection
          title="Identity Confirmation Form"
          isExpanded={expandedSections.has('identity')}
          onToggle={() => toggleSection('identity')}
          onEdit={() => handleEdit('identityConfirmationForm')}
          isComplete={!!getDocument('certified_id_form')}
        >
          <div className="claims-review-grid">
            <div className="claims-review-item">
              <span className="claims-review-label">Certifying Authority</span>
              <span className="claims-review-value">{formatAuthority(claim?.idVerificationAuthority)}</span>
            </div>
            <div className="claims-review-item">
              <span className="claims-review-label">Certified Form</span>
              <span className="claims-review-value">
                {getDocument('certified_id_form') ? (
                  <span className="claims-review-file">
                    <FileText className="w-4 h-4" />
                    {getDocument('certified_id_form')?.fileName}
                  </span>
                ) : (
                  'Not uploaded'
                )}
              </span>
            </div>
          </div>
        </AccordionSection>
      </div>
    </ClaimsStepContainer>
  );
}
