'use client';

import './account.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SmartLink } from '@/components/marketing/ui/SmartLink';

const NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/updates', label: 'Updates' },
  { href: '/account/documents', label: 'Documents' },
];

const HELP_HREF = '/contact-us';

function isActive(pathname: string, href: string): boolean {
  if (href === '/account') return pathname === '/account';
  return pathname === href || pathname.indexOf(href + '/') === 0;
}

/**
 * App shell for `/account/**` (Figma client screens, section B/D): 72px
 * white top bar with the two-line wordmark, centre navigation, Help /
 * Sign out on the right; white canvas. Pages set their own column width.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const { logout } = useAuth();

  const links = NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(pathname, item.href) ? 'page' : undefined}
    >
      {item.label}
    </Link>
  ));

  return (
    <div className="acc">
      <header className="acc-topbar">
        <div className="acc-topbar-inner">
          <Link href="/account" className="acc-wordmark">
            <span>
              Germany
              <span className="acc-wordmark-arrows" aria-hidden="true">
                ››
              </span>
            </span>
            <span>Pension Refund</span>
          </Link>
          <nav aria-label="Account" className="acc-centre">
            {links.map((link, i) => (
              <Fragment key={NAV[i].href}>
                {i > 0 ? (
                  <span className="acc-centre-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                {link}
              </Fragment>
            ))}
          </nav>
          <div className="acc-right">
            <SmartLink href={HELP_HREF} className="acc-help">
              Help
            </SmartLink>
            <button type="button" onClick={logout} className="acc-signout">
              Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Account" className="acc-subnav">
          {links}
        </nav>
      </header>
      <main id="main" className="acc-main">
        {children}
      </main>
    </div>
  );
}
