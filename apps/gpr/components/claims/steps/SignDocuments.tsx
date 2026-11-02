'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, Info } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import AuthoritySelector from '../AuthoritySelector';
import ErrorNotice from '../ErrorNotice';
import {
  SignaturePad,
  type SignaturePadHandle,
} from '@/components/account/payout/SignaturePad';
import {
  useClaimQuery,
  useUpdateClaimMutation,
  useCompleteStepMutation,
  useSignClaimMutation,
  useSignatureQuery,
} from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { CertifyingAuthority } from '@/lib/claims-api';
import { apiErrorMessage } from '@/lib/api';

// The old first sub-step offered form A1002 for download; the backend has
// no customer PDF for a GPR claim, so the step now captures the signature
// itself (POST /signatures/upload → POST /claims/:id/signature).
type SubStep = 'sign' | 'authority' | 'confirm';

const SUB_STEPS: { id: SubStep; title: string }[] = [
  { id: 'sign', title: 'Your Signature' },
  { id: 'authority', title: 'Select Authority' },
  { id: 'confirm', title: 'Confirm' },
];

const AUTHORITY_LABELS: Record<CertifyingAuthority, string> = {
  notary_public: 'Notary Public',
  local_government: 'Local Government Office',
  bank_branch: 'Bank Branch',
  police: 'Police Station',
  embassy: 'German Embassy or Consulate',
  justice_of_peace: 'Justice of the Peace',
};

function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface SignDocumentsProps {
  claimId: string;
}

export default function SignDocuments({ claimId }: SignDocumentsProps) {
  const { data: claim } = useClaimQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const signMutation = useSignClaimMutation();
  const { data: savedSignature } = useSignatureQuery(claim?.signatureId);
  const { goToNextStep, goToPreviousStep } = useClaimsStore();

  const pad = useRef<SignaturePadHandle>(null);
  const [hasInk, setHasInk] = useState(false);
  // Draw a new signature although one is saved on the claim.
  const [redraw, setRedraw] = useState(false);
  const [currentSubStep, setCurrentSubStep] = useState<SubStep>('sign');
  const [selectedAuthority, setSelectedAuthority] =
    useState<CertifyingAuthority | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize from claim data
  useEffect(() => {
    if (claim?.signatureAuthority) {
      setSelectedAuthority(claim.signatureAuthority);
    }
  }, [claim?.signatureAuthority]);

  const hasSavedSignature = !!claim?.signatureId;
  const showPad = !hasSavedSignature || redraw;
  const savedOn = formatDate(
    savedSignature?.createdAt ?? claim?.signatureCompletedAt
  );

  const currentSubStepIndex = SUB_STEPS.findIndex(
    (s) => s.id === currentSubStep
  );

  const goToSubStep = (step: SubStep) => {
    setError(null);
    setCurrentSubStep(step);
  };

  const handleSubStepNext = () => {
    const nextIndex = currentSubStepIndex + 1;
    if (nextIndex < SUB_STEPS.length) {
      goToSubStep(SUB_STEPS[nextIndex].id);
    }
  };

  const handleSubStepBack = () => {
    const prevIndex = currentSubStepIndex - 1;
    if (prevIndex >= 0) {
      goToSubStep(SUB_STEPS[prevIndex].id);
    } else {
      goToPreviousStep();
    }
  };

  const handleClear = () => {
    pad.current?.clear();
    setError(null);
  };

  // Export the drawing as PNG, store it, attach it to the claim.
  const handleSaveSignature = async () => {
    const signatureData = pad.current?.toDataUrl();
    if (!signatureData) {
      setError('Please draw your signature before continuing.');
      return;
    }
    setError(null);
    try {
      await signMutation.mutateAsync({ claimId, signatureData });
      setRedraw(false);
      setHasInk(false);
      goToSubStep('authority');
    } catch (err) {
      setError(
        apiErrorMessage(err, 'Could not save your signature. Please try again.')
      );
    }
  };

  const handleSignNext = () => {
    if (showPad) {
      void handleSaveSignature();
    } else {
      handleSubStepNext();
    }
  };

  const handleContinue = async () => {
    if (!selectedAuthority || !hasSavedSignature) return;
    setError(null);

    try {
      await updateMutation.mutateAsync({
        claimId,
        data: { signatureAuthority: selectedAuthority },
      });

      await completeMutation.mutateAsync({
        claimId,
        stepName: 'signDocuments',
      });
      goToNextStep();
    } catch (err) {
      setError(
        apiErrorMessage(err, 'Could not save this step. Please try again.')
      );
    }
  };

  const isSaving = signMutation.isPending;
  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  const renderSubStepContent = () => {
    switch (currentSubStep) {
      case 'sign':
        return (
          <div className="claims-sign-download">
            <div className="claims-info-box">
              <Info className="w-5 h-5 text-blue-500" />
              <p>
                We place your signature on the refund application documents we
                prepare for you. Sign the way you signed your passport, using
                your finger, a stylus or the mouse.
              </p>
            </div>

            {showPad ? (
              <div className="claims-sig-block">
                <div className="claims-sig-head">
                  <span>Draw your signature</span>
                  <button
                    type="button"
                    className="claims-sig-clear"
                    onClick={handleClear}
                    disabled={!hasInk || isSaving}
                  >
                    Clear
                  </button>
                </div>
                <SignaturePad
                  ref={pad}
                  classPrefix="claims-sig"
                  label="Signature pad"
                  hint="Sign here with your finger, a stylus or the mouse"
                  onChange={setHasInk}
                />
                {hasSavedSignature ? (
                  <button
                    type="button"
                    className="claims-sig-clear"
                    onClick={() => {
                      setRedraw(false);
                      setError(null);
                    }}
                    disabled={isSaving}
                  >
                    Keep my saved signature instead
                  </button>
                ) : (
                  <p className="claims-sig-note">
                    You can clear the pad and sign again until you are happy
                    with it.
                  </p>
                )}
              </div>
            ) : (
              <div className="claims-sig-saved">
                {savedSignature?.downloadUrl ? (
                  // Presigned S3 URL, not an optimisable asset.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={savedSignature.downloadUrl}
                    alt="Your saved signature"
                  />
                ) : null}
                <div className="claims-sig-saved-meta">
                  <span>
                    <strong>Signature saved</strong>
                    {savedOn ? ` on ${savedOn}` : ''}
                  </span>
                  <button
                    type="button"
                    className="claims-sig-clear"
                    onClick={() => setRedraw(true)}
                  >
                    Draw a new signature
                  </button>
                </div>
              </div>
            )}

            <ErrorNotice message={error} />

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
                disabled={isSaving}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSignNext}
                className="claims-btn claims-btn-primary"
                disabled={(showPad && !hasInk) || isSaving}
              >
                <span>
                  {isSaving ? 'Saving...' : showPad ? 'Save signature' : 'Next'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'authority':
        return (
          <div className="claims-sign-authority">
            <h3>Where will you get your signature certified?</h3>
            <p className="claims-section-description">
              Your signature must be witnessed and certified by an authorized
              official. Select where you plan to get this done.
            </p>

            <AuthoritySelector
              value={selectedAuthority}
              onChange={setSelectedAuthority}
            />

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubStepNext}
                className="claims-btn claims-btn-primary"
                disabled={!selectedAuthority}
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="claims-sign-confirm">
            <div className="claims-info-box">
              <Info className="w-5 h-5 text-blue-500" />
              <p>
                In the next step (Identity Verification) you have your identity
                confirmation form certified by the authority you chose and
                upload it here.
              </p>
            </div>

            <div className="claims-confirm-summary">
              <h4>Your selection:</h4>
              <p>
                Signature:{' '}
                <strong>{hasSavedSignature ? 'saved' : 'missing'}</strong>
              </p>
              <p>
                You will get your signature certified at a{' '}
                <strong>
                  {selectedAuthority
                    ? AUTHORITY_LABELS[selectedAuthority]
                    : '—'}
                </strong>
              </p>
            </div>

            <ErrorNotice message={error} />

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="claims-btn claims-btn-primary"
                disabled={
                  !selectedAuthority || !hasSavedSignature || isSubmitting
                }
              >
                <span>{isSubmitting ? 'Saving...' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="signDocuments"
      title="Sign Documents"
      description="Draw your signature and tell us where you will have it certified."
      hideContinue
      hideBack
    >
      <div className="claims-sign-section">
        {/* Sub-step progress */}
        <div className="claims-substep-progress">
          {SUB_STEPS.map((step, index) => {
            const isActive = step.id === currentSubStep;
            const isComplete = index < currentSubStepIndex;

            return (
              <div
                key={step.id}
                className={`claims-substep-item ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
              >
                <div className="claims-substep-number">
                  {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className="claims-substep-title">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Sub-step content */}
        {renderSubStepContent()}
      </div>
    </ClaimsStepContainer>
  );
}
