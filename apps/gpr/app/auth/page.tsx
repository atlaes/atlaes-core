'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import {
  rememberPostLoginRedirect,
  safePostLoginPath,
} from '@/lib/post-login-redirect';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('redirect');
  // Same-site paths only; anything else (an absolute URL, `//host`) falls
  // back to /claims — an open redirect otherwise.
  const redirect = safePostLoginPath(requested);

  // A magic link opens in a new tab without the query; keep the target
  // (same check applied inside).
  useEffect(() => {
    rememberPostLoginRedirect(requested);
  }, [requested]);

  const handleSuccess = () => {
    router.push(redirect);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      <LoginForm
        onSuccess={handleSuccess}
        appName="GPR Refund"
        initialMode="magic-link"
      />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
