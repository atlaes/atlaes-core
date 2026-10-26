/**
 * Global motion switch for the marketing site. Read at build time from
 * `NEXT_PUBLIC_GPR_MOTION`; anything but `off` enables motion. The layout
 * writes it to `.mk[data-motion]`; CSS and client islands key off
 * `.mk[data-motion="on"]`.
 */
export const MOTION_ENABLED = process.env.NEXT_PUBLIC_GPR_MOTION !== 'off';

/** Value for the `data-motion` attribute on the `.mk` root. */
export const MOTION_ATTR: 'on' | 'off' = MOTION_ENABLED ? 'on' : 'off';

/**
 * Client-side check: motion switch on AND the user does not ask for
 * reduced motion. Safe to call during SSR (returns false).
 */
export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const root = document.querySelector('.mk');
  if (root && root.getAttribute('data-motion') !== 'on') return false;
  if (!root && !MOTION_ENABLED) return false;
  return !(
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
