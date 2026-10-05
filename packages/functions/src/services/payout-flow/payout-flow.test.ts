import { describe, expect, it } from 'vitest';
import {
  addOneMonth,
  clientReviewBy,
  isIsoDate,
  objectionDeadline,
  reviewDates,
} from './deadlines';
import { buildFeePanel, eurShort, percent } from './fee-panel';
import {
  bankFieldsFor,
  countryCode,
  isValidAbaRouting,
  isValidBic,
  isValidClabe,
  isValidIban,
  isValidIfsc,
  isValidSortCode,
  validateBankDetails,
} from './bank-validation';
import { buildRouteOptions, conversionCostRate } from './providers';
import { parseEcbDailyXml } from './ecb';
import { parseGermanAmount, parsePeriodsFromOcr } from './periods';
import { holderIsClient, reviewReasons } from './review-flags';

describe('deadline maths', () => {
  it('adds one calendar month, clamped to the month end', () => {
    expect(addOneMonth('2026-09-21')).toBe('2026-10-21');
    expect(addOneMonth('2026-01-31')).toBe('2026-02-28');
    expect(addOneMonth('2028-01-31')).toBe('2028-02-29');
    expect(addOneMonth('2026-12-15')).toBe('2027-01-15');
    expect(addOneMonth('2026-03-31')).toBe('2026-04-30');
  });

  it('shows the client the objection deadline minus 7 days', () => {
    expect(objectionDeadline('2026-09-21')).toBe('2026-10-21');
    expect(clientReviewBy('2026-09-21')).toBe('2026-10-14');
    expect(reviewDates('2026-01-31')).toEqual({
      objectionDeadline: '2026-02-28',
      clientReviewBy: '2026-02-21',
    });
    // crosses a month boundary backwards
    expect(clientReviewBy('2026-02-03')).toBe('2026-02-24');
  });

  it('validates ISO dates', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('21.09.2026')).toBe(false);
  });
});

describe('fee panel selection', () => {
  it('capped standard panel (Figma 10)', () => {
    const p = buildFeePanel(29601.9);
    expect(p.variant).toBe('standard');
    expect(p.rows.map((r) => [r.kind, r.label, r.amount])).toEqual([
      ['refund', 'Refund paid by the pension office', '€29,601.90'],
      ['fee', 'Service fee — capped at €2,500, including VAT', '− €2,500.00'],
      [
        'included',
        'Included: legal and escrow services — Vividius Rechtsanwälte',
        '€178.50',
      ],
      [
        'included',
        'Included: Germany Pension Refund service — ATLAES GmbH',
        '€2,321.50',
      ],
      ['total', 'Amount available for payout', '€27,101.90'],
    ]);
    expect(p.expander?.title).toBe('What does the service fee cover?');
    expect(p.expander?.paragraphs[0]).toContain(
      '9.75% of your approved refund, capped at €2,500'
    );
    expect(p.flags).toEqual([]);
  });

  it('uncapped standard panel uses the rate wording and brief check figures', () => {
    const p = buildFeePanel(3038.49);
    expect(p.rows[1].label).toBe('Service fee — 9.75%, including VAT');
    expect(p.rows.map((r) => r.value)).toEqual([
      3038.49, 296.25, 178.5, 117.75, 2742.24,
    ]);
    const q = buildFeePanel(3305.88);
    expect(q.rows.map((r) => r.value)).toEqual([
      3305.88, 322.32, 178.5, 143.82, 2983.56,
    ]);
  });

  it('small refund: fee line only, no expander, flagged (Figma 13)', () => {
    const p = buildFeePanel(1500);
    expect(p.variant).toBe('small');
    expect(p.rows.map((r) => r.kind)).toEqual(['refund', 'fee', 'total']);
    expect(p.rows[1].amount).toBe('− €146.25');
    expect(p.rows[2].amount).toBe('€1,353.75');
    expect(p.expander).toBeNull();
    expect(p.flags).toEqual(['small refund – annual settlement']);
  });

  it('threshold: fee exactly €178.50 is a small refund', () => {
    expect(buildFeePanel(1830.77).variant).toBe('small');
    // fee rounds to 178.50 up to 1,830.82; the rule is on the fee
    expect(buildFeePanel(1830.82).variant).toBe('small');
    expect(buildFeePanel(1830.83).variant).toBe('standard');
  });

  it('formats config values', () => {
    expect(percent(0.0975)).toBe('9.75%');
    expect(eurShort(2500)).toBe('€2,500');
  });
});

describe('route options (text F)', () => {
  it('EUR account → SEPA, no choice', () => {
    const r = buildRouteOptions({
      amountAvailableEur: 100,
      currency: 'EUR',
      referenceRate: null,
    });
    expect(r.choiceNeeded).toBe(false);
    expect(r.options.map((o) => o.route)).toEqual(['A']);
  });

  it('tiers 1.5 / 1.0 / 0.7 %', () => {
    expect(conversionCostRate(14999.99)).toBe(0.015);
    expect(conversionCostRate(15000)).toBe(0.01);
    expect(conversionCostRate(25000)).toBe(0.01);
    expect(conversionCostRate(25000.01)).toBe(0.007);
  });

  it('option 2 figures on the amount available (Figma 11)', () => {
    const r = buildRouteOptions({
      amountAvailableEur: 27101.9,
      currency: 'usd',
      referenceRate: { rate: 1.1, date: '2026-09-21' },
    });
    const o2 = r.options[1];
    expect(o2.available).toBe(true);
    expect(o2.costRate).toBe(0.007);
    expect(o2.costEur).toBe(189.71);
    expect(o2.estimatedTargetAmount).toBe(
      Math.round((27101.9 - 189.71) * 1.1 * 100) / 100
    );
  });

  it('option 2 hidden when the register lacks the currency or no rate', () => {
    expect(
      buildRouteOptions({
        amountAvailableEur: 5000,
        currency: 'XOF',
        referenceRate: { rate: 655, date: 'x' },
      }).options[1].available
    ).toBe(false);
    expect(
      buildRouteOptions({
        amountAvailableEur: 5000,
        currency: 'USD',
        referenceRate: null,
      }).options[1].available
    ).toBe(false);
  });

  it('parses the ECB daily XML', () => {
    const xml = `<Cube><Cube time='2026-09-21'><Cube currency='USD' rate='1.1734'/><Cube currency='GBP' rate='0.8712'/></Cube></Cube>`;
    expect(parseEcbDailyXml(xml)).toEqual({
      date: '2026-09-21',
      rates: { USD: 1.1734, GBP: 0.8712 },
    });
    expect(parseEcbDailyXml('<x/>')).toBeNull();
  });
});

describe('bank validators', () => {
  it('IBAN mod-97 and country length', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(isValidIban('NL91 ABNA 0417 1643 00')).toBe(true);
    expect(isValidIban('GB29 NWBK 6016 1331 9268 19')).toBe(true);
    expect(isValidIban('DE89 3704 0044 0532 0130 01')).toBe(false);
    expect(isValidIban('DE89 3704 0044 0532 0130')).toBe(false);
    expect(isValidIban('')).toBe(false);
  });
  it('BIC', () => {
    expect(isValidBic('COBADEFFXXX')).toBe(true);
    expect(isValidBic('ABNANL2A')).toBe(true);
    expect(isValidBic('ABNA NL2')).toBe(false);
  });
  it('US routing (ABA checksum)', () => {
    expect(isValidAbaRouting('021000021')).toBe(true);
    expect(isValidAbaRouting('011000015')).toBe(true);
    expect(isValidAbaRouting('021000022')).toBe(false);
    expect(isValidAbaRouting('12345')).toBe(false);
  });
  it('IFSC, sort code, CLABE', () => {
    expect(isValidIfsc('SBIN0001234')).toBe(true);
    expect(isValidIfsc('SBIN1001234')).toBe(false);
    expect(isValidSortCode('12-34-56')).toBe(true);
    expect(isValidSortCode('12-34-5')).toBe(false);
    expect(isValidClabe('032180000118359719')).toBe(true);
    expect(isValidClabe('032180000118359718')).toBe(false);
  });

  it('shows only the fields the route needs', () => {
    expect(bankFieldsFor('DE', 'A').map((f) => [f.key, f.required])).toEqual([
      ['iban', true],
      ['bic', false],
    ]);
    expect(bankFieldsFor('US', 'B').map((f) => [f.key, f.required])).toEqual([
      ['accountNumber', true],
      ['routingNumber', true],
      ['bic', false],
    ]);
    expect(
      bankFieldsFor('US', 'C').find((f) => f.key === 'bic')?.required
    ).toBe(true);
    expect(bankFieldsFor('IN', 'B').map((f) => f.key)).toContain('ifsc');
    expect(bankFieldsFor('AU', 'B').map((f) => f.key)).toContain('bsb');
    expect(bankFieldsFor('CA', 'B').map((f) => f.key)).toEqual([
      'accountNumber',
      'transitNumber',
      'institutionNumber',
      'bic',
    ]);
    expect(bankFieldsFor('MX', 'C').map((f) => f.key)).toEqual([
      'clabe',
      'bic',
    ]);
    expect(bankFieldsFor('TR', 'C').map((f) => f.key)).toEqual(['iban', 'bic']);
  });

  it('validates and normalises SEPA details', () => {
    const r = validateBankDetails(
      {
        accountHolder: 'Joseph Okafor',
        bank: 'Commerzbank',
        country: 'DE',
        currency: 'EUR',
        iban: 'de89370400440532013000',
        bic: 'cobadeffxxx',
      },
      'A'
    );
    expect(r.ok).toBe(true);
    expect(r.account).toMatchObject({
      iban: 'DE89 3704 0044 0532 0130 00',
      accountNumber: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
      routingLabel: null,
    });
  });

  it('rejects SEPA for non-EUR and mismatched IBAN country', () => {
    const r = validateBankDetails(
      {
        accountHolder: 'A',
        bank: 'B',
        country: 'NL',
        currency: 'USD',
        iban: 'DE89370400440532013000',
      },
      'A'
    );
    expect(r.ok).toBe(false);
    expect(r.errors.currency).toBeTruthy();
    expect(r.errors.iban).toBeTruthy();
  });

  it('US route C with routing label for the ZE', () => {
    const r = validateBankDetails(
      {
        accountHolder: 'Jane Doe',
        bank: 'Chase',
        country: 'US',
        currency: 'USD',
        accountNumber: '123456789',
        routingNumber: '021000021',
        bic: 'CHASUS33',
      },
      'C'
    );
    expect(r.ok).toBe(true);
    expect(r.account).toMatchObject({
      routingLabel: 'Routing number',
      routingValue: '021000021',
    });
    const missingBic = validateBankDetails(
      {
        accountHolder: 'Jane Doe',
        bank: 'Chase',
        country: 'US',
        currency: 'USD',
        accountNumber: '123456789',
        routingNumber: '021000021',
      },
      'C'
    );
    expect(missingBic.errors.bic).toBeTruthy();
  });

  it('country names to codes', () => {
    expect(countryCode('Germany')).toBe('DE');
    expect(countryCode('netherlands')).toBe('NL');
    expect(countryCode('USA')).toBe('US');
    expect(countryCode('in')).toBe('IN');
    expect(countryCode('Atlantis')).toBeNull();
  });
});

describe('payout-details review flags', () => {
  const client = {
    firstName: 'Joseph',
    lastName: 'Okafor',
    residenceCountry: 'Nigeria',
    nationality: 'NG',
  };
  const intake = {
    accountHolderName: 'Joseph Okafor',
    iban: 'DE89370400440532013000',
    accountNumber: null,
    swiftBic: null,
    bsb: null,
    bankCountry: 'Germany',
  };
  it('no change, own account → only the country flag when abroad', () => {
    const r = reviewReasons(
      {
        accountHolder: 'Joseph Okafor',
        country: 'DE',
        iban: 'DE89 3704 0044 0532 0130 00',
        accountNumber: null,
        bic: null,
      },
      intake,
      client
    );
    expect(r.map((x) => x.kind)).toEqual(['country_mismatch']);
  });
  it('changed IBAN and third-party holder', () => {
    const r = reviewReasons(
      {
        accountHolder: 'Mary Smith',
        country: 'NG',
        iban: null,
        accountNumber: '0123456789',
        bic: null,
      },
      intake,
      client
    );
    expect(r.map((x) => x.kind)).toEqual([
      'bank_details_changed',
      'holder_not_client',
    ]);
  });
  it('holder matching ignores accents and order', () => {
    expect(holderIsClient('OKAFOR, Joséph', client)).toBe(true);
    expect(holderIsClient('J. Okafor', client)).toBe(false);
  });
});

describe('periods from OCR', () => {
  it('parses rows and amounts', () => {
    const text = [
      '| Zeitraum | Entgelt | Beiträge |',
      '| 01.03.2019 - 31.12.2019 | 38.250,00 | 3.557,25 |',
      '| 01.01.2020 – 31.12.2020 | 52.100,00 EUR | 4.845,30 EUR |',
      'vom 01.01.2021 bis 30.09.2021 Entgelt 40.000,00',
      'Erstattungsbetrag: 3.038,49 EUR',
    ].join('\n');
    expect(parsePeriodsFromOcr(text)).toEqual([
      {
        from: '2019-03-01',
        to: '2019-12-31',
        entgeltEur: 38250,
        contributionsEur: 3557.25,
      },
      {
        from: '2020-01-01',
        to: '2020-12-31',
        entgeltEur: 52100,
        contributionsEur: 4845.3,
      },
      {
        from: '2021-01-01',
        to: '2021-09-30',
        entgeltEur: 40000,
        contributionsEur: null,
      },
    ]);
    expect(parseGermanAmount('29.601,90')).toBe(29601.9);
    expect(parseGermanAmount('3.038,49 EUR')).toBe(3038.49);
  });
});
