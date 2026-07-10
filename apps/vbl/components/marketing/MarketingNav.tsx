'use client';

import { useState } from 'react';
import Link from 'next/link';
import CompanyPensionLogo from '@/components/vbl/icons/CompanyPensionLogo';

const NAV_LINKS = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
  { label: 'About', href: '/about' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6">
        <Link
          href="/"
          aria-label="Company Pension home"
          className="shrink-0"
          onClick={() => setOpen(false)}
        >
          <CompanyPensionLogo className="h-auto w-[220px]" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base text-white/90 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/get-started"
          className="hidden rounded-brand bg-accent px-6 py-3 text-base font-medium text-brand transition-colors hover:bg-accent-hover md:inline-block"
        >
          Start your claim
        </Link>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-brand text-white md:hidden"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          aria-label="Primary mobile"
          className="border-t border-white/10 px-6 pb-6 pt-2 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base text-white/90 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/get-started"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-brand bg-accent px-6 py-3 text-center text-base font-medium text-brand transition-colors hover:bg-accent-hover"
          >
            Start your claim
          </Link>
        </nav>
      )}
    </header>
  );
}

export default MarketingNav;
