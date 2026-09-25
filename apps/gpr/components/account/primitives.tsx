import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AccountStage, AccountStatusKind } from '@/lib/account-api';
import { STEP_LABELS } from '@/lib/account-api';

export function Card({
  title,
  children,
  className,
  as = 'h2',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  const Heading = as;
  return (
    <section
      className={
        'rounded-card border border-brand-stroke/60 bg-white p-5 sm:p-6 ' +
        (className || '')
      }
    >
      {title ? (
        <Heading className="mb-2 text-[17px] font-bold leading-snug text-brand-ink">
          {title}
        </Heading>
      ) : null}
      <div className="text-[15px] leading-relaxed text-brand-body">
        {children}
      </div>
    </section>
  );
}

const STATUS_STYLES: Record<AccountStatusKind, string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-brand-tint text-brand-navy ring-brand-pale',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200',
};

export function StatusChip({
  kind,
  children,
}: {
  kind: AccountStatusKind;
  children: ReactNode;
}) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ' +
        STATUS_STYLES[kind]
      }
    >
      {children}
    </span>
  );
}

export function StageChip({ stage }: { stage: AccountStage }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-navy">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-navy" aria-hidden />
      {STEP_LABELS[stage]}
    </span>
  );
}

const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const BUTTON_VARIANTS = {
  primary:
    'border-brand-navy bg-brand-navy text-white hover:bg-brand-blue hover:border-brand-blue',
  secondary: 'border-brand-navy bg-white text-brand-navy hover:bg-brand-tint',
};

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={
        BUTTON_BASE + ' ' + BUTTON_VARIANTS[variant] + ' ' + (className || '')
      }
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={
        BUTTON_BASE + ' ' + BUTTON_VARIANTS[variant] + ' ' + (className || '')
      }
    >
      {children}
    </Link>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={
        'font-semibold text-brand-navy underline-offset-2 hover:underline ' +
        (className || '')
      }
    >
      {children}
    </Link>
  );
}

export function PageTitle({
  children,
  lead,
}: {
  children: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-[26px] font-bold leading-tight text-brand-ink sm:text-[32px]">
        {children}
      </h1>
      {lead ? (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-brand-body">
          {lead}
        </p>
      ) : null}
    </header>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-brand-muted">{children}</p>;
}
