import type { ReactNode } from 'react';
import { SmartLink } from './SmartLink';

export type PillVariant =
  | 'primary'
  | 'secondary'
  | 'tint'
  | 'inverse'
  | 'light'
  | 'ghost';

export interface PillProps {
  href: string;
  children: ReactNode;
  /**
   * `primary` navy/white · `secondary` = `tint` (#d7e4f6 / navy, the Figma
   * "Secondary") · `inverse` white/navy for navy bands · `light`
   * #5e8cd9/ink for dark bands · `ghost` text link.
   */
  variant?: PillVariant;
  /** Height 44 (`sm`) / 52 (`md`, default) / 60 (`lg`); radius 100. */
  size?: 'sm' | 'md' | 'lg';
  /** Append the "››" arrow glyph of the GPR / Button component. */
  arrow?: boolean;
  className?: string;
}

/** Pill button (GPR / Button 49:129). Ships dark like every SmartLink. */
export function Pill({
  href,
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
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
      {arrow ? (
        <span className="mk-pill-arrow" aria-hidden="true">
          ››
        </span>
      ) : null}
    </SmartLink>
  );
}
