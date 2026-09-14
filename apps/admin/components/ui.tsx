'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared UI kit for the admin app and the partner portal.
 *
 * Colour roles: brand green for navigation and headings, lime for the one
 * primary action per screen, semantic tones (info / wait / good / bad) for
 * state. Cards are reserved for objects that are really separate (the
 * sticky sidebar, a summary); groups of facts are plain lists.
 */

// ---------------------------------------------------------------- buttons

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-accent text-brand-dark hover:bg-[#8fdc60] disabled:opacity-50',
  secondary:
    'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50',
  ghost: 'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
  danger: 'text-red-700 hover:bg-red-50 disabled:opacity-50',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}) {
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm';
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:cursor-not-allowed ${sizing} ${BUTTON[variant]} ${className}`}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = 'secondary',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${BUTTON[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

// ------------------------------------------------------------ form controls

export const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-dark';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-gray-700">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

// ------------------------------------------------------------------- state

export type Tone = 'neutral' | 'info' | 'wait' | 'good' | 'bad' | 'brand';

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-gray-400',
  info: 'bg-sky-500',
  wait: 'bg-amber-500',
  good: 'bg-emerald-500',
  bad: 'bg-red-500',
  brand: 'bg-brand-dark',
};

const TONE_PILL: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  info: 'bg-sky-50 text-sky-800',
  wait: 'bg-amber-50 text-amber-800',
  good: 'bg-emerald-50 text-emerald-800',
  bad: 'bg-red-50 text-red-800',
  brand: 'bg-brand-light text-brand-dark',
};

/** Dot + word. The default way to show a state in a table row. */
export function StatusDot({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-800">
      <span className={`h-2 w-2 flex-none rounded-full ${TONE_DOT[tone]}`} />
      {children}
    </span>
  );
}

/** Pill. Reserved for a classification, not a state (product, route). */
export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONE_PILL[tone]}`}
    >
      {children}
    </span>
  );
}

export const CLAIM_STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  ready: 'info',
  submitted: 'info',
  processing: 'wait',
  completed: 'good',
  rejected: 'bad',
};

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  ready: 'Ready',
  submitted: 'Submitted',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
};

// ------------------------------------------------------------- stat tiles

export function StatTile({
  label,
  value,
  hint,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex min-w-0 flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors ${
        active
          ? 'border-brand-dark bg-brand-light'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-2xl font-semibold tabular-nums text-brand-dark">
        {value}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </Tag>
  );
}

// ----------------------------------------------------------------- tables

export function Table({
  children,
  minWidth = 720,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto border-t border-gray-200">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  onClick,
  sorted,
}: {
  children?: ReactNode;
  align?: 'left' | 'right';
  onClick?: () => void;
  sorted?: 'asc' | 'desc' | null;
}) {
  const base = `px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 ${
    align === 'right' ? 'text-right' : 'text-left'
  }`;
  if (!onClick) return <th className={base}>{children}</th>;
  return (
    <th className={base}>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 uppercase hover:text-gray-800"
      >
        {children}
        <span className="text-[10px] text-gray-400">
          {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className = '',
  nowrap = true,
}: {
  children?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 text-gray-800 ${nowrap ? 'whitespace-nowrap' : ''} ${
        align === 'right' ? 'text-right tabular-nums' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50/70">
      <tr>{children}</tr>
    </thead>
  );
}

export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm text-gray-500">
      <span className="tabular-nums">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          size="sm"
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page === pages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- fact groups

export function FactGroup({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h3>
        {action}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

export function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  if (value === null || value === undefined || value === '' || value === '—')
    return null;
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- stepper

export function Stepper({
  steps,
  current,
  size = 'md',
}: {
  steps: { key: string; label: string }[];
  current: string;
  size?: 'sm' | 'md';
}) {
  const idx = Math.max(
    0,
    steps.findIndex((s) => s.key === current)
  );
  return (
    <ol
      className={`flex w-full gap-1 ${size === 'sm' ? '' : 'gap-2'}`}
      aria-label="Progress"
    >
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
        const bar =
          state === 'done'
            ? 'bg-brand-accent'
            : state === 'current'
              ? 'bg-brand-dark'
              : 'bg-gray-200';
        return (
          <li
            key={s.key}
            className="min-w-0 flex-1"
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <div
              className={`${size === 'sm' ? 'h-1' : 'h-1.5'} rounded-full ${bar}`}
            />
            {size === 'md' && (
              <div
                className={`mt-1.5 truncate text-xs ${
                  state === 'current'
                    ? 'font-semibold text-brand-dark'
                    : state === 'done'
                      ? 'text-gray-700'
                      : 'text-gray-400'
                }`}
              >
                {s.label}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ misc

export function Spinner({ full }: { full?: boolean }) {
  const dot = (
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-accent border-t-transparent" />
  );
  if (!full) return dot;
  return (
    <div className="flex min-h-[50vh] items-center justify-center">{dot}</div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 text-gray-300">{icon}</div>}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-gray-400">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-block text-sm text-gray-500 hover:text-gray-800"
        >
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-brand-dark">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function ErrorText({
  error,
  fallback,
}: {
  error: unknown;
  fallback: string;
}) {
  const e = error as {
    response?: { data?: { error?: string } };
    message?: string;
  } | null;
  const message = e?.response?.data?.error ?? e?.message ?? fallback;
  return <p className="text-sm text-red-700">{message}</p>;
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
