// Only follow `?redirect=` values that are same-origin paths. The backend
// applies the same rule to the magic-link `redirectUrl` (audit contract 7):
// a single leading slash, never `//host` or `/\host` (both open redirects in
// browsers), and no backslashes anywhere.
const SAFE_PATH = /^\/(?![/\\])[^\\]*$/;

export function isSafeRedirectPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    SAFE_PATH.test(value) &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  return isSafeRedirectPath(value) ? value : fallback;
}
