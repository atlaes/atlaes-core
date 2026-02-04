'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { useCompleteStepMutation } from '@/lib/queries/claims-queries';
import { ClaimStepName } from '@/lib/claims-api';

interface ClaimsStepContainerProps {
  claimId: string;
  stepName: ClaimStepName;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Override default continue behavior */
  onContinue?: () => Promise<void> | void;
  /** Override default back behavior */
  onBack?: () => void;
  /** Custom validation before continue */
  canContinue?: boolean;
  /** Hide back button */
  hideBack?: boolean;
  /** Hide continue button */
  hideContinue?: boolean;
  /** Custom continue button text */
  continueText?: string;
  /** Show skip option (for optional steps) */
  showSkip?: boolean;
  /** Custom skip handler */
  onSkip?: () => void;
}

export default function ClaimsStepContainer({
  claimId,
  stepName,
  title,
  description,
  children,
  onContinue,
  onBack,
  canContinue = true,
  hideBack = false,
  hideContinue = false,
  continueText = 'Continue',
  showSkip = false,
  onSkip,
}: ClaimsStepContainerProps) {
  const { goToNextStep, goToPreviousStep } = useClaimsStore();
  const completeMutation = useCompleteStepMutation();

  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleContinue = async () => {
    if (!canContinue || isProcessing) return;

    setIsProcessing(true);
    try {
      if (onContinue) {
        await onContinue();
      } else {
        // Default: mark step complete and go to next
        await completeMutation.mutateAsync({ claimId, stepName });
        goToNextStep();
      }
    } catch (error) {
      console.error('Error in step continue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToPreviousStep();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      goToNextStep();
    }
  };

  const isLoading = completeMutation.isPending;
  const isDisabled = !canContinue || isProcessing || isLoading;

  return (
    <div className="claims-step-container">
      {/* Back Link - Top of content area (design match) */}
      {!hideBack && (
        <button
          type="button"
          onClick={handleBack}
          className="claims-step-back"
          disabled={isProcessing || isLoading}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      {/* Step Header */}
      <div className="claims-step-header">
        <h1 className="claims-step-title">{title}</h1>
        {description && (
          <p className="claims-step-description">{description}</p>
        )}
      </div>

      {/* Step Content */}
      <div className="claims-step-content">
        {children}
      </div>

      {/* Step Footer / Navigation */}
      <div className="claims-step-footer">
        {showSkip && (
          <button
            type="button"
            onClick={handleSkip}
            className="claims-btn claims-btn-text"
            disabled={isProcessing || isLoading}
          >
            Skip this step
          </button>
        )}

        {!hideContinue && (
          <button
            type="button"
            onClick={handleContinue}
            className="claims-btn claims-btn-primary claims-btn-full"
            disabled={isDisabled}
          >
            {isProcessing || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{continueText}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
