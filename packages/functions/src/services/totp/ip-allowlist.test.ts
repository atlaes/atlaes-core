import { describe, expect, it } from 'vitest';
import { ipAllowed, ipInCidr, isValidCidr, trustedClientIp } from './ip-allowlist';

describe('ip allowlist', () => {
  it('matches IPv4 addresses and ranges', () => {
    expect(ipInCidr('203.0.113.7', '203.0.113.0/24')).toBe(true);
    expect(ipInCidr('203.0.114.7', '203.0.113.0/24')).toBe(false);
    expect(ipInCidr('203.0.113.7', '203.0.113.7')).toBe(true);
    expect(ipInCidr('10.1.2.3', '0.0.0.0/0')).toBe(true);
    expect(ipInCidr('::ffff:203.0.113.7', '203.0.113.0/24')).toBe(true);
  });

  it('matches IPv6 ranges', () => {
    expect(ipInCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
    expect(ipInCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
    expect(ipInCidr('2001:db8:0:0:0:0:0:1', '2001:db8::1/128')).toBe(true);
    expect(ipInCidr('203.0.113.7', '2001:db8::/32')).toBe(false);
  });

  it('validates entries', () => {
    expect(isValidCidr('203.0.113.0/24')).toBe(true);
    expect(isValidCidr('2001:db8::/48')).toBe(true);
    expect(isValidCidr('203.0.113.0/33')).toBe(false);
    expect(isValidCidr('office')).toBe(false);
    expect(isValidCidr('1.2.3.4/x')).toBe(false);
  });

  it('empty list allows everyone; a list needs a known matching IP', () => {
    expect(ipAllowed(null, [])).toBe(true);
    expect(ipAllowed(null, ['203.0.113.0/24'])).toBe(false);
    expect(ipAllowed('198.51.100.1', ['203.0.113.0/24', '198.51.100.0/24'])).toBe(true);
  });

  it('takes the proxy-appended X-Forwarded-For entry, not the spoofable first one', () => {
    expect(trustedClientIp('203.0.113.7, 198.51.100.9', null, 1)).toBe('198.51.100.9');
    expect(trustedClientIp('203.0.113.7, 198.51.100.9', null, 2)).toBe('203.0.113.7');
    expect(trustedClientIp('198.51.100.9', null, 1)).toBe('198.51.100.9');
    expect(trustedClientIp(undefined, '192.0.2.1', 1)).toBe('192.0.2.1');
    expect(trustedClientIp(undefined, undefined, 1)).toBeNull();
  });
});
