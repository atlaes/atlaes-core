'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';

export const dynamic = 'force-dynamic';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>(
    'password'
  );

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'magic-link') {
      setLoginMode('magic-link');
    }
  }, [searchParams]);

  const handleSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      <div className="max-w-md w-full space-y-8">
        {isLogin ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setIsLogin(false)}
            initialMode={loginMode}
          />
        ) : (
          <RegisterForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
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
