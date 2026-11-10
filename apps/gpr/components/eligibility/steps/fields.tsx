'use client';

/** Shared question fields of the eligibility flow (brief § 1). */
import React from 'react';
import {
  MONTHS,
  getYears,
  useEligibilityCheck,
} from '@/hooks/useEligibilityCheck';
import { countryLabel } from '@/lib/country-search';
import { QUESTION_COPY } from '@/lib/eligibility-rules';

export function MonthYearField({
  id,
  label,
  hint,
  month,
  year,
  onChange,
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  month: string;
  year: string;
  onChange: (month: string, year: string) => void;
  error?: string | null;
}) {
  const years = getYears();
  return (
    <fieldset className="eligibility-form-group">
      <legend className="eligibility-label">{label}</legend>
      {hint ? (
        <p id={id + '-hint'} className="eligibility-helper-text elig-hint">
          {hint}
        </p>
      ) : null}
      <div className="eligibility-date-row">
        <select
          id={id + '-month'}
          aria-label={label + ' — month'}
          aria-describedby={hint ? id + '-hint' : undefined}
          value={month}
          onChange={(e) => onChange(e.target.value, year)}
          className="eligibility-select"
        >
          <option value="" disabled>
            Month
          </option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        <select
          id={id + '-year'}
          aria-label={label + ' — year'}
          value={year}
          onChange={(e) => onChange(month, e.target.value)}
          className="eligibility-select"
        >
          <option value="" disabled>
            Year
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="eligibility-error-message" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function RadioGroup<T extends string>({
  name,
  label,
  hint,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="eligibility-form-group">
      <legend className="eligibility-label">{label}</legend>
      {hint ? (
        <p className="eligibility-helper-text elig-hint">{hint}</p>
      ) : null}
      <div className="eligibility-radio-group">
        {options.map((o) => (
          <label key={o.value} className="eligibility-radio-label">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="eligibility-radio"
            />
            <span className="eligibility-radio-text">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Question P (+ end month on "Not any more"), for R ∈ LOCAL_ASK. */
export function LocalPensionQuestion() {
  const { formData, updateFormData, answers } = useEligibilityCheck();
  const r = formData.residence;
  const endFuture =
    !!answers.localPensionEnd &&
    answers.localPensionEnd.year * 12 + answers.localPensionEnd.month >
      new Date().getFullYear() * 12 + new Date().getMonth() + 1;
  return (
    <>
      <RadioGroup
        name="localPension"
        label={QUESTION_COPY.localPension(countryLabel(r))}
        hint={r === 'XK' ? QUESTION_COPY.localPensionHintXK : undefined}
        options={QUESTION_COPY.localPensionOptions}
        value={formData.localPension}
        onChange={(v) => updateFormData({ localPension: v })}
      />
      {formData.localPension === 'not-any-more' ? (
        <MonthYearField
          id="local-pension-end"
          label={QUESTION_COPY.localPensionEnd}
          month={formData.localPensionEndMonth}
          year={formData.localPensionEndYear}
          onChange={(m, y) =>
            updateFormData({ localPensionEndMonth: m, localPensionEndYear: y })
          }
          error={endFuture ? 'Please choose a month that has passed.' : null}
        />
      ) : null}
    </>
  );
}
