'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Scale, LogOut } from 'lucide-react';
import { homeForRole, useAuth } from '@/contexts/AuthContext';
import { getFirmMe } from '@/lib/law-firm-api';

/**
 * Partner portal shell. Gated to law-firm users: anonymous visitors go to
 * the login page, admins to their own claims list.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Firm users always; admins only when ops added them as a member
  // (checked server-side by /law-firm/me).
  const allowed = user?.role === 'law_firm' || user?.role === 'admin';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/');
    else if (!allowed) router.replace(homeForRole(user?.role));
  }, [isLoading, isAuthenticated, allowed, user?.role, router]);

  const meQuery = useQuery({
    queryKey: ['firm-me'],
    queryFn: getFirmMe,
    enabled: allowed,
    retry: false,
  });

  if (isLoading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-gray-600">
          {user?.role === 'admin'
            ? 'Your admin account is not a member of a partner firm. Add yourself under Law firms to check the portal.'
            : 'Your account has no active partner firm membership. Please contact CompanyPension ops.'}
        </p>
        {user?.role === 'admin' ? (
          <Link
            href="/law-firms"
            className="mt-4 inline-block text-sm text-brand-dark underline"
          >
            Go to Law firms
          </Link>
        ) : (
          <button
            onClick={logout}
            className="mt-4 text-sm text-brand-dark underline"
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  const firm = meQuery.data?.firm;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/portal" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-dark text-brand-accent">
                <Scale className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-brand-dark">
                  Partner portal
                </span>
                <span className="block text-xs text-gray-500">
                  {firm?.name ?? 'CompanyPension'}
                </span>
              </span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              <Link
                href="/portal"
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  pathname === '/portal'
                    ? 'bg-gray-100 text-brand-dark'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Cases
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                href="/claims"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Admin
              </Link>
            )}
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
