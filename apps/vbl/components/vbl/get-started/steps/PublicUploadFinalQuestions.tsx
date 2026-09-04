'use client';

import React from 'react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { PublicQuestion, PublicQuestionnaire } from './PublicQuestionnaire';

type QuestionField = 'publicUploadDisabled' | 'publicUploadMandatoryInsurance';

// Figma 2346-5922 — the final questionnaire of the UPLOAD public-sector
// path ("A few more details about your [VBL/ZVK] insurance"). Shown once the
// extracted document details are confirmed; any 'yes' blocks the refund
// (flows/public-sector.ts checkEligibility('public_upload_final_questions'),
// Figma 2346-6081 "All No" → 2346-6021, "Any Yes" → 2346-6090). The copy
// matches the calculator's STAGE_ELIGIBILITY_QUESTIONS verbatim.
const QUESTIONS: PublicQuestion<QuestionField>[] = [
  {
    field: 'publicUploadDisabled',
    question: 'Are you currently occupationally disabled or unable to work?',
    helper: 'This means berufsunfähig or erwerbsunfähig.',
  },
  {
    field: 'publicUploadMandatoryInsurance',
    question:
      'Are you currently doing, or will you start, work that is subject to mandatory insurance with another supplementary pension institution?',
    helper:
      'This means Pflichtversicherung with another Zusatzversorgungseinrichtung like VBL for example.',
  },
];

export const PublicUploadFinalQuestions: React.FC = () => {
  const { data } = useEligibility();
  // Figma's "[VBL/ZVK]" placeholder resolves to the scheme confirmed from
  // the document; upload extractions can carry state-specific ZVK names
  // (e.g. 'ZVK (KVBW)'), which collapse to the generic label.
  const scheme = data.pensionProvider.startsWith('ZVK')
    ? 'ZVK'
    : data.pensionProvider || 'VBL/ZVK';

  return (
    <PublicQuestionnaire
      title={`A few more details about your ${scheme} insurance`}
      subtitle="Please answer these final questions so we can complete your refund check."
      questions={QUESTIONS}
    />
  );
};

export default PublicUploadFinalQuestions;
