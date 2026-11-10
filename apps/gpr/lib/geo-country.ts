import { headers } from 'next/headers';

/**
 * Visitor country from the CDN's GeoIP header: CloudFront-Viewer-Country,
 * which SST's router function also copies to `x-open-next-country`
 * (Vercel / Cloudflare equivalents as fallbacks). Server-side ordering
 * hint for the country selects only: read per request, never stored, no
 * cookie. Null when the CDN does not forward a country.
 */
export function geoCountryFromHeaders(): string | null {
  try {
    const h = headers();
    const raw =
      h.get('x-open-next-country') ||
      h.get('cloudfront-viewer-country') ||
      h.get('x-vercel-ip-country') ||
      h.get('cf-ipcountry') ||
      '';
    const code = raw.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : null;
  } catch {
    return null;
  }
}
