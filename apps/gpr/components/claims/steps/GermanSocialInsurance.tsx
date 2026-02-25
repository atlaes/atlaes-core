'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import DocumentUpload from '../DocumentUpload';
import { useClaimQuery, useClaimDocumentsQuery, useUpdateClaimMutation, useCompleteStepMutation, useUploadDocumentMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';

interface GermanSocialInsuranceProps {
  claimId: string;
}

export default function GermanSocialInsurance({ claimId }: GermanSocialInsuranceProps) {
  const { data: claim } = useClaimQuery(claimId);
  const { data: documents } = useClaimDocumentsQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const uploadMutation = useUploadDocumentMutation();
  const { goToNextStep } = useClaimsStore();

  const [svNumber, setSvNumber] = useState('');
  const [showPayslipUpload, setShowPayslipUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize from claim data
  useEffect(() => {
    if (claim?.germanSocialInsuranceNumber) {
      setSvNumber(claim.germanSocialInsuranceNumber);
    }
  }, [claim?.germanSocialInsuranceNumber]);

  // Find existing payslip document
  const payslipDoc = documents?.find((doc) => doc.documentRole === 'payslip');

  const handleUploadPayslip = async (file: File) => {
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({ claimId, file, role: 'payslip' });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      throw error;
    }
  };

  const handleContinue = async () => {
    // Save SV number if provided
    if (svNumber.trim()) {
      await updateMutation.mutateAsync({
        claimId,
        data: { germanSocialInsuranceNumber: svNumber.trim() }
      });
    }
    await completeMutation.mutateAsync({ claimId, stepName: 'germanSocialInsurance' });
    goToNextStep();
  };

  const handleSvNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow alphanumeric input, spaces, and format as user types
    const value = e.target.value.toUpperCase();
    setSvNumber(value);
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="germanSocialInsurance"
      title="German Social Insurance Number"
      description="Enter your German Social Insurance Number (optional)."
      canContinue={!isSubmitting}
      onContinue={handleContinue}
    >
      <div className="claims-form">
        <div className="claims-form-group">
          <label htmlFor="svNumber" className="claims-label">
            German Social Insurance Number (SV-Nummer)
          </label>
          <input
            type="text"
            id="svNumber"
            value={svNumber}
            onChange={handleSvNumberChange}
            placeholder="e.g. 12 345678 A 012"
            className="claims-input"
            disabled={isSubmitting}
          />
          <span className="claims-help-text">
            If unavailable, the Pension Office may need more time to locate your pension record.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowPayslipUpload(!showPayslipUpload)}
          className="claims-expandable-link"
          disabled={isSubmitting}
        >
          <span className="claims-expandable-link-text">
            Optional: Upload a recent German payslip
          </span>
          {showPayslipUpload ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showPayslipUpload && (
          <div className="claims-upload-section">
            <DocumentUpload
              label="Upload payslip"
              helperText="Your SV number is usually in the top section"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentFile={
                payslipDoc?.fileName ? { name: payslipDoc.fileName, url: payslipDoc.fileUrl } : null
              }
              onUpload={handleUploadPayslip}
              onRemove={() => {
                // TODO: Implement document removal
              }}
              isUploading={uploadMutation.isPending}
              error={uploadError || undefined}
            />
          </div>
        )}
      </div>
    </ClaimsStepContainer>
  );
}
