'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/auth/LoginForm';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by lib/api.ts when a session expires mid-flow. Only same-origin
  // paths are followed; anything else falls back to the dashboard.
  const redirectTo = safeRedirectPath(
    searchParams?.get('redirect'),
    '/dashboard'
  );

  const handleSuccess = () => {
    router.push(redirectTo);
  };

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
          <LoginForm
            onSuccess={handleSuccess}
            redirectUrl={redirectTo === '/dashboard' ? undefined : redirectTo}
          />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-[#163300]" />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
