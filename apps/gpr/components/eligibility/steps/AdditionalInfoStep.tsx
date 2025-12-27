'use client';

import React from 'react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';
import StepCard from '../StepCard';

export default function AdditionalInfoStep() {
  const { formData, updateFormData } = useEligibilityCheck();

  return (
    <StepCard>
      <div className="eligibility-form-section">
        <h2 className="eligibility-title">Additional information</h2>
        <p className="eligibility-subtitle">
          We need a few more details to complete your eligibility check.
        </p>

        <div className="eligibility-form-group">
          <label htmlFor="dateOfBirth" className="eligibility-label">
            Date of birth
          </label>
          <input
            type="date"
            id="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
            className="eligibility-input"
            placeholder="MM/DD/YYYY"
          />
        </div>
      </div>
    </StepCard>
  );
}
