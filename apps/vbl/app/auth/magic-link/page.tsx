'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function MagicLinkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const token = searchParams?.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Invalid magic link - no token provided');
          return;
        }

        // Verify the magic link
        const result = await verifyMagicLink(token);

        setStatus('success');
        setMessage('Login successful! Redirecting to dashboard...');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Magic link verification failed');
      }
    };

    handleMagicLink();
  }, [searchParams, verifyMagicLink, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VBL Refund</h1>
          <p className="text-gray-600">Verifying your magic link...</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verifying Magic Link
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your magic link...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Login Successful!
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="animate-pulse">
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard...
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/auth')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => router.push('/auth?mode=magic-link')}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Request New Magic Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <MagicLinkPageContent />
    </Suspense>
  );
}
