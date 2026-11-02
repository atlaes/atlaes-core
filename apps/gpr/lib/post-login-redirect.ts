/**
 * Where to send a customer after sign-in. The magic link only carries the
 * site origin, so the `?redirect=` target from /auth is kept in
 * localStorage until the link is opened (same browser).
 */
const KEY = 'gpr.postLoginRedirect';

export const DEFAULT_POST_LOGIN_PATH = '/claims';

/** Only same-site paths; rejects `//host` and absolute URLs. */
function isSafePath(path: string | null | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//');
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
