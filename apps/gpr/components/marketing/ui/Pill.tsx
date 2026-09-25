import type { ReactNode } from 'react';
import { SmartLink } from './SmartLink';

export interface PillProps {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
}

/** Pill button (fully rounded). Ships dark like every SmartLink. */
export function Pill({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: PillProps) {
  const cls = [
    'mk-pill',
    'mk-pill-' + variant,
    'mk-pill-' + size,
    className || '',
  ]
    .join(' ')
    .trim();
  return (
    <SmartLink
      href={href}
      className={cls}
      darkClassName={cls + ' mk-pill-dark'}
    >
      {children}
    </SmartLink>
  );
}
