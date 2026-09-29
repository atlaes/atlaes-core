import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { payoutNotification, pickPayoutNotification } from './notifications';
import {
  buildZahlungserklaerungText,
  renderZahlungserklaerung,
  TRANSLATION_LABEL,
  type ZahlungserklaerungInput,
} from './zahlungserklaerung';

const base: ZahlungserklaerungInput = {
  firstName: 'Joseph',
  lastName: 'Okafor',
  aktenzeichen: '06153-26',
  amountReceivedEur: 29601.9,
  invoiceNumber: 'RE-2026-0415',
  atlaesIban: 'DE00 0000 0000 0000 0000 00',
  route: 'A',
  account: {
    accountHolder: 'Joseph Okafor',
    bank: 'Commerzbank',
    accountNumber: 'DE89 3704 0044 0532 0130 00',
    bic: 'COBADEFFXXX',
    currency: 'EUR',
  },
  date: new Date(2026, 8, 21, 10, 5),
  signedAt: new Date(2026, 8, 21, 10, 7),
  documentId: 'ZE-2026-000123',
};

const flat = (s: { lines: string[] }[]) => s.flatMap((x) => x.lines);

describe('buildZahlungserklaerungText', () => {
  it('fills the standard variant with capped fee and route A', () => {
    const t = buildZahlungserklaerungText(base);
    expect(t.split).toMatchObject({
      fee: 2500,
      lawFirmFee: 178.5,
      atlaesShare: 2321.5,
      clientAmount: 27101.9,
    });
    const de = flat(t.german);
    expect(de).toContain(
      'Name: Joseph Okafor · Aktenzeichen Vividius: 06153-26'
    );
    expect(de).toContain('1. Überweisung an ATLAES GmbH: 2.321,50 EUR');
    expect(de).toContain(
      '2. Vergütung Vividius Rechtsanwälte: 178,50 EUR einschließlich Umsatzsteuer'
    );
    expect(de).toContain('3. Auszahlung des Restbetrags: 27.101,90 EUR');
    expect(de).toContain(
      'Der Restbetrag ist in Euro per SEPA auf das unten angegebene Konto zu überweisen.'
    );
    expect(de.some((l) => l.startsWith('Kontowährung'))).toBe(false); // route A: no currency line
    const en = flat(t.english);
    expect(en).toContain('3. Payout of the remaining amount: EUR 27,101.90');
    expect(en).toContain(
      'IBAN: DE00 0000 0000 0000 0000 00 · Payment reference: RE-2026-0415'
    );
    expect(en.some((l) => l.includes('Document ID ZE-2026-000123'))).toBe(true);
  });

  it('omits the Vividius line and renumbers in the small-refund variant', () => {
    const t = buildZahlungserklaerungText({ ...base, amountReceivedEur: 1500 });
    expect(t.split.smallRefund).toBe(true);
    const de = flat(t.german);
    expect(de).toContain('1. Überweisung an ATLAES GmbH: 146,25 EUR');
    expect(de.some((l) => l.startsWith('2. Vergütung'))).toBe(false);
    expect(de).toContain('2. Auszahlung des Restbetrags: 1.353,75 EUR');
  });

  it('uses route B wording with currency and routing fields', () => {
    const t = buildZahlungserklaerungText({
      ...base,
      route: 'B',
      account: {
        ...base.account,
        currency: 'INR',
        bank: 'HDFC',
        accountNumber: '50100123456789',
        bic: 'HDFCINBB',
        routingLabel: 'IFSC',
        routingValue: 'HDFC0001234',
      },
    });
    const de = flat(t.german);
    expect(de).toContain(
      'Ich beauftrage die Auszahlung über SummitFX mit Umrechnung in INR auf das unten angegebene Konto.'
    );
    expect(de).toContain('IFSC: HDFC0001234');
    expect(de).toContain('Kontowährung: INR');
    expect(flat(t.english)).toContain('Account currency: INR');
  });
});

describe('renderZahlungserklaerung', () => {
  it('renders German then English with the translation label', async () => {
    const doc = await PDFDocument.create();
    await renderZahlungserklaerung(doc, base);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(doc.getPageCount()).toBeLessThanOrEqual(2);
    expect(TRANSLATION_LABEL).toMatch(/German version is authoritative/);
  });
});

describe('payout notifications', () => {
  it('picks the e-mail by what arrived', () => {
    const d = new Date('2026-09-21T09:00:00Z');
    expect(
      pickPayoutNotification({ fundsReceivedAt: d, decisionReceivedAt: null })
    ).toBe('A1');
    expect(
      pickPayoutNotification({ fundsReceivedAt: null, decisionReceivedAt: d })
    ).toBe('A2');
    expect(
      pickPayoutNotification({
        fundsReceivedAt: d,
        decisionReceivedAt: new Date('2026-09-21T16:00:00Z'),
      })
    ).toBe('A3');
    expect(
      pickPayoutNotification({
        fundsReceivedAt: d,
        decisionReceivedAt: new Date('2026-09-23T16:00:00Z'),
      })
    ).toBeNull();
  });

  it('fills amounts, dates and the button link', () => {
    const m = payoutNotification('A2', {
      firstName: 'Joseph',
      amountEur: 29601.9,
      reviewBy: new Date(2026, 9, 14),
      portalUrl: 'https://app.example/decision',
    });
    expect(m.subject).toBe(
      'Your refund decision is in – please review it by 14 October 2026'
    );
    expect(m.text).toContain('€29,601.90');
    expect(m.text).toContain(
      'Review my decision: https://app.example/decision'
    );
    expect(m.text).toContain('[case manager signature]');
    const a1 = payoutNotification('A1', {
      firstName: 'Anita',
      amountEur: 3038.49,
      portalUrl: 'x',
    });
    expect(a1.subject).toContain('please authorise your payout');
  });
});
