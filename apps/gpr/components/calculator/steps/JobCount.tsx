'use client';

import React from 'react';
import { useGPRCalculator } from '@/hooks/useGPRCalculator';
import StepContainer from '../StepContainer';

export default function JobCount() {
  const { formData, updateFormData, goToNextStep } = useGPRCalculator();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    updateFormData({ numberOfJobs: value });
  };

  return (
    <StepContainer
      showNextButton={true}
      nextButtonText="Next"
      onNext={goToNextStep}
    >
      <div className="gpr-form-section">
        <h2 className="gpr-question">How many jobs did you have in Germany?</h2>
        <p className="gpr-description">
          Please count every job where you received a salary and paid German pension contributions (DRV).
        </p>

        <div className="gpr-form-field">
          <label htmlFor="numberOfJobs" className="gpr-label">
            Number of jobs
          </label>
          <select
            id="numberOfJobs"
            value={formData.numberOfJobs || ''}
            onChange={handleChange}
            className="gpr-select"
          >
            <option value="" disabled>Select number of jobs</option>
            <option value="1">1 job</option>
            <option value="2">2 jobs</option>
            <option value="3">3 jobs</option>
            <option value="4">4 jobs</option>
            <option value="5">5 jobs</option>
          </select>
        </div>
      </div>
    </StepContainer>
  );
}
