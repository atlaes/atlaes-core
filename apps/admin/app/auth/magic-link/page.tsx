'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function MagicLinkPage() {
  const { verifyMagicLink, isAuthenticated, error: authError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token provided');
      setVerifying(false);
      return;
    }

    const verify = async () => {
      try {
        await verifyMagicLink(token);
        // If authError is set after verify, it means role check failed
      } catch (err: any) {
        setError(err.message);
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [searchParams, verifyMagicLink]);

  useEffect(() => {
    if (!verifying && isAuthenticated) {
      router.replace('/claims');
    }
  }, [verifying, isAuthenticated, router]);

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">
            Verifying your magic link...
          </p>
        </div>
      </div>
    );
  }

  if (error || authError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Verification Failed
          </h2>
          <p className="mt-2 text-sm text-gray-500">{error || authError}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
