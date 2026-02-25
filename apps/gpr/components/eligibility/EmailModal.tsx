'use client';

import React, { useState } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';

interface EmailModalProps {
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export default function EmailModal({
  onClose,
  onSubmit,
  isLoading = false,
  error = null,
  onClearError,
}: EmailModalProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && !isLoading) {
      await onSubmit(email);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error && onClearError) {
      onClearError();
    }
  };

  const isValidEmail = email.includes('@') && email.includes('.');

  return (
    <div className="eligibility-modal-overlay" onClick={isLoading ? undefined : onClose}>
      <div
        className="eligibility-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="eligibility-modal-close"
          onClick={onClose}
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="eligibility-modal-content">
          <div className="eligibility-modal-icon">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="eligibility-modal-title">Continue with email</h2>
          <p className="eligibility-modal-description">
            Enter your email and we'll send you a log in link to sign in.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your.email@example.com"
              className={`eligibility-input ${error ? 'eligibility-input-error' : ''}`}
              autoFocus
              disabled={isLoading}
            />

            {error && (
              <p className="eligibility-error-message">{error}</p>
            )}

            <button
              type="submit"
              disabled={!isValidEmail || isLoading}
              className="eligibility-btn-next eligibility-modal-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
