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
    // Transparent overlay: every marketing page's first section is a dark
    // Hero, whose own background image now extends all the way to the top
    // of the page (y=0), so the pill nav floats directly over that
    // background instead of a separate bg-brand strip with its own
    // duplicated grid + glow. This removes the old header/hero seam. See
    // Hero.tsx's extra top padding, added to keep content clear of the
    // pill at this height.
    <header className="absolute inset-x-0 top-0 z-50 text-white">
      <div className="relative mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-10">
        {/* Floating translucent pill nav (Figma 1181:2341): glassy rounded
            bar over the dark hero, logo left, links centered, CTA right. */}
        <div className="flex h-[68px] items-center justify-between rounded-[10px] bg-white/[0.14] pl-4 pr-3 backdrop-blur-xl sm:pl-6 sm:pr-4">
          <Link
            href="/"
            aria-label="Company Pension home"
            className="shrink-0"
            onClick={() => setOpen(false)}
          >
            <CompanyPensionLogo className="h-auto w-[190px] sm:w-[204px]" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-[30px] md:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[17px] text-white/90 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/get-started"
            className="hidden rounded-[10px] bg-accent px-6 py-2.5 text-[17px] font-semibold text-brand transition-colors hover:bg-accent-hover md:inline-block"
          >
            Start your claim
          </Link>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white md:hidden"
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
            className="mt-2 rounded-[10px] bg-white/[0.12] px-4 pb-4 pt-2 backdrop-blur-xl md:hidden"
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
              className="mt-2 block rounded-[10px] bg-accent px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Start your claim
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export default MarketingNav;
