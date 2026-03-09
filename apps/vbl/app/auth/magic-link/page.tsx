'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
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

        await verifyMagicLink(token);

        setStatus('success');
        setMessage('Login successful! Redirecting to dashboard...');

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (error: unknown) {
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Magic link verification failed'
        );
      }
    };

    handleMagicLink();
  }, [searchParams, verifyMagicLink, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dark Green Header */}
        <div className="px-8 py-6" style={{ backgroundColor: '#163300' }}>
          <div className="flex items-center justify-center">
            <CompanyPensionLogo />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <div className="max-w-md mx-auto text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="animate-spin h-12 w-12 text-[#163300] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[#163300] mb-2">
                  Verifying Magic Link
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your magic link...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-[#9FE870] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-[#163300]" />
                </div>
                <h2 className="text-xl font-semibold text-[#163300] mb-2">
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
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[#163300] mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/auth')}
                    className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg hover:bg-[#8AD860] transition-colors"
                  >
                    Back to Login
                  </button>
                  <button
                    onClick={() => router.push('/auth')}
                    className="w-full py-3 px-6 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Request New Magic Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-[#163300]" />
        </div>
      }
    >
      <MagicLinkPageContent />
    </Suspense>
  );
}
