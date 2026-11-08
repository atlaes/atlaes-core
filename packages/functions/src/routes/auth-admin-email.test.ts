import { describe, expect, it } from 'vitest';
import { isAutoAdminEmail } from './auth';

describe('isAutoAdminEmail', () => {
  it('admits the company domains on every stage', () => {
    expect(isAutoAdminEmail('ops@atlaes.de', 'production')).toBe(true);
    expect(isAutoAdminEmail('Dev@Alibuas.com', 'staging')).toBe(true);
  });

  it('admits the listed personal address on staging only', () => {
    expect(isAutoAdminEmail('kkalibuas@gmail.com', 'staging')).toBe(true);
    expect(isAutoAdminEmail(' KKalibuas@Gmail.com ', 'staging')).toBe(true);
    expect(isAutoAdminEmail('kkalibuas@gmail.com', 'production')).toBe(false);
    expect(isAutoAdminEmail('kkalibuas@gmail.com', undefined)).toBe(false);
    expect(isAutoAdminEmail('kkalibuas@gmail.com', '')).toBe(false);
  });

  it('refuses everyone else', () => {
    expect(isAutoAdminEmail('kalibuas@gmail.com', 'staging')).toBe(false);
    expect(isAutoAdminEmail('someone@gmail.com', 'staging')).toBe(false);
    expect(isAutoAdminEmail('x@atlaes.de.evil.com', 'staging')).toBe(false);
  });
});
