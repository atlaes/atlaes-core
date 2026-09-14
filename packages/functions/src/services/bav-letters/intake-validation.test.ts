import { describe, expect, it } from 'vitest';
import type { ClaimDocumentRole } from '../../drizzle/schema/claims';
import {
  resolveBavRoute,
  validateBavIntake,
  type BavClaimFields,
} from './intake-validation';
import { MUSTER_2_CLAIM } from './muster-2.fixture';

const NOW = new Date(2026, 8, 7);

const routeA = (overrides: Partial<BavClaimFields> = {}): BavClaimFields => ({
  ...MUSTER_2_CLAIM,
  ...overrides,
});

const routeB = (overrides: Partial<BavClaimFields> = {}): BavClaimFields => ({
  ...MUSTER_2_CLAIM,
  drvRefundReceived: false,
  drvOffice: null,
  drvDecisionDate: null,
  bavStatementType: 'Standmitteilung',
  bavStatementDate: '2025-12-31',
  bavBenefitForm: 'pension',
  bavBenefitAmount: '41.20',
  ...overrides,
});

const DOCS_A: ClaimDocumentRole[] = [
  'passport',
  'drv_refund_decision',
  'provider_form',
  'employer_consent',
  'foreign_health_insurance',
];
const DOCS_B: ClaimDocumentRole[] = ['passport', 'pension_statement'];

describe('resolveBavRoute', () => {
  it('maps the DRV refund answer to the legal route', () => {
    expect(resolveBavRoute({ drvRefundReceived: true })).toBe('A');
    expect(resolveBavRoute({ drvRefundReceived: false })).toBe('B');
    expect(resolveBavRoute({ drvRefundReceived: null })).toBeNull();
  });
});

describe('validateBavIntake', () => {
  it('accepts the complete Muster 2 claim (route A)', () => {
    expect(validateBavIntake(routeA(), DOCS_A, NOW)).toEqual([]);
  });

  it('accepts a complete route B claim within the threshold', () => {
    expect(validateBavIntake(routeB(), DOCS_B, NOW)).toEqual([]);
  });

  it('requires the DRV refund answer before anything route-specific', () => {
    const errors = validateBavIntake(
      routeA({ drvRefundReceived: null }),
      DOCS_A,
      NOW
    );
    expect(errors).toEqual([
      'Whether the DRV contribution refund was received is required',
    ]);
  });

  it('route A needs the Bescheid data and document', () => {
    const errors = validateBavIntake(
      routeA({ drvOffice: '', drvDecisionDate: null }),
      ['passport'],
      NOW
    );
    expect(errors).toEqual([
      'DRV office is required',
      'DRV refund decision date is required',
      'DRV refund decision (Erstattungsbescheid) document is required',
    ]);
  });

  it('route B needs the statement data and document', () => {
    const errors = validateBavIntake(
      routeB({
        bavStatementType: null,
        bavStatementDate: null,
        bavBenefitForm: null,
      }),
      ['passport'],
      NOW
    );
    expect(errors).toEqual([
      'Statement type is required',
      'Statement date is required',
      'Pension statement document is required',
      'Benefit form (pension/capital/unknown) is required',
    ]);
  });

  it('route B rejects a benefit above the 2026 threshold for its form', () => {
    expect(
      validateBavIntake(routeB({ bavBenefitAmount: '59.34' }), DOCS_B, NOW)
    ).toEqual([
      'Benefit amount 59.34 EUR exceeds the § 3 Abs. 2 BetrAVG limit of 59.33 EUR for 2026',
    ]);
    expect(
      validateBavIntake(routeB({ bavBenefitAmount: '59.33' }), DOCS_B, NOW)
    ).toEqual([]);
    expect(
      validateBavIntake(
        routeB({ bavBenefitForm: 'capital', bavBenefitAmount: '7119.00' }),
        DOCS_B,
        NOW
      )
    ).toEqual([]);
    expect(
      validateBavIntake(
        routeB({ bavBenefitForm: 'capital', bavBenefitAmount: '7500' }),
        DOCS_B,
        NOW
      )
    ).toEqual([
      'Benefit amount 7500 EUR exceeds the § 3 Abs. 2 BetrAVG limit of 7119 EUR for 2026',
    ]);
  });

  it('route B with an unknown benefit form needs no amount', () => {
    expect(
      validateBavIntake(
        routeB({ bavBenefitForm: 'unknown', bavBenefitAmount: null }),
        DOCS_B,
        NOW
      )
    ).toEqual([]);
    expect(
      validateBavIntake(
        routeB({ bavBenefitForm: 'pension', bavBenefitAmount: null }),
        DOCS_B,
        NOW
      )
    ).toEqual(['Benefit amount is required']);
  });

  it('requires a provider except for Direktzusage and Unterstützungskasse', () => {
    expect(
      validateBavIntake(routeA({ bavProviderName: '' }), DOCS_A, NOW)
    ).toEqual([
      'Pension provider is required for Direktversicherung, Pensionskasse and Pensionsfonds',
    ]);
    expect(
      validateBavIntake(
        routeA({
          bavProviderName: '',
          bavDurchfuehrungsweg: 'Direktzusage',
          bavAddresseeType: 'employer',
        }),
        DOCS_A,
        NOW
      )
    ).toEqual([]);
  });

  it('forces employer addressee for Direktzusage and Unterstützungskasse', () => {
    expect(
      validateBavIntake(
        routeA({
          bavDurchfuehrungsweg: 'Unterstützungskasse',
          bavAddresseeType: 'provider',
        }),
        DOCS_A,
        NOW
      )
    ).toEqual([
      'Direktzusage and Unterstützungskasse letters must be addressed to the employer',
    ]);
  });

  it('requires the salutation, recipient, bank block and provider form title', () => {
    const errors = validateBavIntake(
      routeA({
        salutation: null,
        bavRecipientName: '',
        bavRecipientStreet: null,
        bavRecipientPostalCode: null,
        bavRecipientCity: null,
        iban: null,
        swiftBic: null,
        bavProviderFormTitle: null,
        bavContractReferenceLabel: null,
      }),
      DOCS_A,
      NOW
    );
    expect(errors).toEqual([
      'Salutation (Herr/Frau) is required',
      'Contract reference label is required when a reference is given',
      'Recipient name is required',
      'Recipient street is required',
      'Recipient postal code is required',
      'Recipient city is required',
      'IBAN is required',
      'BIC is required',
      'Provider form title is required when a provider form is enclosed',
    ]);
  });
});
