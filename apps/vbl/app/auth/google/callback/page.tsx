'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import { apiClient } from '@/lib/api';
import { Loader2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const exchangeCode = async () => {
      const code = searchParams?.get('code');

      if (!code) {
        setError('No authorization code received from Google');
        return;
      }

      try {
        const { data } = await apiClient.post('/auth/google/verify', { code });

        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);

        router.push('/dashboard');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Google sign-in failed';
        setError(message);
      }
    };

    exchangeCode();
  }, [searchParams, router]);

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
            {!error ? (
              <>
                <Loader2 className="animate-spin h-12 w-12 text-[#163300] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[#163300] mb-2">
                  Completing Sign In
                </h2>
                <p className="text-gray-600">
                  Please wait while we complete your Google sign-in...
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[#163300] mb-2">
                  Sign In Failed
                </h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => router.push('/auth')}
                  className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg hover:bg-[#8AD860] transition-colors"
                >
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-[#163300]" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
