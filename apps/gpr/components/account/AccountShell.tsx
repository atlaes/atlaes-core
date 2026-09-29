'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/updates', label: 'Updates' },
  { href: '/account/documents', label: 'Documents' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/account') return pathname === '/account';
  return pathname === href || pathname.indexOf(href + '/') === 0;
}

/** App shell for `/account/**`: header with nav, 960px column, 16px gutters. */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-brand-surface/50 text-brand-ink">
      <header className="border-b border-brand-stroke/60 bg-white">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link
            href="/account"
            className="text-[15px] font-bold tracking-tight text-brand-navy"
          >
            Germany Pension Refund
          </Link>
          <nav
            aria-label="Account"
            className="order-3 w-full sm:order-none sm:w-auto"
          >
            <ul className="-mx-1 flex gap-1 overflow-x-auto">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={
                        'block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ' +
                        (active
                          ? 'bg-brand-tint text-brand-navy'
                          : 'text-brand-body hover:bg-brand-surface hover:text-brand-ink')
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="hidden max-w-[220px] truncate text-brand-muted md:inline">
                {user.profile?.firstName
                  ? user.profile.firstName + ' ' + (user.profile.lastName || '')
                  : user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-brand-stroke px-3 py-1.5 text-sm font-semibold text-brand-body hover:border-brand-navy hover:text-brand-navy"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[960px] px-4 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
