'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import {
  DEFAULT_POST_LOGIN_PATH,
  rememberPostLoginRedirect,
} from '@/lib/post-login-redirect';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || DEFAULT_POST_LOGIN_PATH;

  // A magic link opens in a new tab without the query; keep the target.
  useEffect(() => {
    rememberPostLoginRedirect(searchParams.get('redirect'));
  }, [searchParams]);

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
