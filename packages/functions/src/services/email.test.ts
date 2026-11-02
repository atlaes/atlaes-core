import { describe, expect, it } from 'vitest';
import { generateMagicLinkEmailHtml, gprMagicLinkEmail } from './email';
import { renderPayoutEmailHtml } from './gpr-payout/email-templates/layout';

describe('email branding', () => {
  it('uses the hosted CompanyPension cash-outs and refunds logo in magic-link emails', () => {
    const html = generateMagicLinkEmailHtml(
      'https://staging.vbl.atlaes.de/auth/magic-link?token=test-token'
    );

    expect(html).toContain('/companypension-cashouts-refunds.svg');
    expect(html).toContain('CompanyPension Cash-outs &amp; Refunds');
  });

  it('brands the GPR sign-in mail as Germany Pension Refund', () => {
    const url = 'https://staging.gpr.atlaes.de/auth/magic-link?token=t';
    const mail = gprMagicLinkEmail(url);
    const html = renderPayoutEmailHtml(mail);

    expect(mail.subject).toBe('Your secure sign-in link');
    expect(html).toContain('Germany&nbsp;&rsaquo;&rsaquo;');
    expect(html).toContain(url);
    expect(html).not.toContain('CompanyPension');
  });
});
