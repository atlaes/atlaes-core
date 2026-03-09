'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { requestMagicLink, verifyMagicLink } from '@/lib/onboarding-api';
import { apiClient } from '@/lib/api';

interface CreateAccountProps {
  onNext: () => void;
}

export const CreateAccount: React.FC<CreateAccountProps> = ({ onNext }) => {
  const { data, updateData } = useOnboarding();
  const [email, setEmail] = useState(data.email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await requestMagicLink(email);

      // In dev mode, the API returns the magic link URL so we can auto-verify
      if (result.magicLink) {
        const url = new URL(result.magicLink);
        const token = url.searchParams.get('token');
        if (token) {
          const verifyResult = await verifyMagicLink(token);
          localStorage.setItem('accessToken', verifyResult.tokens.accessToken);
          localStorage.setItem('refreshToken', verifyResult.tokens.refreshToken);
          updateData({
            email,
            authMethod: 'email',
            userId: verifyResult.user.id,
          });
          onNext();
          return;
        }
      }

      // In production, show message that magic link was sent
      updateData({ email, authMethod: 'email' });
      onNext();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/auth/google/authorize');
      window.location.href = data.authUrl;
    } catch {
      setError('Google sign-in is not available');
      setIsSubmitting(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/auth/apple/authorize');
      window.location.href = data.authUrl;
    } catch {
      setError('Apple sign-in is not available');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Title */}
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Create your account
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Create your secure account to start your claim. We'll guide you through
        every step and help you prepare the required submission.
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Email Form */}
      <form onSubmit={handleEmailSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none transition-all"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!email || isSubmitting}
          className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue with email
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-sm text-gray-500 text-center mt-2">
          No password needed — we'll send you a secure log in link
        </p>
      </form>

      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="px-4 text-sm text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social Login Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
          className="w-full py-3 px-6 bg-white border border-gray-300 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="font-medium text-gray-700">Continue with Google</span>
        </button>

        <button
          onClick={handleAppleAuth}
          disabled={isSubmitting}
          className="w-full py-3 px-6 bg-white border border-gray-300 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          <span className="font-medium text-gray-700">Continue with Apple</span>
        </button>
      </div>
    </div>
  );
};

export default CreateAccount;
