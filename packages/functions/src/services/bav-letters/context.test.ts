import { describe, expect, it } from 'vitest';
import {
  blockingIssues,
  buildBavLetterPlan,
  clientBankDetails,
  recipientPostalAddressLines,
  resolveBavClaimStatus,
  resolveBavReference,
  selectBavTemplateId,
  type BavLetterClaimFields,
} from './context';
import {
  MUSTER_2_LETTER_CLAIM,
  MUSTER_2_OPTIONS,
  TEST_LAW_FIRM_ACCOUNT,
} from './muster-2.fixture';

const claim = (
  o: Partial<BavLetterClaimFields> = {}
): BavLetterClaimFields => ({
  ...MUSTER_2_LETTER_CLAIM,
  ...o,
});

const blockingFields = (c: BavLetterClaimFields, opts = MUSTER_2_OPTIONS) =>
  blockingIssues(buildBavLetterPlan(c, opts)).map((i) => i.field);

describe('resolveBavClaimStatus', () => {
  it('prefers the admin choice, else derives from the DRV refund answer', () => {
    expect(
      resolveBavClaimStatus({
        bavClaimStatus: 'non_vested',
        drvRefundReceived: true,
      })
    ).toEqual({ status: 'non_vested', source: 'admin' });
    expect(
      resolveBavClaimStatus({ bavClaimStatus: null, drvRefundReceived: true })
    ).toEqual({ status: 'vested', source: 'derived' });
    expect(
      resolveBavClaimStatus({ bavClaimStatus: null, drvRefundReceived: false })
    ).toEqual({ status: 'non_vested', source: 'derived' });
    expect(
      resolveBavClaimStatus({
        bavClaimStatus: 'other',
        drvRefundReceived: null,
      })
    ).toEqual({ status: null, source: null });
  });
});

describe('selectBavTemplateId', () => {
  it('maps route × status to the four cover letters', () => {
    expect(selectBavTemplateId('direct', 'vested')).toBe('DIRECT-VESTED');
    expect(selectBavTemplateId('direct', 'non_vested')).toBe(
      'DIRECT-NON_VESTED'
    );
    expect(selectBavTemplateId('law_firm', 'vested')).toBe('LAW-VESTED');
    expect(selectBavTemplateId('law_firm', 'non_vested')).toBe(
      'LAW-NON_VESTED'
    );
  });
});

describe('recipientPostalAddressLines', () => {
  it('handles a provider without a street (large-customer postal code)', () => {
    expect(
      recipientPostalAddressLines({
        bavRecipientDepartment: 'Kundenservice',
        bavRecipientStreet: null,
        bavRecipientPostalCode: '76240',
        bavRecipientCity: 'Karlsruhe',
        bavRecipientCountry: 'Deutschland',
      })
    ).toEqual(['Kundenservice', '76240 Karlsruhe']);
  });

  it('adds a non-German country', () => {
    expect(
      recipientPostalAddressLines({
        bavRecipientDepartment: null,
        bavRecipientStreet: 'Bahnhofstrasse 1',
        bavRecipientPostalCode: '8001',
        bavRecipientCity: 'Zürich',
        bavRecipientCountry: 'Schweiz',
      })
    ).toEqual(['Bahnhofstrasse 1', '8001 Zürich', 'Schweiz']);
  });
});

describe('resolveBavReference', () => {
  it('keeps leading zeros and falls back to the personnel number', () => {
    expect(
      resolveBavReference({
        bavContractReference: ' 000123 ',
        bavContractReferenceLabel: 'Mitgliedsnummer',
        employerPersonnelNumber: '9',
      })
    ).toEqual({ label: 'Mitgliedsnummer', value: '000123' });
    expect(
      resolveBavReference({
        bavContractReference: null,
        bavContractReferenceLabel: null,
        employerPersonnelNumber: '007',
      })
    ).toEqual({ label: 'Personalnummer', value: '007' });
    expect(
      resolveBavReference({
        bavContractReference: '',
        bavContractReferenceLabel: null,
        employerPersonnelNumber: null,
      })
    ).toBeNull();
  });
});

describe('clientBankDetails', () => {
  it('prints account number, BSB and SWIFT outside the IBAN area', () => {
    const { text } = clientBankDetails({
      accountHolderName: 'Jane Doe',
      bankName: 'Commonwealth Bank',
      iban: null,
      accountNumber: '00123456',
      bsb: '062-000',
      swiftBic: 'ctbaau2s',
      bankStreet: null,
      bankPostalCode: null,
      bankCity: null,
      bankCountry: null,
    });
    expect(text).toBe(
      'Kontoinhaber: Jane Doe\nBank: Commonwealth Bank\nKontonummer: 00123456\nBSB: 062-000\nBIC: CTBAAU2S'
    );
  });

  it('reports what is missing', () => {
    expect(
      clientBankDetails({
        accountHolderName: '',
        bankName: null,
        iban: null,
        accountNumber: '1',
        bsb: null,
        swiftBic: null,
        bankStreet: null,
        bankPostalCode: null,
        bankCity: null,
        bankCountry: null,
      }).missing
    ).toEqual(['account holder', 'bank name', 'BIC/SWIFT']);
  });
});

describe('buildBavLetterPlan', () => {
  it('a complete direct vested case has no issues', () => {
    const plan = buildBavLetterPlan(claim(), MUSTER_2_OPTIONS);
    expect(plan.issues).toEqual([]);
    expect(plan.status).toBe('vested');
    expect(plan.statusSource).toBe('derived');
    expect(plan.templateName).toBe('bAV_Cover_Letter_Direct_Vested');
    expect(plan.authority).toBe('PEV');
    expect(plan.context.reference_value).toBe('0012345678');
    expect(plan.context.client_residential_address).toBe(
      '42 Maple Avenue\nLatham, NY 12110\nUSA'
    );
  });

  it('blocks a non-vested letter without an application title', () => {
    expect(blockingFields(claim({ bavClaimStatus: 'non_vested' }))).toEqual([
      'application_title',
    ]);
  });

  it('does not need employment or DRV data for non-vested letters', () => {
    expect(
      blockingFields(
        claim({
          bavClaimStatus: 'non_vested',
          bavApplicationTitle: 'Antrag auf Beitragserstattung',
          employmentEndDate: null,
          drvDecisionDate: null,
        }),
        {
          ...MUSTER_2_OPTIONS,
          documents: MUSTER_2_OPTIONS.documents.filter(
            (d) => d.role !== 'drv_refund_decision'
          ),
        }
      )
    ).toEqual([]);
  });

  it('requires the vested inputs and the DRV decision document', () => {
    const issues = blockingIssues(
      buildBavLetterPlan(
        claim({
          employerName: null,
          employmentEndDate: null,
          drvDecisionDate: null,
        }),
        {
          ...MUSTER_2_OPTIONS,
          documents: [{ role: 'passport', fileName: 'p.jpg' }],
        }
      )
    );
    expect(issues.map((i) => i.field)).toEqual([
      'employer_name',
      'employment_end_date',
      'documents',
    ]);
    expect(issues[2].message).toContain('DRV refund decision');
  });

  it('blocks when the status cannot be determined', () => {
    const plan = buildBavLetterPlan(
      claim({ drvRefundReceived: null }),
      MUSTER_2_OPTIONS
    );
    expect(plan.templateId).toBeNull();
    expect(blockingIssues(plan).map((i) => i.field)).toEqual(['claim_status']);
  });

  it('lists every missing client and recipient field, never a gap', () => {
    const fields = blockingFields(
      claim({
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        currentCountry: null,
        signatureId: null,
        bavRecipientName: null,
        bavRecipientPostalCode: null,
        bavContractReference: null,
        employerPersonnelNumber: null,
        iban: null,
      }),
      { ...MUSTER_2_OPTIONS, documents: [] }
    );
    expect(fields).toEqual([
      'client_full_name',
      'client_date_of_birth',
      'client_residential_address',
      'client_signature',
      'recipient',
      'recipient',
      'reference_value',
      'client_bank_details',
      'documents',
      'documents',
    ]);
  });

  it('accepts a recipient without a street', () => {
    expect(blockingFields(claim({ bavRecipientStreet: null }))).toEqual([]);
  });

  it('law firm: needs the Anderkonto and a valid AZ; the client bank is not used', () => {
    const law = { ...MUSTER_2_OPTIONS, route: 'law_firm' as const };
    expect(
      blockingFields(claim({ iban: null, lawFirmRef: '06152-26' }), law)
    ).toEqual(['law_firm_bank_details']);
    expect(
      blockingFields(claim({ lawFirmRef: '2026/0815' }), {
        ...law,
        lawFirmAccount: TEST_LAW_FIRM_ACCOUNT,
      })
    ).toEqual(['law_firm_az']);
    const plan = buildBavLetterPlan(claim({ lawFirmRef: '06152-26' }), {
      ...law,
      lawFirmAccount: TEST_LAW_FIRM_ACCOUNT,
    });
    expect(plan.issues).toEqual([]);
    expect(plan.authority).toBe('VOLL');
    expect(plan.context.law_firm_az).toBe('06152-26');
    expect(plan.context.client_bank_details).toBe('');
  });

  it('builds the attachment list in pack order', () => {
    const plan = buildBavLetterPlan(claim(), MUSTER_2_OPTIONS);
    expect(String(plan.context.attachment_list).split('\n')).toEqual([
      '1. Postempfangsvollmacht',
      '2. Erstattungsbescheid der Deutschen Rentenversicherung vom 02.07.2026',
      '3. Kopie des Reisepasses',
      '4. Antragsformular „Antrag auf Abfindung einer Rentenanwartschaft“',
      '5. BVV Zusatzblatt',
    ]);
  });
});
