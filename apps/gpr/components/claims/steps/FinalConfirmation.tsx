'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ClaimsStepContainer from '../ClaimsStepContainer';
import SuccessModal from '../SuccessModal';
import ErrorNotice from '../ErrorNotice';
import {
  claimsKeys,
  useClaimQuery,
  useCompleteStepMutation,
  useSubmitClaimMutation,
  useUpdateClaimMutation,
} from '@/lib/queries/claims-queries';
import claimsApi, { Claim } from '@/lib/claims-api';
import { apiErrorMessage, httpStatus } from '@/lib/api';

const VALIDATION_PREFIX = 'Claim validation failed: ';

interface SubmitError {
  message: string;
  /** The missing items the backend listed, one per line. */
  items: string[];
}

/** A submit rejection: the backend lists what is still missing. */
function describeSubmitError(error: unknown): SubmitError {
  const message = apiErrorMessage(
    error,
    'Failed to submit claim. Please try again.'
  );
  if (!message.startsWith(VALIDATION_PREFIX)) return { message, items: [] };
  const items = message
    .slice(VALIDATION_PREFIX.length)
    .split(', ')
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    message: 'Your claim cannot be submitted yet. Please go back and complete:',
    items,
  };
}

interface FinalConfirmationProps {
  claimId: string;
}

export default function FinalConfirmation({ claimId }: FinalConfirmationProps) {
  const queryClient = useQueryClient();
  const { data: claim } = useClaimQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const submitMutation = useSubmitClaimMutation();

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [confirmAuthorization, setConfirmAuthorization] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [submitted, setSubmitted] = useState<Claim | null>(null);

  // Boxes ticked on an earlier visit stay ticked.
  useEffect(() => {
    if (claim?.confirmationAccuracyAccepted) setConfirmAccuracy(true);
    if (claim?.confirmationAuthorizationAccepted) setConfirmAuthorization(true);
  }, [
    claim?.confirmationAccuracyAccepted,
    claim?.confirmationAuthorizationAccepted,
  ]);

  const canSubmit = confirmAccuracy && confirmAuthorization && !isSubmitting;

  /**
   * After a failed call: a claim that is no longer a draft was submitted
   * earlier (lost response, second tab) — the backend answers a repeat
   * submit with 409 and the PUT before it with 400. Shows the success
   * pop-up with the fresh claim; false when it is still a draft or the
   * refetch failed.
   */
  const settleAlreadySubmitted = async (): Promise<boolean> => {
    try {
      const fresh = await claimsApi.getClaim(claimId);
      if (fresh.status === 'draft') return false;
      setSubmitted(fresh);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // One submission at a time: the button stays disabled until this settles.
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // The backend checks both flags and the step itself on submit.
      await updateMutation.mutateAsync({
        claimId,
        data: {
          confirmationAccuracyAccepted: true,
          confirmationAuthorizationAccepted: true,
        },
      });
      await completeMutation.mutateAsync({
        claimId,
        stepName: 'finalConfirmation',
      });
      setSubmitted(await submitMutation.mutateAsync(claimId));
    } catch (error) {
      if (await settleAlreadySubmitted()) return;
      if (httpStatus(error) === 409) {
        // Submitted, but the refetch failed: let the page reload the claim.
        queryClient.invalidateQueries({ queryKey: claimsKeys.detail(claimId) });
      }
      setSubmitError(describeSubmitError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Closing the pop-up reveals the submitted claim (the wizard page then
  // shows its status instead of the form).
  const handleSuccessClose = () => {
    if (submitted) {
      queryClient.setQueryData(claimsKeys.detail(claimId), submitted);
    }
    setSubmitted(null);
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
          <ErrorNotice message={submitError?.message}>
            {submitError && submitError.items.length > 0 ? (
              <ul>
                {submitError.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </ErrorNotice>

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
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                )}
              </div>
              <span className="claims-checkbox-text">
                I confirm that all information I provided is accurate and
                complete to the best of my knowledge.
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
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                )}
              </div>
              <span className="claims-checkbox-text">
                I authorize ATLAES GmbH to prepare my pension refund application
                and share the required documents with Vividius Rechtsanwälte for
                legal review and submission to the German pension authorities.
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
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            <p className="claims-submit-note">
              By submitting, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </div>
      </ClaimsStepContainer>

      {submitted && <SuccessModal onClose={handleSuccessClose} />}
    </>
  );
}
