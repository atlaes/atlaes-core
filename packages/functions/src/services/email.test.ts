import { describe, expect, it } from 'vitest';
import { generateMagicLinkEmailHtml } from './email';

describe('email branding', () => {
  it('uses the hosted CompanyPension cash-outs and refunds logo in magic-link emails', () => {
    const html = generateMagicLinkEmailHtml(
      'https://staging.vbl.atlaes.de/auth/magic-link?token=test-token'
    );

    expect(html).toContain('/companypension-cashouts-refunds.svg');
    expect(html).toContain('CompanyPension Cash-outs &amp; Refunds');
  });
});
