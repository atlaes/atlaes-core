'use client';

import React from 'react';
import { PublicQuestion, PublicQuestionnaire } from './PublicQuestionnaire';

type QuestionField =
  | 'publicWorkedPublicAfter'
  | 'publicOtherInstitution'
  | 'publicPriorRefund'
  | 'publicCivilServant';

// Figma 1858-711 / 2346-3635 — the final questionnaire of the MANUAL
// public-sector path. Mirrors the calculator's PUBLIC_ELIGIBILITY_QUESTIONS
// verbatim; any 'yes' blocks the refund (flows/public-sector.ts
// checkEligibility('public_final_questions')). The upload path ends on
// PublicUploadFinalQuestions instead.
const QUESTIONS: PublicQuestion<QuestionField>[] = [
  {
    field: 'publicWorkedPublicAfter',
    question:
      'After your compulsory pension insurance ended, did you work for another German public-sector employer?',
  },
  {
    field: 'publicOtherInstitution',
    question:
      'Have you been insured with another public-sector or church supplementary pension institution?',
    helper: 'This includes another VBL or ZVK pension institution.',
  },
  {
    field: 'publicPriorRefund',
    question:
      'Have contributions from another public-sector or church supplementary pension institution already been refunded?',
  },
  {
    field: 'publicCivilServant',
    question: 'Did you later become a German civil servant?',
  },
];

export const PublicFinalQuestions: React.FC = () => (
  <PublicQuestionnaire
    title="A few more details about your public-sector pension"
    subtitle="Please answer these final questions so we can complete your refund check."
    questions={QUESTIONS}
  />
);

export default PublicFinalQuestions;
