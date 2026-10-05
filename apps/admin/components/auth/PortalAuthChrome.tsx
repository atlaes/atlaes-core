'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Building blocks for the law-firm portal sign-in (Figma "Law-firm portal
 * & payout" → 01 · Sign-in with 2FA, node 1030:5131). Values are the
 * frame's: navy #002691, accent #5e8cd9, ink #181818, body #4b4f58,
 * muted #8c8c8c, line #c6c6c6, divider #f1f1f1.
 */
const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ');

/** Firm shown before the portal knows who signs in (single partner firm). */
export const DEFAULT_FIRM_NAME =
  process.env.NEXT_PUBLIC_PORTAL_FIRM_NAME || 'Vividius Rechtsanwälte';

export function PortalAuthTopBar({
  firmName = DEFAULT_FIRM_NAME,
  email,
  onSignOut,
}: {
  firmName?: string;
  email?: string | null;
  onSignOut?: () => void;
}) {
  return (
    <header className="flex min-h-[72px] w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[#f1f1f1] px-4 py-3 sm:px-10">
      <div className="flex items-center gap-[10px] whitespace-nowrap leading-none">
        <span className="text-[15px] font-extrabold text-[#002691]">
          {firmName}
        </span>
        <span className="text-[15px] text-[#8c8c8c]">·</span>
        <span className="text-[14px] font-semibold text-[#4b4f58]">
          Law-firm portal
        </span>
      </div>
      {(email || onSignOut) && (
        <div className="flex items-center gap-6 text-[14px] font-semibold leading-[1.4]">
          {email && (
            <span className="hidden text-[#4b4f58] sm:inline">{email}</span>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-[#002691] hover:underline"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  );
}

/** One step card: 40px padding, radius 20, 1px #c6c6c6, 20px gap. */
export function StepCard({
  step,
  title,
  intro,
  muted,
  children,
  labelledBy,
}: {
  step: string;
  title: ReactNode;
  intro?: ReactNode;
  muted?: boolean;
  children?: ReactNode;
  labelledBy: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-disabled={muted || undefined}
      className={cx(
        'flex min-w-0 flex-1 flex-col items-start gap-5 rounded-[20px] border border-[#c6c6c6] bg-white p-6 sm:p-10',
        muted && 'opacity-50'
      )}
    >
      <p className="text-[12px] font-bold uppercase leading-[1.4] tracking-[0.96px] text-[#5e8cd9]">
        {step}
      </p>
      <h1
        id={labelledBy}
        className="w-full text-[28px] font-extrabold leading-[1.15] tracking-[-0.28px] text-[#181818]"
      >
        {title}
      </h1>
      {intro && (
        <p className="w-full text-[15px] leading-[1.5] text-[#4b4f58]">
          {intro}
        </p>
      )}
      {children}
    </section>
  );
}

export function PrimaryButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        'flex h-[52px] w-full items-center justify-center rounded-[100px] bg-[#002691] px-7 text-[15px] font-bold leading-[1.4] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        'flex h-[44px] items-center justify-center rounded-[100px] border border-[#c6c6c6] bg-white px-5 text-[14px] font-semibold leading-[1.4] text-[#002691] hover:bg-[#f1f1f1] disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function FootNote({
  children,
  tone = 'muted',
  role,
}: {
  children: ReactNode;
  tone?: 'muted' | 'error' | 'body';
  role?: 'alert' | 'status';
}) {
  return (
    <p
      role={role}
      className={cx(
        'w-full text-[13px] leading-[1.5]',
        tone === 'muted' && 'text-[#8c8c8c]',
        tone === 'body' && 'text-[#4b4f58]',
        tone === 'error' && 'text-[#b42318]'
      )}
    >
      {children}
    </p>
  );
}

export function LinkButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="font-semibold text-[#002691] hover:underline disabled:cursor-not-allowed disabled:text-[#8c8c8c] disabled:no-underline"
    >
      {children}
    </button>
  );
}

export const fieldInputClass =
  'h-[52px] w-full rounded-[10px] border border-[#c6c6c6] bg-white px-4 text-[15px] leading-[1.4] text-[#181818] outline-none placeholder:text-[#8c8c8c] focus:border-2 focus:border-[#002691] focus:px-[15px] disabled:bg-[#f1f1f1] disabled:text-[#4b4f58]';
