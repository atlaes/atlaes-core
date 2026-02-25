'use client';

import React from 'react';
import { useEligibilityCheck, MONTHS, getYears } from '@/hooks/useEligibilityCheck';
import StepCard from '../StepCard';

export default function WorkHistoryStep() {
  const { formData, updateFormData } = useEligibilityCheck();
  const years = getYears();

  return (
    <StepCard>
      <div className="eligibility-form-section">
        <h2 className="eligibility-title">Your work history</h2>
        <p className="eligibility-subtitle">
          Tell us about your last employment in Germany.
        </p>

        <div className="eligibility-form-group">
          <label className="eligibility-label">
            Last month of employment in Germany
          </label>
          <div className="eligibility-date-row">
            <select
              value={formData.lastEmploymentMonth}
              onChange={(e) =>
                updateFormData({ lastEmploymentMonth: e.target.value })
              }
              className="eligibility-select"
            >
              <option value="" disabled>
                Month
              </option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={formData.lastEmploymentYear}
              onChange={(e) =>
                updateFormData({ lastEmploymentYear: e.target.value })
              }
              className="eligibility-select"
            >
              <option value="" disabled>
                Year
              </option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="eligibility-form-group">
          <label className="eligibility-label">
            How long did you contribute to the German pension system?
          </label>
          <div className="eligibility-radio-group">
            <label className="eligibility-radio-label">
              <input
                type="radio"
                name="contributionDuration"
                value="less_than_5_years"
                checked={formData.contributionDuration === 'less_than_5_years'}
                onChange={(e) =>
                  updateFormData({
                    contributionDuration: e.target
                      .value as 'less_than_5_years' | '5_years_or_more',
                  })
                }
                className="eligibility-radio"
              />
              <span className="eligibility-radio-text">
                Less than 5 years (max. 59 months)
              </span>
            </label>
            <label className="eligibility-radio-label">
              <input
                type="radio"
                name="contributionDuration"
                value="5_years_or_more"
                checked={formData.contributionDuration === '5_years_or_more'}
                onChange={(e) =>
                  updateFormData({
                    contributionDuration: e.target
                      .value as 'less_than_5_years' | '5_years_or_more',
                  })
                }
                className="eligibility-radio"
              />
              <span className="eligibility-radio-text">
                5 years or more (60+ months)
              </span>
            </label>
          </div>
          <p className="eligibility-helper-text">
            This helps us determine your eligibility under the 60-month rule.
          </p>
        </div>
      </div>
    </StepCard>
  );
}
