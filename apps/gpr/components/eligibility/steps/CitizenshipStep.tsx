'use client';

import React, { useEffect, useState } from 'react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';
import CountryCombobox from '../CountryCombobox';
import StepCard from '../StepCard';
import { LocalPensionQuestion } from './fields';
import {
  TOP_CITIZENSHIPS,
  TOP_RESIDENCES,
  likelyCountry,
} from '@/lib/country-search';
import { QUESTION_COPY, visibleQuestions } from '@/lib/eligibility-rules';

/** Step 1: citizenship + country of residence (brief § 1, C1 + R). */
export default function CitizenshipStep() {
  const { formData, updateFormData, flowType, geoCountry, answers } =
    useEligibilityCheck();
  // Ordering hint only (browser locale, then the server's GeoIP country).
  const [likely, setLikely] = useState<string | null>(null);
  useEffect(() => {
    const langs =
      typeof navigator !== 'undefined'
        ? navigator.languages && navigator.languages.length
          ? navigator.languages
          : [navigator.language]
        : [];
    setLikely(likelyCountry(langs, geoCountry));
  }, [geoCountry]);

  // The calculator flow has no work-history step, so P is asked here.
  const askP =
    flowType === 'calculator' && visibleQuestions(answers).localPension;

  return (
    <StepCard>
      <div className="eligibility-form-section">
        <h2 className="eligibility-title">Check your eligibility</h2>
        <p className="eligibility-subtitle">Your citizenship and residence</p>

        <CountryCombobox
          id="citizenship"
          label={QUESTION_COPY.citizenship}
          value={formData.citizenship || null}
          onChange={(code) => updateFormData({ citizenship: code || '' })}
          likely={likely}
          top={TOP_CITIZENSHIPS}
        />
        <CountryCombobox
          id="residence"
          label={QUESTION_COPY.residence}
          value={formData.residence || null}
          onChange={(code) => updateFormData({ residence: code || '' })}
          likely={likely}
          top={TOP_RESIDENCES}
        />
        {askP ? <LocalPensionQuestion /> : null}
      </div>
    </StepCard>
  );
}
