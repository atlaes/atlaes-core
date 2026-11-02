/**
 * Where to send a customer after sign-in. The magic link only carries the
 * site origin, so the `?redirect=` target from /auth is kept in
 * localStorage until the link is opened (same browser).
 */
const KEY = 'gpr.postLoginRedirect';

export const DEFAULT_POST_LOGIN_PATH = '/claims';

/**
 * Same-site path only (the backend applies the same `^/(?!/)` rule to the
 * magic-link `redirect`): one leading slash, so no absolute URL and no
 * `//host`; no backslash or control character, which browsers turn into
 * `//host` when they normalise the URL.
 */
export function isSafePath(path: string | null | undefined): path is string {
  return (
    typeof path === 'string' &&
    /^\/(?!\/)/.test(path) &&
    // eslint-disable-next-line no-control-regex
    !/[\\\u0000-\u001f\u007f]/.test(path)
  );
}

/** `path` when it is safe to follow, else the default landing page. */
export function safePostLoginPath(path: string | null | undefined): string {
  return isSafePath(path) ? path : DEFAULT_POST_LOGIN_PATH;
}

export function rememberPostLoginRedirect(path: string | null): void {
  try {
    if (isSafePath(path)) localStorage.setItem(KEY, path);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: fall back to the default path.
  }
}

export function takePostLoginRedirect(): string {
  try {
    const path = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (isSafePath(path)) return path;
  } catch {
    // Storage blocked: fall back to the default path.
  }
  return DEFAULT_POST_LOGIN_PATH;
}
