'use client';

import React, { useState, useEffect } from 'react';
import { Download, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, Info } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import AuthoritySelector from '../AuthoritySelector';
import { useClaimQuery, useUpdateClaimMutation, useCompleteStepMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { CertifyingAuthority } from '@/lib/claims-api';

type SubStep = 'download' | 'instructions' | 'authority' | 'confirm';

const SUB_STEPS: { id: SubStep; title: string }[] = [
  { id: 'download', title: 'Download Form' },
  { id: 'instructions', title: 'Instructions' },
  { id: 'authority', title: 'Select Authority' },
  { id: 'confirm', title: 'Confirm' },
];

interface SignDocumentsProps {
  claimId: string;
}

export default function SignDocuments({ claimId }: SignDocumentsProps) {
  const { data: claim } = useClaimQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const { goToNextStep, goToPreviousStep } = useClaimsStore();

  const [currentSubStep, setCurrentSubStep] = useState<SubStep>('download');
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [selectedAuthority, setSelectedAuthority] = useState<CertifyingAuthority | null>(null);

  // Initialize from claim data
  useEffect(() => {
    if (claim?.signatureAuthority) {
      setSelectedAuthority(claim.signatureAuthority);
    }
  }, [claim?.signatureAuthority]);

  const currentSubStepIndex = SUB_STEPS.findIndex((s) => s.id === currentSubStep);

  const handleDownload = () => {
    // In production, this would download the actual form
    // For now, simulate download
    const link = document.createElement('a');
    link.href = '/forms/A1002-pension-refund-application.pdf';
    link.download = 'A1002-pension-refund-application.pdf';
    link.click();
    setHasDownloaded(true);
  };

  const goToSubStep = (step: SubStep) => {
    setCurrentSubStep(step);
  };

  const handleSubStepNext = () => {
    const nextIndex = currentSubStepIndex + 1;
    if (nextIndex < SUB_STEPS.length) {
      setCurrentSubStep(SUB_STEPS[nextIndex].id);
    }
  };

  const handleSubStepBack = () => {
    const prevIndex = currentSubStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSubStep(SUB_STEPS[prevIndex].id);
    } else {
      goToPreviousStep();
    }
  };

  const handleContinue = async () => {
    if (!selectedAuthority) return;

    await updateMutation.mutateAsync({
      claimId,
      data: { signatureAuthority: selectedAuthority },
    });

    await completeMutation.mutateAsync({ claimId, stepName: 'signDocuments' });
    goToNextStep();
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  const renderSubStepContent = () => {
    switch (currentSubStep) {
      case 'download':
        return (
          <div className="claims-sign-download">
            <div className="claims-sign-form-card">
              <div className="claims-sign-form-icon">
                <Download className="w-8 h-8" />
              </div>
              <div className="claims-sign-form-info">
                <h3>Form A1002 - Pension Refund Application</h3>
                <p>This is the official German pension refund application form that needs to be signed.</p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="claims-btn claims-btn-primary"
              >
                <Download className="w-4 h-4" />
                <span>Download Form</span>
              </button>
            </div>

            {hasDownloaded && (
              <div className="claims-success-message">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Form downloaded successfully</span>
              </div>
            )}

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
                disabled={!hasDownloaded}
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div className="claims-sign-instructions">
            <div className="claims-warning-box">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <h4>Important: Sign ONLY in the correct place</h4>
                <p>
                  Sign in section A3 of the form. Do not sign anywhere else or your application may be rejected.
                </p>
              </div>
            </div>

            <div className="claims-instructions-visual">
              <div className="claims-form-preview">
                <div className="claims-form-preview-header">Form A1002 Preview</div>
                <div className="claims-form-preview-section section-a1">Section A1</div>
                <div className="claims-form-preview-section section-a2">Section A2</div>
                <div className="claims-form-preview-section section-a3 highlight">
                  Section A3 - Sign Here
                  <div className="signature-line">✍️ Your Signature</div>
                </div>
                <div className="claims-form-preview-section section-a4">Section A4</div>
              </div>
            </div>

            <div className="claims-instructions-list">
              <h4>Instructions:</h4>
              <ol>
                <li>Print the downloaded form</li>
                <li>Fill in your personal details if not pre-filled</li>
                <li>Sign in section A3 in the presence of an authorized official</li>
                <li>Have the official stamp and sign the document</li>
              </ol>
            </div>

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
              >
                <span>Next</span>
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
              Your signature must be witnessed and certified by an authorized official.
              Select where you plan to get this done.
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
                Once you've signed the form with an authorized official, you'll upload it in the next step
                (Identity Verification). Make sure to keep the original signed document safe.
              </p>
            </div>

            <div className="claims-confirm-summary">
              <h4>Your selection:</h4>
              <p>
                You will get your signature certified at a{' '}
                <strong>
                  {selectedAuthority === 'notary_public' && 'Notary Public'}
                  {selectedAuthority === 'local_government' && 'Local Government Office'}
                  {selectedAuthority === 'bank_branch' && 'Bank Branch'}
                  {selectedAuthority === 'police' && 'Police Station'}
                  {selectedAuthority === 'embassy' && 'German Embassy or Consulate'}
                  {selectedAuthority === 'justice_of_peace' && 'Justice of the Peace'}
                </strong>
              </p>
            </div>

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
                disabled={isSubmitting}
              >
                <span>Continue</span>
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
      description="Download, print, and sign the pension refund application form."
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
