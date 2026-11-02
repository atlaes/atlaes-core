'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Error notice of the claim form (section F: red tint, radius 12). Renders
 * nothing without a message, so callers can pass state straight in.
 */
export default function ErrorNotice({
  message,
  children,
}: {
  message?: string | null;
  children?: React.ReactNode;
}) {
  if (!message && !children) return null;
  return (
    <div className="claims-error-banner" role="alert">
      <AlertCircle className="w-5 h-5" aria-hidden="true" />
      <div className="claims-error-banner-body">
        {message}
        {children}
      </div>
    </div>
  );
}
