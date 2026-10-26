/**
 * Maps a claim row (plus its documents and per-case options) to the
 * placeholder dictionary of the bAV letter templates (client spec section
 * 9). Pure: no I/O. The claims service validator decides whether a claim is
 * complete; this builder only reports what it could not fill.
 */

import type { ClaimDocumentRole } from '../../drizzle/schema/claims';
import {
  CITY_BEFORE_POSTAL_CODE,
  LAW_FIRM,
  getBavThresholds,
  residenceCountryName,
  residenceCountryPhrase,
} from './constants';
import { formatIban, formatLetterAmount, formatLetterDate } from './format';
import {
  resolveBavRoute,
  type BavClaimFields,
  type BavRoute,
} from './intake-validation';
import type { TemplateContext } from './template-engine';
import type { BavTemplateId } from './templates';

export type BavSigner = 'LAW' | 'DIRECT';
export type BavPayoutTarget = 'client' | 'law_firm';

export interface LawFirmAccount {
  iban: string;
  bic: string;
  bank: string;
}

export interface BavLetterOptions {
  /** LAW = Vividius letterhead + Anwaltsvollmacht; DIRECT = user signs. */
  signer: BavSigner;
  /** Generation date (→ letter_date, letter_year, default pev_start_date). */
  letterDate: Date;
  /** LAW only; DIRECT always pays out to the client. Default 'client'. */
  payoutTarget?: BavPayoutTarget;
  /** Adds the "Kopie an" line and the copy clause. */
  sendCopy?: boolean;
  /** The other party (employer ↔ provider); required when sendCopy. */
  copyRecipientName?: string;
  /** Law firm's per-case file number (→ law_firm_ref, "Unser Zeichen"). */
  lawFirmRef?: string;
  /** Anderkonto details, required when payoutTarget = 'law_firm'. */
  lawFirmAccount?: LawFirmAccount;
  /**
   * Text rendered in the signature slot. The PDF layer draws the actual
   * signature image; for text output leave empty or pass a marker.
   */
  signatureText?: string;
  /** Defaults to letterDate. */
  pevStartDate?: Date;
}

export interface BavLetterContext {
  route: BavRoute;
  templateId: BavTemplateId;
  context: TemplateContext;
  /**
   * Claim inputs that were absent. Informational: the templates tolerate
   * most of them (they resolve to empty branches); the validator is the
   * gate.
   */
  missing: string[];
}

export function selectBavTemplateId(
  route: BavRoute,
  signer: BavSigner
): BavTemplateId {
  return `${route}-${signer}` as BavTemplateId;
}

const trimmed = (v: string | null | undefined): string =>
  typeof v === 'string' ? v.trim() : '';

const normalizeName = (v: string): string =>
  v.toLowerCase().replace(/\s+/g, ' ').trim();

function buildAddressLines(claim: BavClaimFields): string[] {
  const country = trimmed(claim.currentCountry);
  const city = trimmed(claim.currentCity);
  const postal = trimmed(claim.currentPostalCode);
  const locality = CITY_BEFORE_POSTAL_CODE.has(country)
    ? [city, postal].filter(Boolean).join(', ')
    : [postal, city].filter(Boolean).join(' ');
  return [
    trimmed(claim.currentAddressLine1),
    trimmed(claim.currentAddressLine2),
    locality,
    residenceCountryName(country) ?? country,
  ].filter((line) => line !== '');
}

function optionalDate(value: string | null): string | undefined {
  return value ? formatLetterDate(value) : undefined;
}

/**
 * Build the template context for a bAV claim. Throws when the route cannot
 * be determined (drvRefundReceived unset) because no template applies.
 */
export function buildBavLetterContext(
  claim: BavClaimFields,
  documentRoles: readonly ClaimDocumentRole[],
  options: BavLetterOptions
): BavLetterContext {
  const route = resolveBavRoute(claim);
  if (route === null) {
    throw new Error(
      'Cannot build bAV letter context: drvRefundReceived is not set'
    );
  }
  const missing: string[] = [];
  const note = (field: string) => {
    missing.push(field);
    return undefined;
  };
  const has = (role: ClaimDocumentRole) => documentRoles.includes(role);

  const signer = options.signer;
  const payoutTarget: BavPayoutTarget =
    signer === 'LAW' ? (options.payoutTarget ?? 'client') : 'client';
  const letterYear = String(options.letterDate.getFullYear());
  const thresholds = getBavThresholds(letterYear);

  const fullName = [trimmed(claim.firstName), trimmed(claim.lastName)]
    .filter(Boolean)
    .join(' ');
  if (!fullName) note('client_full_name');

  let clientGender: 'm' | 'f' | undefined;
  if (claim.salutation === 'herr') clientGender = 'm';
  else if (claim.salutation === 'frau') clientGender = 'f';
  else if (claim.gender === 'male') clientGender = 'm';
  else if (claim.gender === 'female') clientGender = 'f';
  else note('client_gender');

  const country = trimmed(claim.currentCountry);
  const residenceCountry = country
    ? (residenceCountryPhrase(country) ?? country)
    : note('residence_country');
  const addressLines = buildAddressLines(claim);

  const accountHolder = trimmed(claim.accountHolderName);
  const accountHolderIsClient =
    accountHolder !== '' &&
    fullName !== '' &&
    normalizeName(accountHolder) === normalizeName(fullName);

  const bankAddress = [
    trimmed(claim.bankStreet),
    [trimmed(claim.bankPostalCode), trimmed(claim.bankCity)]
      .filter(Boolean)
      .join(' '),
    trimmed(claim.bankCountry),
  ]
    .filter(Boolean)
    .join(', ');

  const contractReference = trimmed(claim.bavContractReference);
  const contractReferenceLabel =
    trimmed(claim.bavContractReferenceLabel) ||
    (contractReference ? 'Vertrags-Nr.' : '');

  const providerName = trimmed(claim.bavProviderName);
  const addresseeType = claim.bavAddresseeType ?? note('addressee_type');
  const copyRecipientName =
    options.copyRecipientName ??
    (addresseeType === 'provider' ? trimmed(claim.employerName) : providerName);

  const benefitAmountNumber = Number(claim.bavBenefitAmount);
  const benefitAmount =
    claim.bavBenefitAmount && Number.isFinite(benefitAmountNumber)
      ? formatLetterAmount(benefitAmountNumber)
      : '';

  const context: TemplateContext = {
    // 9.1 case control
    route,
    signer,
    addressee_type: addresseeType,
    payout_target: payoutTarget,
    send_copy: options.sendCopy === true,
    copy_recipient_name: copyRecipientName,
    letter_date: formatLetterDate(options.letterDate),
    letter_year: letterYear,
    pev_start_date: formatLetterDate(
      options.pevStartDate ?? options.letterDate
    ),

    // 9.2 client
    client_gender: clientGender,
    client_full_name: fullName,
    client_dob: optionalDate(claim.dateOfBirth) ?? note('client_dob'),
    client_birthplace: trimmed(claim.placeOfBirth) || note('client_birthplace'),
    client_address_block: addressLines.join('\n'),
    client_address_inline: addressLines.join(', '),
    client_passport_number:
      trimmed(claim.passportNumber) || note('client_passport_number'),
    client_city: trimmed(claim.currentCity) || note('client_city'),
    client_email: '', // filled by the caller from the user record
    client_signature: options.signatureText ?? '',
    de_departure_date:
      optionalDate(claim.moveOutDate) ?? note('de_departure_date'),
    residence_country: residenceCountry,
    tax_id: trimmed(claim.taxId),
    de_health_insurance_end_date:
      optionalDate(claim.healthInsuranceEndDate) ??
      optionalDate(claim.moveOutDate) ??
      note('de_health_insurance_end_date'),

    // 9.3 employment and bAV
    employer_name: trimmed(claim.employerName) || note('employer_name'),
    employment_end_date:
      optionalDate(claim.employmentEndDate) ?? note('employment_end_date'),
    employer_personnel_number: trimmed(claim.employerPersonnelNumber),
    provider_name: providerName,
    durchfuehrungsweg:
      trimmed(claim.bavDurchfuehrungsweg) || note('durchfuehrungsweg'),
    contract_reference_label: contractReferenceLabel,
    contract_reference: contractReference,

    // 9.4 recipient
    recipient_name: trimmed(claim.bavRecipientName) || note('recipient_name'),
    recipient_department: trimmed(claim.bavRecipientDepartment),
    recipient_street:
      trimmed(claim.bavRecipientStreet) || note('recipient_street'),
    recipient_postal_code:
      trimmed(claim.bavRecipientPostalCode) || note('recipient_postal_code'),
    recipient_city: trimmed(claim.bavRecipientCity) || note('recipient_city'),
    recipient_ref: trimmed(claim.bavRecipientRef),

    // 9.5 route A
    drv_office: trimmed(claim.drvOffice),
    drv_decision_date: optionalDate(claim.drvDecisionDate) ?? '',

    // 9.6 route B
    statement_type: trimmed(claim.bavStatementType),
    statement_date: optionalDate(claim.bavStatementDate) ?? '',
    benefit_form: trimmed(claim.bavBenefitForm),
    benefit_amount: benefitAmount,
    threshold_pension: formatLetterAmount(thresholds.pension),
    threshold_capital: formatLetterAmount(thresholds.capital),

    // 9.7 payout account
    account_holder: accountHolder || note('account_holder'),
    account_holder_is_client: accountHolderIsClient,
    iban: claim.iban ? formatIban(claim.iban) : note('iban'),
    bic: trimmed(claim.swiftBic) || note('bic'),
    bank_name: trimmed(claim.bankName) || note('bank_name'),
    bank_address: bankAddress,

    // 9.8 enclosure flags, derived from the documents attached to the claim
    provider_form_enclosed: has('provider_form'),
    provider_form_title: trimmed(claim.bavProviderFormTitle),
    employer_consent_enclosed: has('employer_consent'),
    employment_end_proof: has('employment_end_proof'),
    last_statement_enclosed: has('pension_statement'),
    foreign_health_insurance_proof: has('foreign_health_insurance'),
    bank_proof: has('bank_proof'),

    // 9.9 law firm constants (LAW variants; harmless extras for DIRECT)
    law_firm_letterhead: '', // the PDF layer embeds the letterhead asset
    law_firm_name: LAW_FIRM.name,
    law_firm_city: LAW_FIRM.city,
    lawyer_name: LAW_FIRM.lawyerName,
    lawyer_title: LAW_FIRM.lawyerTitle,
    law_firm_ref: options.lawFirmRef ?? '',
    law_firm_iban: options.lawFirmAccount?.iban ?? '',
    law_firm_bic: options.lawFirmAccount?.bic ?? '',
    law_firm_bank: options.lawFirmAccount?.bank ?? '',
  };

  // Route-specific inputs are only "missing" for the route in use.
  if (route === 'A') {
    if (!context.drv_office) missing.push('drv_office');
    if (!context.drv_decision_date) missing.push('drv_decision_date');
  } else {
    if (!context.statement_type) missing.push('statement_type');
    if (!context.statement_date) missing.push('statement_date');
    if (!context.benefit_form) missing.push('benefit_form');
    else if (context.benefit_form !== 'unknown' && !benefitAmount) {
      missing.push('benefit_amount');
    }
  }
  if (signer === 'LAW') {
    if (!context.law_firm_ref) missing.push('law_firm_ref');
    if (payoutTarget === 'law_firm' && !options.lawFirmAccount) {
      missing.push('law_firm_iban', 'law_firm_bic', 'law_firm_bank');
    }
  }
  if (options.sendCopy && !copyRecipientName)
    missing.push('copy_recipient_name');
  if (has('provider_form') && !context.provider_form_title) {
    missing.push('provider_form_title');
  }

  return {
    route,
    templateId: selectBavTemplateId(route, signer),
    context,
    missing,
  };
}
