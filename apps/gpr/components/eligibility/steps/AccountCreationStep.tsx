'use client';

/**
 * Step 3: account creation. The citizenship attestation (brief § 1, C3)
 * is required before the sign-in link can be requested; its timestamp is
 * stored with the sign-up record.
 */
import React from 'react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';
import { QUESTION_COPY } from '@/lib/eligibility-rules';
import EmailModal from '../EmailModal';
import EmailSentModal from '../EmailSentModal';
import { STORAGE_NOTE } from './ResultStep';

export default function AccountCreationStep() {
  const {
    attested,
    setAttested,
    openEmailModal,
    showEmailModal,
    showEmailSentModal,
    closeEmailModal,
    submitEmail,
    closeEmailSentModal,
    submittedEmail,
    isSubmittingEmail,
    emailError,
    clearEmailError,
    goToPreviousStep,
  } = useEligibilityCheck();

  return (
    <>
      <div className="eligibility-card eligibility-result-card">
        <div className="eligibility-result-content">
          <h2 className="eligibility-result-title">Create your account</h2>
          <p className="eligibility-result-description">
            We review every case individually before anything is filed.
          </p>

          <label className="elig-check elig-attest">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              required
            />
            <span>{QUESTION_COPY.attestation}</span>
          </label>

          <div className="eligibility-auth-buttons">
            <button
              type="button"
              className="eligibility-auth-btn email"
              onClick={openEmailModal}
              disabled={!attested}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Continue with email
            </button>
            <p className="eligibility-auth-note">
              No password needed — we&apos;ll send you a secure log in link
            </p>
            <p className="elig-storage-note">
              {STORAGE_NOTE}{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener">
                Privacy policy
              </a>
            </p>
          </div>
          <p className="elig-result-foot">
            <button
              type="button"
              className="elig-text-link"
              onClick={goToPreviousStep}
            >
              Back
            </button>
          </p>
        </div>
      </div>

      {showEmailModal && (
        <EmailModal
          onClose={closeEmailModal}
          onSubmit={submitEmail}
          isLoading={isSubmittingEmail}
          error={emailError}
          onClearError={clearEmailError}
        />
      )}

      {showEmailSentModal && (
        <EmailSentModal email={submittedEmail} onClose={closeEmailSentModal} />
      )}
    </>
  );
}
