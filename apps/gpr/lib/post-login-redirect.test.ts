import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POST_LOGIN_PATH,
  isSafePath,
  safePostLoginPath,
} from './post-login-redirect';

describe('isSafePath', () => {
  it('accepts same-site paths', () => {
    expect(isSafePath('/')).toBe(true);
    expect(isSafePath('/claims')).toBe(true);
    expect(isSafePath('/claims/new?from=calculator#top')).toBe(true);
    expect(isSafePath('/account/payout/release')).toBe(true);
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(isSafePath('https://evil.example/claims')).toBe(false);
    expect(isSafePath('//evil.example')).toBe(false);
    expect(isSafePath('///evil.example')).toBe(false);
    expect(isSafePath('javascript:alert(1)')).toBe(false);
  });

  it('rejects backslashes and control characters browsers normalise', () => {
    expect(isSafePath('/\\evil.example')).toBe(false);
    expect(isSafePath('/\\\\evil.example')).toBe(false);
    expect(isSafePath('/\t/evil.example')).toBe(false);
    expect(isSafePath('/\n/evil.example')).toBe(false);
  });

  it('rejects empty and non-string values', () => {
    expect(isSafePath('')).toBe(false);
    expect(isSafePath(null)).toBe(false);
    expect(isSafePath(undefined)).toBe(false);
    expect(isSafePath('claims')).toBe(false);
  });
});

describe('safePostLoginPath', () => {
  it('falls back to the default landing page', () => {
    expect(safePostLoginPath('/claims/abc')).toBe('/claims/abc');
    expect(safePostLoginPath('//evil.example')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safePostLoginPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});
