'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { isAuthenticated, isLoading, error, requestMagicLink } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/claims');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFormError(null);

    try {
      const result = await requestMagicLink(email);

      // In dev, auto-redirect with magic link
      if (result.magicLink) {
        const url = new URL(result.magicLink);
        const token = url.searchParams.get('token');
        if (token) {
          router.push(`/auth/magic-link?token=${token}`);
          return;
        }
      }

      setSent(true);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Redirect will happen via useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-brand-dark">
              Atlaes Admin
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with your admin email
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {sent ? (
            <div className="rounded-lg bg-brand-light p-4 text-center">
              <p className="font-medium text-brand-dark">Check your email</p>
              <p className="mt-1 text-sm text-gray-600">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-3 text-sm text-brand-dark underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                placeholder="admin@atlaes.de"
              />
              <button
                type="submit"
                disabled={sending}
                className="mt-4 w-full rounded-lg bg-brand-dark py-2.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
