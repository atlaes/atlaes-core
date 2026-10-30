/**
 * Maps a claim row (plus its documents and the runtime settings) to the
 * placeholder dictionary of the bAV route × status letters (owner spec
 * 29 Oct 2026, "bAV fields and workflow") and plans the pack. Pure: no
 * I/O.
 *
 * Nothing is rendered with a gap: every field a selected template needs is
 * either filled or reported in `issues`, and a plan with blocking issues
 * must not be rendered (BavLetterPackageService refuses it, the admin
 * card lists the issues).
 */

import type { ClaimDocumentRole } from '../../drizzle/schema/claims';
import { AKTENZEICHEN_PATTERN } from '../law-firm-rules';
import {
  CITY_BEFORE_POSTAL_CODE,
  LAW_FIRM,
  residenceCountryName,
} from './constants';
import { formatIban, formatLetterDate } from './format';
import { validateBavRecipient, type BavClaimFields } from './intake-validation';
import { planBavPack, type PlannedEnclosure } from './package';
import type { TemplateContext } from './template-engine';
import { BAV_COVER_TEMPLATE_NAMES, type BavCoverTemplateId } from './templates';

export type BavClaimStatus = 'vested' | 'non_vested';
export const BAV_CLAIM_STATUSES: readonly BavClaimStatus[] = [
  'vested',
  'non_vested',
];
/** claims.handling_route values. */
export type BavLetterRoute = 'direct' | 'law_firm';

export interface LawFirmAccount {
  iban: string;
  bic: string;
  bank: string;
}

/** The postal agent from the ops settings (OpsSettingsService). */
export interface BavPostalAgent {
  name: string;
  coLine?: string | null;
  street: string;
  postalCode: string;
  city: string;
}

/** Claim columns the letters read beyond the intake fields. */
export interface BavLetterClaimFields extends BavClaimFields {
  bavClaimStatus: string | null;
  bavApplicationTitle: string | null;
  bavRecipientCountry: string | null;
  accountNumber: string | null;
  bsb: string | null;
  lawFirmRef: string | null;
  signatureId: string | null;
}

/** A claim document that can go into the pack. */
export interface BavPlanDocument {
  role: ClaimDocumentRole;
  fileName: string;
}

export interface BavLetterOptions {
  route: BavLetterRoute;
  /** Generation date (→ signature_date, the letter date). */
  letterDate: Date;
  /** Correspondence address of the direct route. */
  postalAgent: BavPostalAgent;
  /** Anderkonto, required on the law-firm route. */
  lawFirmAccount: LawFirmAccount | null;
  /**
   * Latest document per role plus every 'bav_extra' (oldest first). The
   * plan refers to them by index.
   */
  documents: readonly BavPlanDocument[];
  /**
   * Text rendered in the client's signature slot. The PDF layer draws the
   * signature image there; for text output pass a marker or leave empty.
   */
  signatureText?: string;
  /** Text in the lawyer's (hand-signed) signature space. Default ''. */
  lawyerSignatureSpace?: string;
}

export interface BavLetterIssue {
  /** Placeholder or document the issue is about, e.g. 'employer_name'. */
  field: string;
  message: string;
  /** Blocking issues stop generation; the rest are shown as notes. */
  blocking: boolean;
}

export interface BavLetterPlan {
  status: BavClaimStatus | null;
  /** 'admin' = chosen on the claim; 'derived' = from drv_refund_received. */
  statusSource: 'admin' | 'derived' | null;
  route: BavLetterRoute;
  /** Null while the status is unknown. */
  templateId: BavCoverTemplateId | null;
  templateName: string | null;
  authority: 'PEV' | 'VOLL';
  context: TemplateContext;
  /** Pack after the cover letter, in order (attachment_list source). */
  enclosures: PlannedEnclosure[];
  issues: BavLetterIssue[];
}

/** Admin's choice, else derived from the DRV refund answer. */
export function resolveBavClaimStatus(claim: {
  bavClaimStatus: string | null;
  drvRefundReceived: boolean | null;
}): { status: BavClaimStatus | null; source: 'admin' | 'derived' | null } {
  if (
    claim.bavClaimStatus === 'vested' ||
    claim.bavClaimStatus === 'non_vested'
  )
    return { status: claim.bavClaimStatus, source: 'admin' };
  if (claim.drvRefundReceived === true)
    return { status: 'vested', source: 'derived' };
  if (claim.drvRefundReceived === false)
    return { status: 'non_vested', source: 'derived' };
  return { status: null, source: null };
}

export function selectBavTemplateId(
  route: BavLetterRoute,
  status: BavClaimStatus
): BavCoverTemplateId {
  return `${route === 'law_firm' ? 'LAW' : 'DIRECT'}-${
    status === 'vested' ? 'VESTED' : 'NON_VESTED'
  }` as BavCoverTemplateId;
}

/** Sender line above the recipient on law-firm letters (template text). */
export const LAW_FIRM_SENDER_LINE = `Vividius · Gneisenaustraße 115 · ${LAW_FIRM.postalCode} ${LAW_FIRM.city}`;

const trimmed = (v: string | null | undefined): string =>
  typeof v === 'string' ? v.trim() : '';

const GERMANY = new Set(['de', 'deutschland', 'germany']);

function clientAddressLines(claim: BavClaimFields): string[] {
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
    country ? (residenceCountryName(country) ?? country) : '',
  ].filter((line) => line !== '');
}

/**
 * Recipient address below the name: department, street (optional: some
 * providers are addressed by a large-customer postal code only, e.g.
 * "76240 Karlsruhe"), postal code and city, and the country when it is not
 * Germany.
 */
export function recipientPostalAddressLines(claim: {
  bavRecipientDepartment: string | null;
  bavRecipientStreet: string | null;
  bavRecipientPostalCode: string | null;
  bavRecipientCity: string | null;
  bavRecipientCountry?: string | null;
}): string[] {
  const country = trimmed(claim.bavRecipientCountry);
  return [
    trimmed(claim.bavRecipientDepartment),
    trimmed(claim.bavRecipientStreet),
    [trimmed(claim.bavRecipientPostalCode), trimmed(claim.bavRecipientCity)]
      .filter(Boolean)
      .join(' '),
    country && !GERMANY.has(country.toLowerCase()) ? country : '',
  ].filter((line) => line !== '');
}

/** Contract/policy/membership number, else the personnel number. */
export function resolveBavReference(
  claim: Pick<
    BavClaimFields,
    | 'bavContractReference'
    | 'bavContractReferenceLabel'
    | 'employerPersonnelNumber'
  >
): { label: string; value: string } | null {
  // Values are printed as entered: leading zeros are significant.
  const contract = trimmed(claim.bavContractReference);
  if (contract) {
    return {
      label: trimmed(claim.bavContractReferenceLabel) || 'Vertrags-Nr.',
      value: contract,
    };
  }
  const personnel = trimmed(claim.employerPersonnelNumber);
  if (personnel) return { label: 'Personalnummer', value: personnel };
  return null;
}

/**
 * The client's own account: holder, bank, then IBAN/BIC or, outside the
 * IBAN area, account number (+ BSB) and SWIFT code. Null with the missing
 * parts when incomplete.
 */
export function clientBankDetails(
  claim: Pick<
    BavLetterClaimFields,
    | 'accountHolderName'
    | 'bankName'
    | 'iban'
    | 'swiftBic'
    | 'accountNumber'
    | 'bsb'
    | 'bankStreet'
    | 'bankPostalCode'
    | 'bankCity'
    | 'bankCountry'
  >
): { text: string | null; missing: string[] } {
  const holder = trimmed(claim.accountHolderName);
  const bank = trimmed(claim.bankName);
  const iban = trimmed(claim.iban).replace(/\s+/g, '');
  const account = trimmed(claim.accountNumber);
  const bic = trimmed(claim.swiftBic).toUpperCase();
  const missing: string[] = [];
  if (!holder) missing.push('account holder');
  if (!bank) missing.push('bank name');
  if (!iban && !account) missing.push('IBAN or account number');
  if (!iban && account && !bic) missing.push('BIC/SWIFT');
  if (missing.length > 0) return { text: null, missing };

  const bankAddress = [
    trimmed(claim.bankStreet),
    [trimmed(claim.bankPostalCode), trimmed(claim.bankCity)]
      .filter(Boolean)
      .join(' '),
    trimmed(claim.bankCountry),
  ]
    .filter(Boolean)
    .join(', ');
  const lines = [`Kontoinhaber: ${holder}`, `Bank: ${bank}`];
  if (bankAddress) lines.push(`Anschrift der Bank: ${bankAddress}`);
  if (iban) {
    lines.push(`IBAN: ${formatIban(iban)}`);
  } else {
    lines.push(`Kontonummer: ${account}`);
    if (trimmed(claim.bsb)) lines.push(`BSB: ${trimmed(claim.bsb)}`);
  }
  if (bic) lines.push(`BIC: ${bic}`);
  return { text: lines.join('\n'), missing: [] };
}

export function lawFirmBankDetails(account: LawFirmAccount): string {
  return [
    `Kontoinhaber: ${LAW_FIRM.name} – Anderkonto`,
    `Bank: ${account.bank}`,
    `IBAN: ${formatIban(account.iban)}`,
    `BIC: ${account.bic.toUpperCase()}`,
  ].join('\n');
}

function procedureDescription(
  status: BavClaimStatus,
  recipient: string,
  employer: string,
  applicationTitle: string
): string {
  if (status === 'vested') {
    return (
      'das Verfahren auf Abfindung meiner unverfallbaren Anwartschaft auf betriebliche Altersversorgung' +
      (employer ? ` aus dem Arbeitsverhältnis mit ${employer}` : '') +
      ` nach § 3 Abs. 3 BetrAVG bei ${recipient}`
    );
  }
  return (
    `das Verfahren „${applicationTitle}“ bei ${recipient}` +
    (employer
      ? ` (betriebliche Altersversorgung aus dem Arbeitsverhältnis mit ${employer})`
      : '')
  );
}

/**
 * Builds the letter context and pack plan for a bAV claim. Always returns
 * a plan; check `issues` for blocking entries before rendering.
 */
export function buildBavLetterPlan(
  claim: BavLetterClaimFields,
  options: BavLetterOptions
): BavLetterPlan {
  const issues: BavLetterIssue[] = [];
  const block = (field: string, message: string) =>
    issues.push({ field, message, blocking: true });
  const note = (field: string, message: string) =>
    issues.push({ field, message, blocking: false });

  const route = options.route;
  const isLaw = route === 'law_firm';
  const { status, source } = resolveBavClaimStatus(claim);
  if (!status) {
    block(
      'claim_status',
      'Claim status (Vested / Non-Vested) is not set and cannot be derived: the DRV refund answer is missing'
    );
  }
  const templateId = status ? selectBavTemplateId(route, status) : null;

  // Client
  const fullName = [trimmed(claim.firstName), trimmed(claim.lastName)]
    .filter(Boolean)
    .join(' ');
  if (!fullName) block('client_full_name', 'Client name is required');
  const dob = claim.dateOfBirth ? formatLetterDate(claim.dateOfBirth) : '';
  if (!dob) block('client_date_of_birth', 'Client date of birth is required');
  const addressLines = clientAddressLines(claim);
  if (
    !trimmed(claim.currentAddressLine1) ||
    !trimmed(claim.currentCity) ||
    !trimmed(claim.currentCountry)
  ) {
    block(
      'client_residential_address',
      'Client address (street, city and country) is required'
    );
  }
  const signaturePlace = trimmed(claim.currentCity);
  if (!signaturePlace && isLaw) {
    // On the direct route the address issue above already covers it.
    block('signature_place', 'Client city (signing place) is required');
  }
  if (!claim.signatureId) {
    block(
      'client_signature',
      `Client signature is required (${isLaw ? 'Vollmacht' : 'cover letter and Postempfangsvollmacht'})`
    );
  }

  // Recipient
  for (const message of validateBavRecipient(claim)) {
    block('recipient', message);
  }
  const recipientName = trimmed(claim.bavRecipientName);

  // Reference
  const reference = resolveBavReference(claim);
  if (!reference) {
    block(
      'reference_value',
      'A contract, policy or membership number (or the personnel number) is required'
    );
  }

  // Status-specific
  const employer = trimmed(claim.employerName);
  const applicationTitle = trimmed(claim.bavApplicationTitle);
  let drvDecisionDate = '';
  if (status === 'vested') {
    if (!employer) block('employer_name', 'Employer name is required');
    if (!claim.employmentEndDate) {
      block('employment_end_date', 'Employment end date is required');
    }
    // Optional (owner, 30 Oct 2026): the letters no longer print the
    // Bescheid date; when known it still labels the attachment.
    if (claim.drvDecisionDate) {
      drvDecisionDate = formatLetterDate(claim.drvDecisionDate);
    }
  } else if (status === 'non_vested' && !applicationTitle) {
    block(
      'application_title',
      'Application title is required for Non-Vested letters (e.g. "Antrag auf Beitragserstattung")'
    );
  }

  // Bank block for the route
  let clientBank: string | null = null;
  let lawFirmBank: string | null = null;
  if (isLaw) {
    if (options.lawFirmAccount) {
      lawFirmBank = lawFirmBankDetails(options.lawFirmAccount);
    } else {
      block(
        'law_firm_bank_details',
        'Law-firm Anderkonto is not configured (LAW_FIRM_IBAN / LAW_FIRM_BIC / LAW_FIRM_BANK)'
      );
    }
  } else {
    const bank = clientBankDetails(claim);
    clientBank = bank.text;
    if (!bank.text) {
      block(
        'client_bank_details',
        `Client bank details incomplete: ${bank.missing.join(', ')}`
      );
    }
  }

  // Aktenzeichen: entered by the law firm after release. Until then the
  // letter is generated without the "Unser Zeichen" line.
  const az = trimmed(claim.lawFirmRef);
  if (isLaw) {
    if (!az) {
      note(
        'law_firm_az',
        'No Aktenzeichen yet: the letter has no "Unser Zeichen" line until the law firm saves it'
      );
    } else if (!AKTENZEICHEN_PATTERN.test(az)) {
      block(
        'law_firm_az',
        `Aktenzeichen "${az}" does not match the agreed format 12345-YY`
      );
    }
  }

  // Pack
  const pack = planBavPack({
    authority: isLaw ? 'voll' : 'pev',
    status,
    drvDecisionDate,
    providerFormTitle: trimmed(claim.bavProviderFormTitle),
    statementType: trimmed(claim.bavStatementType),
    statementDate: claim.bavStatementDate
      ? formatLetterDate(claim.bavStatementDate)
      : '',
    documents: options.documents,
  });
  for (const message of pack.missing) block('documents', message);

  const agent = options.postalAgent;
  const agentLines = [
    agent.name,
    ...(agent.coLine ? [agent.coLine] : []),
    agent.street,
    `${agent.postalCode} ${agent.city}`,
  ];

  const context: TemplateContext = {
    client_full_name: fullName,
    client_residential_address: addressLines.join('\n'),
    client_residential_address_inline: addressLines.join(', '),
    client_date_of_birth: dob,
    client_signature: options.signatureText ?? '',

    recipient_name: recipientName,
    recipient_postal_address: recipientPostalAddressLines(claim).join('\n'),
    reference_label: reference?.label ?? '',
    reference_value: reference?.value ?? '',

    employer_name: employer,
    employment_end_date: claim.employmentEndDate
      ? formatLetterDate(claim.employmentEndDate)
      : '',
    drv_name: trimmed(claim.drvOffice),
    drv_decision_date: drvDecisionDate,
    application_title: applicationTitle,

    client_bank_details: clientBank ?? '',
    law_firm_bank_details: lawFirmBank ?? '',

    postal_agent_name: agent.name,
    postal_agent_address: agentLines.join('\n'),

    law_firm_name: LAW_FIRM.name,
    law_firm_street: LAW_FIRM.street,
    law_firm_postal_code: LAW_FIRM.postalCode,
    law_firm_city: LAW_FIRM.city,
    law_firm_postal_address: LAW_FIRM_SENDER_LINE,
    law_firm_az: isLaw && AKTENZEICHEN_PATTERN.test(az) ? az : '',
    lawyer_name: LAW_FIRM.lawyerName,
    lawyer_title: LAW_FIRM.lawyerTitle,
    lawyer_signature_space: options.lawyerSignatureSpace ?? '',

    procedure_description: status
      ? procedureDescription(status, recipientName, employer, applicationTitle)
      : '',
    signature_place: signaturePlace,
    signature_date: formatLetterDate(options.letterDate),
    attachment_list: pack.enclosures
      .map((e, i) => `${i + 1}. ${e.label}`)
      .join('\n'),
  };

  return {
    status,
    statusSource: source,
    route,
    templateId,
    templateName: templateId ? BAV_COVER_TEMPLATE_NAMES[templateId] : null,
    authority: isLaw ? 'VOLL' : 'PEV',
    context,
    enclosures: pack.enclosures,
    issues,
  };
}

export function blockingIssues(plan: BavLetterPlan): BavLetterIssue[] {
  return plan.issues.filter((i) => i.blocking);
}
