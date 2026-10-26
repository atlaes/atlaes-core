import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AccountStage, AccountStatusKind } from '@/lib/account-api';
import { STEP_LABELS } from '@/lib/account-api';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Account card (Figma "Card / …"): white, 1px #c6c6c6, r-16, p-24; the
 * title is the navy 11px uppercase eyebrow. `tone="tint"` is the pale-blue
 * sidebar card, `size="sm"` the 13px sidebar body.
 */
export function Card({
  title,
  children,
  className,
  as = 'h2',
  tone = 'plain',
  size = 'md',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
  tone?: 'plain' | 'tint';
  size?: 'md' | 'sm';
}) {
  const Heading = as;
  return (
    <section
      className={cx(
        'acc-card',
        tone === 'tint' && 'acc-card-tint',
        size === 'sm' && 'acc-card-sm',
        className
      )}
    >
      {title ? <Heading className="acc-eyebrow">{title}</Heading> : null}
      {children}
    </section>
  );
}

export function StatusChip({
  kind,
  children,
}: {
  kind: AccountStatusKind;
  children: ReactNode;
}) {
  return <span className={'acc-chip acc-chip-' + kind}>{children}</span>;
}

export function StageChip({ stage }: { stage: AccountStage }) {
  return <span className="acc-chip acc-chip-stage">{STEP_LABELS[stage]}</span>;
}

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'sm' | 'md' | 'lg';

function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string
): string {
  return cx(
    'acc-btn',
    variant === 'secondary' && 'acc-btn-secondary',
    size === 'sm' && 'acc-btn-sm',
    size === 'lg' && 'acc-btn-lg',
    className
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
      className={buttonClass(variant, size, className)}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
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
    <Link href={href} className={cx('acc-link', className)}>
      {children}
    </Link>
  );
}

/** "← Back to your application" link above a page title. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="acc-back">
      {children}
    </Link>
  );
}

export function PageTitle({
  children,
  lead,
  chip,
}: {
  children: ReactNode;
  lead?: ReactNode;
  chip?: ReactNode;
}) {
  return (
    <header className="acc-head">
      {chip}
      <h1 className="acc-h1">{children}</h1>
      {lead ? <p className="acc-lead">{lead}</p> : null}
    </header>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="acc-empty">{children}</p>;
}

/** Page column: 960 (home), 800 (documents), 720 (updates), 640 (tasks). */
export function Column({
  width = 960,
  children,
}: {
  width?: 960 | 800 | 720 | 640;
  children: ReactNode;
}) {
  return (
    <div className={cx('acc-col', width !== 960 && 'acc-col-' + width)}>
      {children}
    </div>
  );
}
