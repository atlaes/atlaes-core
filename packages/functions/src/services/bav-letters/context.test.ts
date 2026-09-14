import { describe, expect, it } from 'vitest';
import type { ClaimDocumentRole } from '../../drizzle/schema/claims';
import { buildBavLetterContext, selectBavTemplateId } from './context';
import type { BavClaimFields } from './intake-validation';
import {
  MUSTER_2,
  MUSTER_2_A_DIRECT_EXPECTED,
  MUSTER_2_CLAIM,
} from './muster-2.fixture';
import { getBavTemplate } from './templates';

const LETTER_DATE = new Date(2026, 8, 7);
const DOCS_A: ClaimDocumentRole[] = [
  'passport',
  'drv_refund_decision',
  'provider_form',
  'employer_consent',
  'foreign_health_insurance',
];

const claim = (overrides: Partial<BavClaimFields> = {}): BavClaimFields => ({
  ...MUSTER_2_CLAIM,
  ...overrides,
});

describe('selectBavTemplateId', () => {
  it('combines route and signer', () => {
    expect(selectBavTemplateId('A', 'DIRECT')).toBe('A-DIRECT');
    expect(selectBavTemplateId('B', 'LAW')).toBe('B-LAW');
  });
});

describe('buildBavLetterContext', () => {
  it('reproduces the Muster 2 placeholder dictionary from a claim row', () => {
    const result = buildBavLetterContext(claim(), DOCS_A, {
      signer: 'DIRECT',
      letterDate: LETTER_DATE,
      signatureText: '[Unterschrift]',
    });
    expect(result.route).toBe('A');
    expect(result.templateId).toBe('A-DIRECT');
    expect(result.missing).toEqual([]);

    // Every placeholder in the spec's Muster 2 JSON must come out identical.
    const { client_email: _email, ...spec } = MUSTER_2;
    void _email;
    for (const [key, value] of Object.entries(spec)) {
      expect(result.context[key], key).toEqual(value);
    }
  });

  it('renders Muster 2 end to end from the claim row', () => {
    const result = buildBavLetterContext(claim(), DOCS_A, {
      signer: 'DIRECT',
      letterDate: LETTER_DATE,
      signatureText: '[Unterschrift]',
    });
    const { text, missing } = getBavTemplate(result.templateId).render({
      ...result.context,
      client_email: 'emily.carter@example.com',
    });
    expect(missing).toEqual([]);
    expect(text).toBe(MUSTER_2_A_DIRECT_EXPECTED);
  });

  it('derives client_gender from the salutation, falling back to passport gender', () => {
    const base = { signer: 'DIRECT' as const, letterDate: LETTER_DATE };
    expect(
      buildBavLetterContext(
        claim({ salutation: 'herr', gender: 'female' }),
        DOCS_A,
        base
      ).context.client_gender
    ).toBe('m');
    expect(
      buildBavLetterContext(
        claim({ salutation: null, gender: 'male' }),
        DOCS_A,
        base
      ).context.client_gender
    ).toBe('m');
    const other = buildBavLetterContext(
      claim({ salutation: null, gender: 'other' }),
      DOCS_A,
      base
    );
    expect(other.context.client_gender).toBeUndefined();
    expect(other.missing).toContain('client_gender');
  });

  it('formats the address block per country order and German country name', () => {
    const base = { signer: 'DIRECT' as const, letterDate: LETTER_DATE };
    const ch = buildBavLetterContext(
      claim({
        currentAddressLine1: 'Bahnhofstrasse 12',
        currentAddressLine2: 'c/o Müller',
        currentPostalCode: '8001',
        currentCity: 'Zürich',
        currentCountry: 'Switzerland',
      }),
      DOCS_A,
      base
    ).context;
    expect(ch.client_address_block).toBe(
      'Bahnhofstrasse 12\nc/o Müller\n8001 Zürich\nSchweiz'
    );
    expect(ch.client_address_inline).toBe(
      'Bahnhofstrasse 12, c/o Müller, 8001 Zürich, Schweiz'
    );
    expect(ch.residence_country).toBe('der Schweiz');

    const unknown = buildBavLetterContext(
      claim({
        currentCountry: 'Peru',
        currentPostalCode: '15001',
        currentCity: 'Lima',
      }),
      DOCS_A,
      base
    ).context;
    expect(unknown.residence_country).toBe('Peru');
    expect(unknown.client_address_block).toBe(
      '42 Maple Avenue\n15001 Lima\nPeru'
    );
  });

  it('falls back to the departure date when the health-insurance end is unknown', () => {
    const ctx = buildBavLetterContext(
      claim({ healthInsuranceEndDate: null, moveOutDate: '2021-03-15' }),
      DOCS_A,
      { signer: 'DIRECT', letterDate: LETTER_DATE }
    ).context;
    expect(ctx.de_health_insurance_end_date).toBe('15.03.2021');
  });

  it('derives enclosure flags from the attached documents', () => {
    const ctx = buildBavLetterContext(claim(), ['passport', 'bank_proof'], {
      signer: 'DIRECT',
      letterDate: LETTER_DATE,
    }).context;
    expect(ctx.provider_form_enclosed).toBe(false);
    expect(ctx.employer_consent_enclosed).toBe(false);
    expect(ctx.foreign_health_insurance_proof).toBe(false);
    expect(ctx.bank_proof).toBe(true);
  });

  it('fills the law-firm fields for LAW letters and reports what is missing', () => {
    const noRef = buildBavLetterContext(claim(), DOCS_A, {
      signer: 'LAW',
      letterDate: LETTER_DATE,
      payoutTarget: 'law_firm',
    });
    expect(noRef.templateId).toBe('A-LAW');
    expect(noRef.missing).toEqual([
      'law_firm_ref',
      'law_firm_iban',
      'law_firm_bic',
      'law_firm_bank',
    ]);

    const full = buildBavLetterContext(claim(), DOCS_A, {
      signer: 'LAW',
      letterDate: LETTER_DATE,
      payoutTarget: 'law_firm',
      lawFirmRef: '2026/0815-KC',
      lawFirmAccount: {
        iban: 'DE02100100100000000001',
        bic: 'PBNKDEFFXXX',
        bank: 'Postbank',
      },
    });
    expect(full.missing).toEqual([]);
    expect(full.context.law_firm_name).toBe('Vividius Rechtsanwälte');
    expect(full.context.lawyer_name).toBe('Katja Chudoba');
    expect(full.context.law_firm_iban).toBe('DE02100100100000000001');
    expect(full.context.payout_target).toBe('law_firm');
  });

  it('never pays out to the law firm on DIRECT letters', () => {
    const ctx = buildBavLetterContext(claim(), DOCS_A, {
      signer: 'DIRECT',
      letterDate: LETTER_DATE,
      payoutTarget: 'law_firm',
    }).context;
    expect(ctx.payout_target).toBe('client');
  });

  it('defaults the copy recipient to the other party', () => {
    const base = {
      signer: 'DIRECT' as const,
      letterDate: LETTER_DATE,
      sendCopy: true,
    };
    expect(
      buildBavLetterContext(claim(), DOCS_A, base).context.copy_recipient_name
    ).toBe('Beispielbank AG');
    expect(
      buildBavLetterContext(
        claim({ bavAddresseeType: 'employer' }),
        DOCS_A,
        base
      ).context.copy_recipient_name
    ).toBe('BVV Versicherungsverein des Bankgewerbes a.G.');
  });

  it('builds a route B context with formatted amount and thresholds', () => {
    const result = buildBavLetterContext(
      claim({
        drvRefundReceived: false,
        bavStatementType: 'Standmitteilung',
        bavStatementDate: '2025-12-31',
        bavBenefitForm: 'capital',
        bavBenefitAmount: '6500.00',
      }),
      ['passport', 'pension_statement'],
      { signer: 'DIRECT', letterDate: LETTER_DATE }
    );
    expect(result.templateId).toBe('B-DIRECT');
    expect(result.missing).toEqual([]);
    expect(result.context.benefit_amount).toBe('6.500,00');
    expect(result.context.threshold_pension).toBe('59,33');
    expect(result.context.threshold_capital).toBe('7.119,00');
    expect(result.context.last_statement_enclosed).toBe(true);
    const { text, missing } = getBavTemplate(result.templateId).render(
      result.context
    );
    expect(missing).toEqual([]);
    expect(text).toContain('zu erwartende Kapitalleistung 6.500,00 EUR.');
    expect(text).toContain('1. Standmitteilung vom 31.12.2025 (Kopie)');
  });

  it('throws when the route is undetermined', () => {
    expect(() =>
      buildBavLetterContext(claim({ drvRefundReceived: null }), DOCS_A, {
        signer: 'DIRECT',
        letterDate: LETTER_DATE,
      })
    ).toThrow(/drvRefundReceived/);
  });
});
