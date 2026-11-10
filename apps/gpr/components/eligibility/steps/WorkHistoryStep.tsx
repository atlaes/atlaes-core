'use client';

import React from 'react';
import {
  isFutureMonth,
  useEligibilityCheck,
} from '@/hooks/useEligibilityCheck';
import CountryCombobox from '../CountryCombobox';
import StepCard from '../StepCard';
import { LocalPensionQuestion, MonthYearField, RadioGroup } from './fields';
import { TOP_CITIZENSHIPS } from '@/lib/country-search';
import {
  QUESTION_COPY,
  countryBlock,
  visibleQuestions,
} from '@/lib/eligibility-rules';

/**
 * Step 2: last German contribution month (L), the optional second
 * citizenship (C2), and — only when they can change the result — the
 * local-pension question (P) and the 60-month question (M).
 */
export default function WorkHistoryStep() {
  const { formData, updateFormData, answers } = useEligibilityCheck();
  const v = visibleQuestions(answers);
  // A blocking second citizenship decides on its own (Step A re-run).
  const blockedByC2 = countryBlock(answers) !== null;
  const lFuture = isFutureMonth(answers.lastContribution ?? null);

  return (
    <StepCard>
      <div className="eligibility-form-section">
        <h2 className="eligibility-title">Your German contributions</h2>

        <MonthYearField
          id="last-contribution"
          label={QUESTION_COPY.lastContribution}
          hint={QUESTION_COPY.lastContributionHint}
          month={formData.lastContributionMonth}
          year={formData.lastContributionYear}
          onChange={(m, y) =>
            updateFormData({
              lastContributionMonth: m,
              lastContributionYear: y,
            })
          }
          error={lFuture ? 'Please choose a month that has passed.' : null}
        />

        {formData.showSecondCitizenship ? (
          <CountryCombobox
            id="second-citizenship"
            label={QUESTION_COPY.secondCitizenship}
            hint={QUESTION_COPY.secondCitizenshipHint}
            value={formData.secondCitizenship || null}
            onChange={(code) =>
              updateFormData({ secondCitizenship: code || '' })
            }
            top={TOP_CITIZENSHIPS}
            autoFocus
          />
        ) : (
          <p className="elig-link-row">
            <button
              type="button"
              className="elig-text-link"
              onClick={() => updateFormData({ showSecondCitizenship: true })}
            >
              {QUESTION_COPY.secondCitizenshipLink}
            </button>
          </p>
        )}

        {!blockedByC2 && v.localPension ? <LocalPensionQuestion /> : null}

        {!blockedByC2 && v.germanMonths ? (
          <RadioGroup
            name="germanMonths"
            label={QUESTION_COPY.germanMonths}
            hint={QUESTION_COPY.germanMonthsHint}
            options={QUESTION_COPY.germanMonthsOptions}
            value={formData.germanMonths}
            onChange={(val) => updateFormData({ germanMonths: val })}
          />
        ) : null}
      </div>
    </StepCard>
  );
}
