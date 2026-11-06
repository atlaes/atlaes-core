'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import DocumentUpload from '../DocumentUpload';
import {
  useClaimQuery,
  useClaimDocumentsQuery,
  useUpdateClaimMutation,
  useCompleteStepMutation,
  useUploadDocumentMutation,
  useRemoveDocumentMutation,
} from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { apiErrorMessage } from '@/lib/api';

interface GermanSocialInsuranceProps {
  claimId: string;
}

export default function GermanSocialInsurance({
  claimId,
}: GermanSocialInsuranceProps) {
  const { data: claim } = useClaimQuery(claimId);
  const { data: documents } = useClaimDocumentsQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const uploadMutation = useUploadDocumentMutation();
  const removeMutation = useRemoveDocumentMutation();
  const { goToNextStep } = useClaimsStore();

  const [svNumber, setSvNumber] = useState('');
  // Time paid into the German pension insurance. The DRV pack needs it
  // (from 60 months a Willenserklärung is added for non-agreement states);
  // an estimate is fine, the DRV checks it against its own record.
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [showPayslipUpload, setShowPayslipUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize from claim data
  useEffect(() => {
    if (claim?.germanSocialInsuranceNumber) {
      setSvNumber(claim.germanSocialInsuranceNumber);
    }
  }, [claim?.germanSocialInsuranceNumber]);

  useEffect(() => {
    const total = claim?.germanContributionMonths;
    if (typeof total === 'number' && total > 0) {
      setYears(String(Math.floor(total / 12)));
      setMonths(String(total % 12));
    }
  }, [claim?.germanContributionMonths]);

  const yearsNum = years === '' ? 0 : Number(years);
  const monthsNum = months === '' ? 0 : Number(months);
  const contributionMonths =
    Number.isInteger(yearsNum) &&
    Number.isInteger(monthsNum) &&
    yearsNum >= 0 &&
    yearsNum <= 50 &&
    monthsNum >= 0 &&
    monthsNum <= 11
      ? yearsNum * 12 + monthsNum
      : 0;
  const contributionValid = contributionMonths >= 1;

  // Find existing payslip document
  const payslipDoc = documents?.find((doc) => doc.documentRole === 'payslip');

  const handleUploadPayslip = async (file: File) => {
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({ claimId, file, role: 'payslip' });
    } catch (error) {
      setUploadError(apiErrorMessage(error, 'Upload failed'));
      throw error;
    }
  };

  // Detaches the file from the claim (DELETE /claims/:id/documents/:docId).
  const handleRemovePayslip = async () => {
    if (!payslipDoc) return;
    setUploadError(null);
    try {
      await removeMutation.mutateAsync({
        claimId,
        documentId: payslipDoc.documentId,
      });
    } catch (error) {
      setUploadError(apiErrorMessage(error, 'Could not remove the file'));
    }
  };

  const handleContinue = async () => {
    if (!contributionValid) return;
    await updateMutation.mutateAsync({
      claimId,
      data: {
        // Sent even when empty so a cleared number is cleared on the claim.
        germanSocialInsuranceNumber: svNumber.trim(),
        germanContributionMonths: contributionMonths,
      },
    });
    await completeMutation.mutateAsync({
      claimId,
      stepName: 'germanSocialInsurance',
    });
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
      title="German pension insurance"
      description="Tell us how long you paid into the German pension insurance and, if you have it, your social insurance number."
      canContinue={!isSubmitting && contributionValid}
      onContinue={handleContinue}
    >
      <div className="claims-form">
        <div className="claims-form-group">
          <span className="claims-label" id="contributionLabel">
            How long did you pay into the German pension insurance?
          </span>
          <div
            role="group"
            aria-labelledby="contributionLabel"
            style={{ display: 'flex', gap: '0.75rem' }}
          >
            <label style={{ flex: 1 }}>
              <span className="claims-help-text">Years</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="e.g. 3"
                className="claims-input"
                disabled={isSubmitting}
              />
            </label>
            <label style={{ flex: 1 }}>
              <span className="claims-help-text">Months</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="e.g. 6"
                className="claims-input"
                disabled={isSubmitting}
              />
            </label>
          </div>
          <span className="claims-help-text">
            Count every month you worked in Germany with pension contributions
            deducted from your salary. An estimate is fine.
          </span>
          {(years !== '' || months !== '') && !contributionValid && (
            <span className="claims-form-error">
              Enter at least one month (years up to 50, months 0 to 11).
            </span>
          )}
        </div>

        <div className="claims-form-group">
          <label htmlFor="svNumber" className="claims-label">
            German Social Insurance Number (SV-Nummer, optional)
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
            If unavailable, the Pension Office may need more time to locate your
            pension record.
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
                payslipDoc?.fileName
                  ? { name: payslipDoc.fileName, url: payslipDoc.fileUrl }
                  : null
              }
              onUpload={handleUploadPayslip}
              onRemove={handleRemovePayslip}
              isUploading={uploadMutation.isPending}
              disabled={removeMutation.isPending}
              error={uploadError || undefined}
            />
          </div>
        )}
      </div>
    </ClaimsStepContainer>
  );
}
