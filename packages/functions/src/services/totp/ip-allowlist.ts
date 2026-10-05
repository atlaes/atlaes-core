import { isIP } from 'node:net';

/**
 * IP helpers for the optional per-firm allowlist. Pure functions.
 */

interface ParsedIp {
  family: 4 | 6;
  value: bigint;
}

function parseIp(raw: string): ParsedIp | null {
  let ip = raw.trim();
  // IPv4-mapped IPv6 ("::ffff:203.0.113.5") compares as IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) ip = mapped[1];
  const family = isIP(ip);
  if (family === 4) {
    const value = ip
      .split('.')
      .reduce((acc, part) => (acc << 8n) | BigInt(Number(part)), 0n);
    return { family: 4, value };
  }
  if (family === 6) {
    const zoneless = ip.split('%')[0];
    let [head, tail] = zoneless.split('::') as [string, string | undefined];
    // Trailing embedded IPv4 ("64:ff9b::192.0.2.1")
    const toGroups = (s: string | undefined): string[] => {
      if (!s) return [];
      const parts = s.split(':');
      const last = parts[parts.length - 1];
      if (last.includes('.')) {
        const v4 = parseIp(last)!.value;
        parts.splice(
          parts.length - 1,
          1,
          (v4 >> 16n).toString(16),
          (v4 & 0xffffn).toString(16)
        );
      }
      return parts;
    };
    const headGroups = toGroups(head);
    const tailGroups = toGroups(tail);
    const groups =
      tail === undefined
        ? headGroups
        : [
            ...headGroups,
            ...new Array(8 - headGroups.length - tailGroups.length).fill('0'),
            ...tailGroups,
          ];
    if (groups.length !== 8) return null;
    const value = groups.reduce(
      (acc, g) => (acc << 16n) | BigInt(parseInt(g || '0', 16)),
      0n
    );
    return { family: 6, value };
  }
  return null;
}

/** "203.0.113.7", "203.0.113.0/24", "2001:db8::/32" — null when invalid. */
export function parseCidr(
  cidr: string
): { family: 4 | 6; network: bigint; prefix: number } | null {
  const [addr, prefixRaw] = cidr.trim().split('/');
  const ip = parseIp(addr);
  if (!ip) return null;
  const bits = ip.family === 4 ? 32 : 128;
  const prefix = prefixRaw === undefined ? bits : Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) return null;
  if (prefixRaw !== undefined && !/^\d+$/.test(prefixRaw)) return null;
  const shift = BigInt(bits - prefix);
  return { family: ip.family, network: (ip.value >> shift) << shift, prefix };
}

export function isValidCidr(cidr: string): boolean {
  return parseCidr(cidr) !== null;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const parsed = parseIp(ip);
  const range = parseCidr(cidr);
  if (!parsed || !range || parsed.family !== range.family) return false;
  const bits = parsed.family === 4 ? 32 : 128;
  const shift = BigInt(bits - range.prefix);
  return (parsed.value >> shift) << shift === range.network;
}

export function ipAllowed(ip: string | null, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  if (!ip) return false;
  return allowlist.some((cidr) => ipInCidr(ip, cidr));
}

/**
 * The caller's address as seen by our own proxy. The ALB appends the
 * peer address to X-Forwarded-For, so with one trusted hop the LAST entry
 * is reliable and earlier entries are client-supplied (spoofable).
 * PORTAL_TRUSTED_PROXY_HOPS adjusts this if a CDN is put in front.
 */
export function trustedClientIp(
  forwardedFor: string | undefined | null,
  realIp: string | undefined | null,
  hops = Number(process.env.PORTAL_TRUSTED_PROXY_HOPS ?? 1)
): string | null {
  const chain = (forwardedFor ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length > 0) {
    const index = Math.max(0, chain.length - Math.max(1, hops));
    return chain[index];
  }
  return realIp?.trim() || null;
}
