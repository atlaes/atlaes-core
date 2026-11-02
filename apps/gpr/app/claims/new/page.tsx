'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Shield, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiErrorMessage } from '@/lib/api';
import { claimsApi } from '@/lib/claims-api';
import { ClaimsFrame } from '@/components/claims/ClaimsFrame';
import '@/app/claims.css';

type IntroStep = 'terms' | 'documents';

const SIGN_IN_HREF = '/auth?redirect=' + encodeURIComponent('/claims/new');

export default function NewClaimPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<IntroStep>('terms');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creating a claim needs a session; without one the API answers 401.
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(SIGN_IN_HREF);
    }
  }, [authLoading, user, router]);

  const handleStartClaim = async () => {
    try {
      setIsCreating(true);
      setError(null);
      const newClaim = await claimsApi.createClaim({ caseType: 'drv_refund' });
      router.push(`/claims/${newClaim.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create claim'));
      setIsCreating(false);
    }
  };

  const handleTermsContinue = () => {
    if (agreedToTerms) {
      setStep('documents');
    }
  };

  if (authLoading || !user) {
    return (
      <ClaimsFrame title="New claim">
        <div className="claims-wizard-loading">
          <div className="claims-spinner" />
          <span>{authLoading ? 'Loading...' : 'Taking you to sign in...'}</span>
        </div>
      </ClaimsFrame>
    );
  }

  // Terms Agreement Screen (Screen 1)
  if (step === 'terms') {
    return (
      <ClaimsFrame title="New claim · Before we begin">
        <div className="claims-intro-card">
          <div className="claims-intro-icon">
            <FileText className="w-12 h-12" />
          </div>

          <h1 className="claims-intro-title">Before we begin...</h1>

          <p className="claims-intro-subtitle">
            This process takes about 5-10 minutes.
            <br />
            Please read the key information below before you continue:
          </p>

          <div className="claims-intro-info-box">
            <div className="claims-intro-info-item">
              <Check className="w-4 h-4 text-primary" />
              <span>Service fee: 9.75%, success-based — no refund, no fee</span>
            </div>
            <div className="claims-intro-info-item">
              <Check className="w-4 h-4 text-primary" />
              <span>Maximum fee: €2,500, even for large refunds</span>
            </div>
            <div className="claims-intro-info-item">
              <Check className="w-4 h-4 text-primary" />
              <span>
                No upfront payments — fee is deducted after your refund is paid
              </span>
            </div>
            <div className="claims-intro-info-item">
              <Check className="w-4 h-4 text-primary" />
              <span>
                Refunds are paid via our German law firm's secure escrow account
              </span>
            </div>
            <div className="claims-intro-info-item">
              <Check className="w-4 h-4 text-primary" />
              <span>Your data is protected with GDPR-compliant encryption</span>
            </div>
          </div>

          <p className="claims-intro-terms-text">
            By continuing, you agree to our{' '}
            <a href="/terms" className="claims-link">
              Terms & Conditions
            </a>
            .
          </p>

          <div className="claims-intro-question">
            <p className="claims-intro-question-text">
              Do you agree and want to continue?
            </p>
            <div className="claims-intro-radio-group">
              <label className="claims-intro-radio">
                <input
                  type="radio"
                  name="agree"
                  checked={agreedToTerms === true}
                  onChange={() => setAgreedToTerms(true)}
                />
                <span className="claims-intro-radio-circle" />
                <span>Yes, I agree</span>
              </label>
              <label className="claims-intro-radio">
                <input
                  type="radio"
                  name="agree"
                  checked={agreedToTerms === false}
                  onChange={() => setAgreedToTerms(false)}
                />
                <span className="claims-intro-radio-circle" />
                <span>No, I don't</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleTermsContinue}
            disabled={agreedToTerms !== true}
            className="claims-btn claims-btn-primary"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </ClaimsFrame>
    );
  }

  // Document Checklist Screen (Screen 2)
  return (
    <ClaimsFrame title="New claim · Before we get started">
      <div className="claims-intro-card">
        <div className="claims-intro-icon">
          <Shield className="w-12 h-12" />
        </div>

        <h1 className="claims-intro-title">Before we get started</h1>

        <p className="claims-intro-subtitle">
          Please have the following ready (if available). You can still continue
          without them.
        </p>

        <div className="claims-intro-docs-grid">
          <div className="claims-intro-doc-card">
            <div className="claims-intro-doc-icon">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="claims-intro-doc-title">Passport</h3>
            <p className="claims-intro-doc-desc">Main page & signature page</p>
          </div>

          <div className="claims-intro-doc-card">
            <div className="claims-intro-doc-icon">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="claims-intro-doc-title">
              Deregistration certificate
            </h3>
            <p className="claims-intro-doc-desc">Abmeldung</p>
          </div>
        </div>

        {error && (
          <div className="claims-error-banner">
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleStartClaim}
          disabled={isCreating}
          className="claims-btn claims-btn-primary"
        >
          {isCreating ? (
            <span>Starting...</span>
          ) : (
            <>
              <span>Start Now</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="claims-intro-note">
          You can continue even if you don't have everything.
        </p>
      </div>
    </ClaimsFrame>
  );
}
