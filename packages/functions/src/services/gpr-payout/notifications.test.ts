import { describe, expect, it } from 'vitest';
import {
  formatReviewDate,
  payoutNotification,
  pickPayoutNotification,
  reviewDeadlineFromReceipt,
  type PayoutNotificationKind,
} from './notifications';

const KINDS: PayoutNotificationKind[] = ['A1', 'A2', 'A3'];
const base = {
  firstName: 'Joseph',
  amountEur: 29601.9,
  reviewBy: new Date(2026, 9, 14),
  portalUrl: 'https://germanypensionrefund.com/account/payout?case=1&x=2',
  caseManagerSignature: 'Trixie\nClient Account Manager',
};

/** Brief placeholders look like "[first name]", "[date]", "€[amount]". */
const PLACEHOLDER = /\[[^\]]*\]|\{\{|\}\}|undefined|null|NaN/;

describe('payout e-mails A1–A3', () => {
  it.each(KINDS)('%s resolves every placeholder in all parts', (kind) => {
    const m = payoutNotification(kind, base);
    // Outlook conditional comments use brackets; strip them first.
    const html = (m.html ?? '').replace(
      /<!--\[if [^\]]*\]>|<!\[endif\]-->|<!--<!\[endif\]-->/g,
      ''
    );
    for (const part of [m.subject, m.text, html, m.preheader ?? ''])
      expect(part).not.toMatch(PLACEHOLDER);
    expect(m.text).toContain('Hi Joseph,');
    expect(m.text).toContain('€29,601.90');
    expect(m.html).toContain('€29,601.90');
    expect(m.text).toContain('Best regards,\nTrixie\nClient Account Manager');
    expect(m.html).toContain('Trixie<br>Client Account Manager');
  });

  it.each(KINDS)('%s has a plain-text part and an HTML part', (kind) => {
    const m = payoutNotification(kind, base);
    expect(m.text.length).toBeGreaterThan(200);
    expect(m.text).not.toMatch(/<[a-z]/i);
    expect(m.text).toContain(`${m.buttonLabel}: ${base.portalUrl}`);
    expect(m.text).toContain('Thank you for trusting us with your refund.');
    expect(m.html).toMatch(/^<!DOCTYPE html>/);
    expect(m.html).not.toMatch(/<link|<style|@import|class="/);
    expect(m.html).toContain('max-width:576px');
    // Bulletproof button: VML for Outlook + HTML link, escaped URL.
    expect(m.html).toContain('<v:roundrect');
    expect(m.html).toContain(
      'href="https://germanypensionrefund.com/account/payout?case=1&amp;x=2"'
    );
    // Hidden preheader with the opening sentence.
    expect(m.preheader).toMatch(/^Good news: your German pension refund/);
    expect(m.html).toContain(`display:none`);
  });

  it('A3 is chosen when funds and decision arrive on the same day', () => {
    expect(
      pickPayoutNotification({
        fundsReceivedAt: new Date('2026-09-21T06:00:00Z'),
        decisionReceivedAt: new Date('2026-09-21T16:00:00Z'),
      })
    ).toBe('A3');
    // Same Berlin day although the UTC dates differ (00:30 CEST = 22:30Z).
    expect(
      pickPayoutNotification({
        fundsReceivedAt: new Date('2026-09-20T22:30:00Z'),
        decisionReceivedAt: new Date('2026-09-21T15:00:00Z'),
      })
    ).toBe('A3');
    expect(
      pickPayoutNotification({
        fundsReceivedAt: new Date('2026-09-21T06:00:00Z'),
        decisionReceivedAt: null,
      })
    ).toBe('A1');
    expect(
      pickPayoutNotification({
        fundsReceivedAt: null,
        decisionReceivedAt: new Date('2026-09-21T06:00:00Z'),
      })
    ).toBe('A2');
    expect(
      pickPayoutNotification({
        fundsReceivedAt: new Date('2026-09-21T06:00:00Z'),
        decisionReceivedAt: new Date('2026-09-22T06:00:00Z'),
      })
    ).toBeNull();
  });

  it('matches the brief word for word (A3 bullets)', () => {
    const m = payoutNotification('A3', base);
    expect(m.subject).toBe(
      'Your pension refund has been approved – two short steps to your payout'
    );
    expect(m.text).toContain(
      '- Review your decision by 14 Oct 2026. Please check that all your employment periods in Germany are listed.'
    );
    expect(m.text).toContain(
      'so please complete your review by 14 Oct 2026.\n\n- Authorise your payout.'
    );
  });

  it('derives the review date from the receipt at the firm', () => {
    // 10 Sep + 1 month = 10 Oct, − 7 days = 3 Oct.
    expect(formatReviewDate(reviewDeadlineFromReceipt(new Date(2026, 8, 10)), 'short')).toBe('3 Oct 2026');
    // 31 Jan + 1 month clamps to 28 Feb, − 7 days = 21 Feb.
    expect(formatReviewDate(reviewDeadlineFromReceipt(new Date(2027, 0, 31)), 'short')).toBe('21 Feb 2027');
    const m = payoutNotification('A2', {
      ...base,
      reviewBy: null,
      decisionReceivedAtFirm: new Date(2026, 8, 10),
    });
    expect(m.subject).toBe(
      'Your refund decision is in – please review it by 3 Oct 2026'
    );
  });

  it('refuses A2/A3 without a review date and defaults the signature', () => {
    expect(() =>
      payoutNotification('A2', { ...base, reviewBy: null })
    ).toThrow(/reviewBy/);
    const a1 = payoutNotification('A1', {
      firstName: 'Anita',
      amountEur: 3038.49,
      portalUrl: 'https://x.example',
    });
    expect(a1.text).toMatch(/Best regards,\n\S+/);
    expect(a1.text).not.toMatch(PLACEHOLDER);
  });

  it('escapes HTML in client data', () => {
    const m = payoutNotification('A1', { ...base, firstName: '<b>Jo</b>' });
    expect(m.html).toContain('Hi &lt;b&gt;Jo&lt;/b&gt;,');
  });
});
