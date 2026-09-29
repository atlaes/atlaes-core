import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  isExternalHref,
  isLiveHref,
  toSitePath,
} from '@/content/registries/links';

export interface SmartLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Class applied instead of `className` when the target ships dark. */
  darkClassName?: string;
  title?: string;
  'aria-label'?: string;
}

/**
 * Renders an internal link only when its target is live in the links /
 * country registries ("ship dark"); otherwise plain text in a span so the
 * copy survives and no dead link is rendered. External links open in a
 * new tab with `noopener`. Absolute site URLs from the copy are rewritten
 * to site-relative paths.
 */
export function SmartLink({
  href,
  children,
  className,
  darkClassName,
  title,
  ...rest
}: SmartLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className={className}
        title={title}
        aria-label={rest['aria-label']}
      >
        {children}
      </a>
    );
  }
  const path = toSitePath(href);
  if (!isLiveHref(path)) {
    return (
      <span className={darkClassName || className} data-dark-link={path}>
        {children}
      </span>
    );
  }
  if (/^(mailto:|tel:|#)/.test(path)) {
    return (
      <a
        href={path}
        className={className}
        title={title}
        aria-label={rest['aria-label']}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={path}
      className={className}
      title={title}
      aria-label={rest['aria-label']}
    >
      {children}
    </Link>
  );
}
