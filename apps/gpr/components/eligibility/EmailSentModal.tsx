'use client';

import React from 'react';
import { X, Check } from 'lucide-react';

interface EmailSentModalProps {
  email: string;
  onClose: () => void;
}

export default function EmailSentModal({ email, onClose }: EmailSentModalProps) {
  return (
    <div className="eligibility-modal-overlay" onClick={onClose}>
      <div
        className="eligibility-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="eligibility-modal-close" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <div className="eligibility-modal-content">
          <div className="eligibility-modal-icon success">
            <Check className="w-8 h-8" />
          </div>

          <h2 className="eligibility-modal-title">Check your email</h2>
          <p className="eligibility-modal-description">
            We sent a log in link to <strong>{email}</strong>. Click the link in
            your email to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
