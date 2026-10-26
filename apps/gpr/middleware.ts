import { NextResponse, type NextRequest } from 'next/server';

/**
 * Language rule (item 17): the `de.` host serves the German view of the
 * site; pages on the EN_ONLY list have no German view, so a request for
 * them on `de.` bounces (301) to `www` with path and query preserved.
 *
 * The 301 map itself (`/get-your-refund`, the four ex-Yugoslav slugs)
 * lives in `next.config.js` redirects.
 */
const WWW_ORIGIN = 'https://www.germanypensionrefund.com';

/** Keep in sync with EN_ONLY_PATHS in lib/hreflang.ts (inlined: edge bundle). */
const EN_ONLY_PATHS = ['/phoebe', '/refundsib'];

function normalise(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (host.indexOf('de.') === 0) {
    const path = normalise(req.nextUrl.pathname);
    if (EN_ONLY_PATHS.indexOf(path) !== -1) {
      const target = WWW_ORIGIN + path + req.nextUrl.search;
      return NextResponse.redirect(target, 301);
    }
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and static files.
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
