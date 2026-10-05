'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { homeForRole, useAuth } from '@/contexts/AuthContext';
import { getFirmMe } from '@/lib/law-firm-api';
import { Spinner } from '@/components/ui';

/**
 * Law-firm portal shell (Figma "Law-firm portal & payout", top bar of
 * frames 02–07). Firm users always; admins only when ops added them as a
 * member, which /law-firm/me enforces server-side.
 *
 * Pages own their content width: the case pages use a 960px column, the
 * payout queue runs full width.
 */
const NAV: { href: string; label: string; match: (p: string) => boolean }[] = [
  {
    href: '/portal',
    label: 'Released cases',
    match: (p) => p === '/portal' || p.startsWith('/portal/claims'),
  },
  {
    href: '/portal/payouts',
    label: 'Payout queue',
    match: (p) => p.startsWith('/portal/payouts'),
  },
  {
    href: '/portal/statements',
    label: 'Statement upload',
    match: (p) => p.startsWith('/portal/statements'),
  },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '/portal';
  const allowed = user?.role === 'law_firm' || user?.role === 'admin';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // Portal sign-in ends with the 6-digit code; come back here after.
      router.replace(
        `/auth/portal-sign-in?next=${encodeURIComponent(pathname)}`
      );
    } else if (!allowed) router.replace(homeForRole(user?.role));
  }, [isLoading, isAuthenticated, allowed, user?.role, router, pathname]);

  const meQuery = useQuery({
    queryKey: ['firm-me'],
    queryFn: getFirmMe,
    enabled: allowed,
    retry: false,
  });

  if (isLoading || !allowed) return <Spinner full />;

  const meErrorCode = (
    meQuery.error as { response?: { data?: { code?: string } } } | null
  )?.response?.data?.code;

  if (meQuery.isError && meErrorCode === 'ip_not_allowed') {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-[15px] leading-[1.5] text-[#4b4f58]">
            Your firm allows portal access only from its office network. Connect
            from the office, or ask ATLAES to add this network.
          </p>
          <button
            onClick={logout}
            className="mt-4 text-[14px] font-semibold text-[#002691] hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-[15px] leading-[1.5] text-[#4b4f58]">
            {user?.role === 'admin'
              ? 'Your admin account is not a member of a partner firm. Add yourself under Law firms to check the portal.'
              : 'Your account is not linked to a partner law firm. Please contact ATLAES.'}
          </p>
          {user?.role === 'admin' ? (
            <Link
              href="/law-firms"
              className="mt-4 inline-block text-[14px] font-semibold text-[#002691] hover:underline"
            >
              Go to Law firms
            </Link>
          ) : (
            <button
              onClick={logout}
              className="mt-4 text-[14px] font-semibold text-[#002691] hover:underline"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    );
  }

  const firmName = meQuery.data?.firm?.name ?? 'Vividius Rechtsanwälte';

  return (
    <div className="min-h-screen bg-white text-[#181818]">
      <header className="border-b border-[#f1f1f1] bg-white">
        <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-10">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <Link
              href="/portal"
              className="flex items-center gap-2.5 whitespace-nowrap leading-none"
            >
              <span className="text-[15px] font-extrabold text-[#002691]">
                {firmName}
              </span>
              <span className="text-[15px] text-[#8c8c8c]">·</span>
              <span className="text-[14px] font-semibold text-[#4b4f58]">
                Law-firm portal
              </span>
            </Link>
            <nav aria-label="Portal" className="flex items-center gap-5">
              {NAV.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`whitespace-nowrap border-b-2 py-1 text-[14px] font-semibold leading-[1.4] ${
                      active
                        ? 'border-[#002691] text-[#002691]'
                        : 'border-transparent text-[#4b4f58] hover:text-[#002691]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-6 text-[14px] font-semibold leading-[1.4]">
            {user?.role === 'admin' && (
              <Link href="/claims" className="text-[#4b4f58] hover:underline">
                Admin
              </Link>
            )}
            <span className="hidden text-[#4b4f58] sm:inline">
              {user?.email}
            </span>
            <button onClick={logout} className="text-[#002691] hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
