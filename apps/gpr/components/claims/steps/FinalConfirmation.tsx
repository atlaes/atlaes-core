'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import SuccessModal from '../SuccessModal';
import { useClaimQuery, useSubmitClaimMutation } from '@/lib/queries/claims-queries';

interface FinalConfirmationProps {
  claimId: string;
}

export default function FinalConfirmation({ claimId }: FinalConfirmationProps) {
  const { data: claim } = useClaimQuery(claimId);
  const submitMutation = useSubmitClaimMutation();

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [confirmAuthorization, setConfirmAuthorization] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isSubmitting = submitMutation.isPending;
  const canSubmit = confirmAccuracy && confirmAuthorization && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitError(null);

    try {
      await submitMutation.mutateAsync(claimId);
      setShowSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit claim. Please try again.');
    }
  };

  return (
    <>
      <ClaimsStepContainer
        claimId={claimId}
        stepName="finalConfirmation"
        title="Final Confirmation"
        description="Please review and confirm the statements below to submit your claim."
        hideContinue
      >
        <div className="claims-confirmation-section">
          {submitError && (
            <div className="claims-error-banner">
              <AlertCircle className="w-5 h-5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="claims-confirmation-checkboxes">
            <label className="claims-checkbox-label">
              <input
                type="checkbox"
                checked={confirmAccuracy}
                onChange={(e) => setConfirmAccuracy(e.target.checked)}
                className="claims-checkbox"
                disabled={isSubmitting}
              />
              <div className="claims-checkbox-custom">
                {confirmAccuracy && (
                  <svg className="claims-checkbox-check" viewBox="0 0 12 12">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </div>
              <span className="claims-checkbox-text">
                I confirm that all information I provided is accurate and complete to the best of my knowledge.
              </span>
            </label>

            <label className="claims-checkbox-label">
              <input
                type="checkbox"
                checked={confirmAuthorization}
                onChange={(e) => setConfirmAuthorization(e.target.checked)}
                className="claims-checkbox"
                disabled={isSubmitting}
              />
              <div className="claims-checkbox-custom">
                {confirmAuthorization && (
                  <svg className="claims-checkbox-check" viewBox="0 0 12 12">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </div>
              <span className="claims-checkbox-text">
                I authorize ATLAES GmbH to prepare my pension refund application and share the required
                documents with Vividus Rechtsanwälte for legal review and submission to the German
                pension authorities.
              </span>
            </label>
          </div>

          <div className="claims-submit-section">
            <button
              type="button"
              onClick={handleSubmit}
              className="claims-btn claims-btn-primary claims-btn-lg"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit my claim</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            <p className="claims-submit-note">
              By submitting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </ClaimsStepContainer>

      {showSuccess && (
        <SuccessModal
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}
