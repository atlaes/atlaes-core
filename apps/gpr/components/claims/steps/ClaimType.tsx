'use client';

import React, { useState } from 'react';
import { User, FileText } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import { useClaimQuery, useUpdateClaimMutation, useCompleteStepMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { ClaimType as ClaimTypeEnum } from '@/lib/claims-api';

interface ClaimTypeProps {
  claimId: string;
}

export default function ClaimType({ claimId }: ClaimTypeProps) {
  const { data: claim } = useClaimQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const { goToNextStep } = useClaimsStore();

  const [selectedType, setSelectedType] = useState<ClaimTypeEnum | null>(
    claim?.claimType || null
  );

  // Update local state when claim data loads
  React.useEffect(() => {
    if (claim?.claimType && !selectedType) {
      setSelectedType(claim.claimType);
    }
  }, [claim?.claimType, selectedType]);

  const handleSelect = (type: ClaimTypeEnum) => {
    setSelectedType(type);
  };

  const handleContinue = async () => {
    if (!selectedType) return;

    await updateMutation.mutateAsync({ claimId, data: { claimType: selectedType } });
    await completeMutation.mutateAsync({ claimId, stepName: 'claimType' });
    goToNextStep();
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="claimType"
      title="Who is this refund claim for?"
      canContinue={!!selectedType && !isSubmitting}
      onContinue={handleContinue}
      hideBack
    >
      <div className="claims-type-options">
        {/* Own refund option - matches design */}
        <button
          type="button"
          onClick={() => handleSelect('own_refund')}
          className={`claims-type-card ${selectedType === 'own_refund' ? 'selected' : ''}`}
          disabled={isSubmitting}
        >
          <div className="claims-type-card-icon">
            <User className="w-5 h-5" />
          </div>
          <span className="claims-type-card-text">
            I am claiming my own pension refund
          </span>
        </button>

        {/* Surviving spouse option - matches design */}
        <button
          type="button"
          onClick={() => handleSelect('surviving_spouse')}
          className={`claims-type-card ${selectedType === 'surviving_spouse' ? 'selected' : ''}`}
          disabled={isSubmitting}
        >
          <div className="claims-type-card-icon">
            <FileText className="w-5 h-5" />
          </div>
          <span className="claims-type-card-text">
            I am claiming as a surviving spouse (widow/widower)
          </span>
        </button>
      </div>
    </ClaimsStepContainer>
  );
}
