'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Scale, LogOut } from 'lucide-react';
import { homeForRole, useAuth } from '@/contexts/AuthContext';
import { getFirmMe } from '@/lib/law-firm-api';
import { Spinner } from '@/components/ui';

/**
 * Partner portal shell (German). Firm users always; admins only when ops
 * added them as a member, which /law-firm/me enforces server-side.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
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

  if (isLoading || !allowed) return <Spinner full />;

  if (meQuery.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-gray-600">
          {user?.role === 'admin'
            ? 'Your admin account is not a member of a partner firm. Add yourself under Law firms to check the portal.'
            : 'Ihr Konto ist keiner Partnerkanzlei zugeordnet. Bitte wenden Sie sich an CompanyPension.'}
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
            Abmelden
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
          <Link href="/portal" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-dark text-brand-accent">
              <Scale className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-brand-dark">
                Partnerportal
              </span>
              <span className="block text-xs text-gray-500">
                {firm?.name ?? 'CompanyPension'}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                href="/claims"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Admin
              </Link>
            )}
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-gray-400 sm:px-6">
        CompanyPension wird betrieben von ATLAES GmbH. Fragen zu einer Akte:
        ops@companypension.de
      </footer>
    </div>
  );
}
