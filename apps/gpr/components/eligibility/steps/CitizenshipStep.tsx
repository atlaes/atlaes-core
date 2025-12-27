'use client';

import React from 'react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';
import { COUNTRIES } from '@/data/countries';
import StepCard from '../StepCard';

export default function CitizenshipStep() {
  const { formData, updateFormData } = useEligibilityCheck();

  return (
    <StepCard>
      <div className="eligibility-form-section">
        <h2 className="eligibility-title">Check your eligibility</h2>
        <p className="eligibility-subtitle">Your citizenship and residence</p>

        <div className="eligibility-form-group">
          <label htmlFor="citizenship" className="eligibility-label">
            Country of citizenship
          </label>
          <select
            id="citizenship"
            value={formData.citizenship}
            onChange={(e) => updateFormData({ citizenship: e.target.value })}
            className="eligibility-select"
          >
            <option value="" disabled>
              Select Country
            </option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div className="eligibility-form-group">
          <label htmlFor="residence" className="eligibility-label">
            Current country of residence
          </label>
          <select
            id="residence"
            value={formData.residence}
            onChange={(e) => updateFormData({ residence: e.target.value })}
            className="eligibility-select"
          >
            <option value="" disabled>
              Select Country
            </option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>
    </StepCard>
  );
}
