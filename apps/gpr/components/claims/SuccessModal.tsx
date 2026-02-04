'use client';

import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface SuccessModalProps {
  onClose: () => void;
}

export default function SuccessModal({ onClose }: SuccessModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="claims-modal-overlay" onClick={onClose}>
      <div className="claims-success-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="claims-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="claims-success-content">
          <div className="claims-success-icon">
            <Check className="w-8 h-8" />
          </div>

          <h2 className="claims-success-title">Claim submitted successfully!</h2>

          <p className="claims-success-description">
            Thank you for submitting your German pension refund claim. We will review your
            documents and get back to you within 5 business days.
          </p>
        </div>
      </div>
    </div>
  );
}
