import type { ClaimDocumentRole } from '../../drizzle/schema/claims';
import { getBavThresholds } from './constants';

/**
 * The subset of a claim row the bAV validator and context builder read.
 * Kept structural (not the service's Claim type) so both stay pure and
 * testable without a database.
 */
export interface BavClaimFields {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  placeOfBirth: string | null;
  passportNumber: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentCity: string | null;
  currentPostalCode: string | null;
  currentCountry: string | null;
  moveOutDate: string | null;
  salutation: string | null;
  taxId: string | null;
  healthInsuranceEndDate: string | null;
  employerName: string | null;
  employmentEndDate: string | null;
  employerPersonnelNumber: string | null;
  bavProviderName: string | null;
  bavDurchfuehrungsweg: string | null;
  bavContractReferenceLabel: string | null;
  bavContractReference: string | null;
  bavProviderFormTitle: string | null;
  drvRefundReceived: boolean | null;
  drvOffice: string | null;
  drvDecisionDate: string | null;
  bavStatementType: string | null;
  bavStatementDate: string | null;
  bavBenefitForm: string | null;
  bavBenefitAmount: string | null;
  bavAddresseeType: string | null;
  bavRecipientName: string | null;
  bavRecipientDepartment: string | null;
  bavRecipientStreet: string | null;
  bavRecipientPostalCode: string | null;
  bavRecipientCity: string | null;
  bavRecipientRef: string | null;
  accountHolderName: string | null;
  iban: string | null;
  swiftBic: string | null;
  bankName: string | null;
  bankStreet: string | null;
  bankCity: string | null;
  bankPostalCode: string | null;
  bankCountry: string | null;
}

export type BavRoute = 'A' | 'B';

/** Route A when the DRV contribution refund has been granted, else B. */
export function resolveBavRoute(claim: {
  drvRefundReceived: boolean | null;
}): BavRoute | null {
  if (claim.drvRefundReceived === true) return 'A';
  if (claim.drvRefundReceived === false) return 'B';
  return null;
}

const DIRECT_PROMISE_VEHICLES = new Set([
  'Direktzusage',
  'Unterstützungskasse',
]);

const filled = (v: string | null | undefined): boolean =>
  typeof v === 'string' && v.trim() !== '';

/**
 * Errors that block generating an Abfindung letter for a bAV claim.
 * Universal claim checks (name, passport, signature, …) live in the
 * claims service; this covers only what the bAV letters add. `now` picks
 * the § 3 Abs. 2 threshold year for route B.
 */
export function validateBavIntake(
  claim: BavClaimFields,
  documentRoles: readonly ClaimDocumentRole[],
  now: Date = new Date()
): string[] {
  const errors: string[] = [];
  const has = (role: ClaimDocumentRole) => documentRoles.includes(role);

  if (claim.salutation !== 'herr' && claim.salutation !== 'frau') {
    errors.push('Salutation (Herr/Frau) is required');
  }
  if (!filled(claim.moveOutDate)) {
    errors.push('Date of leaving Germany is required');
  }
  if (!filled(claim.currentPostalCode)) {
    errors.push('Current postal code is required');
  }

  if (!filled(claim.employerName)) errors.push('Employer name is required');
  if (!filled(claim.employmentEndDate)) {
    errors.push('Employment end date is required');
  }
  if (!filled(claim.bavDurchfuehrungsweg)) {
    errors.push('Durchführungsweg is required');
  } else if (
    !DIRECT_PROMISE_VEHICLES.has(claim.bavDurchfuehrungsweg as string) &&
    !filled(claim.bavProviderName)
  ) {
    errors.push(
      'Pension provider is required for Direktversicherung, Pensionskasse and Pensionsfonds'
    );
  }
  if (
    filled(claim.bavContractReference) &&
    !filled(claim.bavContractReferenceLabel)
  ) {
    errors.push(
      'Contract reference label is required when a reference is given'
    );
  }

  if (
    claim.bavAddresseeType !== 'employer' &&
    claim.bavAddresseeType !== 'provider'
  ) {
    errors.push('Letter addressee (employer/provider) is required');
  } else if (
    claim.bavAddresseeType === 'provider' &&
    DIRECT_PROMISE_VEHICLES.has(claim.bavDurchfuehrungsweg ?? '')
  ) {
    errors.push(
      'Direktzusage and Unterstützungskasse letters must be addressed to the employer'
    );
  }
  if (!filled(claim.bavRecipientName))
    errors.push('Recipient name is required');
  if (!filled(claim.bavRecipientStreet))
    errors.push('Recipient street is required');
  if (!filled(claim.bavRecipientPostalCode)) {
    errors.push('Recipient postal code is required');
  }
  if (!filled(claim.bavRecipientCity))
    errors.push('Recipient city is required');

  if (!filled(claim.accountHolderName)) {
    errors.push('Bank account holder name is required');
  }
  if (!filled(claim.iban)) errors.push('IBAN is required');
  if (!filled(claim.swiftBic)) errors.push('BIC is required');
  if (!filled(claim.bankName)) errors.push('Bank name is required');

  if (has('provider_form') && !filled(claim.bavProviderFormTitle)) {
    errors.push(
      'Provider form title is required when a provider form is enclosed'
    );
  }

  const route = resolveBavRoute(claim);
  if (route === null) {
    errors.push('Whether the DRV contribution refund was received is required');
    return errors;
  }

  if (route === 'A') {
    if (!filled(claim.drvOffice)) errors.push('DRV office is required');
    if (!filled(claim.drvDecisionDate)) {
      errors.push('DRV refund decision date is required');
    }
    if (!has('drv_refund_decision')) {
      errors.push(
        'DRV refund decision (Erstattungsbescheid) document is required'
      );
    }
    return errors;
  }

  // Route B
  if (!filled(claim.bavStatementType))
    errors.push('Statement type is required');
  if (!filled(claim.bavStatementDate))
    errors.push('Statement date is required');
  if (!has('pension_statement')) {
    errors.push('Pension statement document is required');
  }
  const form = claim.bavBenefitForm;
  if (form !== 'pension' && form !== 'capital' && form !== 'unknown') {
    errors.push('Benefit form (pension/capital/unknown) is required');
    return errors;
  }
  if (form === 'unknown') return errors;

  const amount = Number(claim.bavBenefitAmount);
  if (
    !filled(claim.bavBenefitAmount) ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    errors.push('Benefit amount is required');
    return errors;
  }
  const thresholds = getBavThresholds(now.getFullYear());
  const limit = form === 'pension' ? thresholds.pension : thresholds.capital;
  if (amount > limit) {
    errors.push(
      `Benefit amount ${claim.bavBenefitAmount} EUR exceeds the § 3 Abs. 2 BetrAVG limit of ${limit} EUR for ${now.getFullYear()}`
    );
  }
  return errors;
}
