'use client';

import React from 'react';
import {
  useGPRCalculator,
  MONTHS,
  getYears,
  SECTORS,
  STATES,
  PENSION_PROVIDERS,
} from '@/hooks/useGPRCalculator';
import StepContainer from '../StepContainer';

export default function JobDetails() {
  const {
    formData,
    currentJobIndex,
    updateJob,
    goToNextJob,
    goToPreviousJob,
  } = useGPRCalculator();

  const job = formData.jobs[currentJobIndex];
  const isLastJob = currentJobIndex === formData.numberOfJobs - 1;
  const years = getYears();

  if (!job) {
    return null;
  }

  const handleChange = (field: keyof typeof job, value: string | number) => {
    // Reset state and supplementary pension when sector changes
    if (field === 'sector') {
      updateJob(currentJobIndex, {
        sector: value as string,
        state: '',
        supplementaryPension: '',
      });
    } else {
      updateJob(currentJobIndex, { [field]: value });
    }
  };

  const showStateField = job.sector === 'public';
  const pensionProviders = PENSION_PROVIDERS[job.sector] || [];

  // Check if end date is before start date
  const hasDateError = (() => {
    if (!job.startMonth || !job.startYear || !job.endMonth || !job.endYear) {
      return false;
    }
    const startMonthIndex = MONTHS.indexOf(job.startMonth);
    const endMonthIndex = MONTHS.indexOf(job.endMonth);
    const startYear = parseInt(job.startYear);
    const endYear = parseInt(job.endYear);
    const startValue = startYear * 12 + startMonthIndex;
    const endValue = endYear * 12 + endMonthIndex;
    return endValue < startValue;
  })();

  return (
    <StepContainer
      showBackButton={true}
      showNextButton={true}
      nextButtonText={isLastJob ? 'See Results' : 'Next Job'}
      onBack={goToPreviousJob}
      onNext={goToNextJob}
      backText="Back"
    >
      <div className="gpr-form-section">
        <h2 className="gpr-question">
          Job {currentJobIndex + 1} of {formData.numberOfJobs}
        </h2>
        <p className="gpr-description">
          Enter the start/end months, salary, and sector.
        </p>

        {/* Start of Employment */}
        <div className="gpr-form-group">
          <h3 className="gpr-form-group-title">Start of employment</h3>
          <div className="gpr-form-row">
            <div className="gpr-form-field">
              <label htmlFor="startMonth" className="gpr-label">
                Start Month
              </label>
              <select
                id="startMonth"
                value={job.startMonth}
                onChange={(e) => handleChange('startMonth', e.target.value)}
                className="gpr-select"
              >
                <option value="" disabled>Select month</option>
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="gpr-form-field">
              <label htmlFor="startYear" className="gpr-label">
                Start Year
              </label>
              <select
                id="startYear"
                value={job.startYear}
                onChange={(e) => handleChange('startYear', e.target.value)}
                className="gpr-select"
              >
                <option value="" disabled>Select year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* End of Employment */}
        <div className="gpr-form-group">
          <h3 className="gpr-form-group-title">End of employment</h3>
          <div className="gpr-form-row">
            <div className="gpr-form-field">
              <label htmlFor="endMonth" className="gpr-label">
                End Month
              </label>
              <select
                id="endMonth"
                value={job.endMonth}
                onChange={(e) => handleChange('endMonth', e.target.value)}
                className="gpr-select"
              >
                <option value="" disabled>Select month</option>
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="gpr-form-field">
              <label htmlFor="endYear" className="gpr-label">
                End Year
              </label>
              <select
                id="endYear"
                value={job.endYear}
                onChange={(e) => handleChange('endYear', e.target.value)}
                className="gpr-select"
              >
                <option value="" disabled>Select year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {hasDateError && (
            <p className="gpr-error-message">
              End date must be after start date
            </p>
          )}
        </div>

        {/* Monthly Salary */}
        <div className="gpr-form-field">
          <label htmlFor="monthlySalary" className="gpr-label">
            Average monthly gross salary (€)
          </label>
          <input
            type="number"
            id="monthlySalary"
            value={job.monthlySalary || ''}
            onChange={(e) => handleChange('monthlySalary', parseFloat(e.target.value) || 0)}
            placeholder="e.g. 3500"
            className="gpr-input"
            min="0"
          />
        </div>

        {/* Sector */}
        <div className="gpr-form-field">
          <label htmlFor="sector" className="gpr-label">
            Sector
          </label>
          <select
            id="sector"
            value={job.sector}
            onChange={(e) => handleChange('sector', e.target.value)}
            className="gpr-select"
          >
            <option value="" disabled>Select sector</option>
            {SECTORS.map((sector) => (
              <option key={sector.value} value={sector.value}>
                {sector.label}
              </option>
            ))}
          </select>
        </div>

        {/* State (only for Public Sector) */}
        {showStateField && (
          <div className="gpr-form-field">
            <label htmlFor="state" className="gpr-label">
              State (Bundesland)
            </label>
            <select
              id="state"
              value={job.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className="gpr-select"
            >
              <option value="" disabled>Select State</option>
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Supplementary Pension Provider */}
        {job.sector && pensionProviders.length > 0 && (
          <div className="gpr-form-field">
            <label className="gpr-label">
              Supplementary pension provider (optional)
            </label>
            <div className="gpr-radio-group">
              {pensionProviders.map((provider) => (
                <label key={provider} className="gpr-radio-label">
                  <input
                    type="radio"
                    name="supplementaryPension"
                    value={provider}
                    checked={job.supplementaryPension === provider}
                    onChange={(e) => handleChange('supplementaryPension', e.target.value)}
                    className="gpr-radio"
                  />
                  <span>{provider}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepContainer>
  );
}
