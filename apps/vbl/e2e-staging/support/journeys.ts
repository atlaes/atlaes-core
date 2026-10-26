import { expect, type Page, type TestInfo } from '@playwright/test';
import path from 'path';
import {
  expectEligibleResult,
  fillPrivateStatementAmount,
  navigateToGetStarted,
  selectEmploymentEndDate,
  selectEmploymentType,
  selectPrivateEntryPath,
  selectPrivatePensionProvider,
  selectPrivateStatePensionRefund,
  selectPublicEntryPath,
  selectStageContributionDuration,
  selectStagePensionDetails,
} from '../../e2e/get-started/helpers';
import { apiLogin, userApi } from './auth';
import { FIXTURES } from './calculator';
import specimens from '../fixtures/specimens.json';

/**
 * Stage (VddB/VddKO) and private bAV steps of the paid /get-started journey
 * on the real staging stack. The mocked suite's helpers in
 * e2e/get-started/helpers.ts assume the public-sector VBL path from the
 * Membership step on; the steps here follow the stage and bAV branches of
 * components/vbl/get-started/GetStartedOnboardingFlow.tsx instead:
 *
 *   stage:  identity → membership (2 stage screens) → address → bank
 *           → review → confirm → signature (terminal, submits)
 *   bAV:    identity → membership → employment → address → health
 *           insurance → cash-out basis → bank → signature → review
 *           (terminal, submits)
 */

export const BAV_DOCUMENTS = specimens.documents;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fills a DatePartsInput (day text, month select, year text) found by its
 * visible label. The component has no label/for association, so the label
 * element's parent is the field's container.
 */
export async function fillDateParts(page: Page, label: string, iso: string) {
  const field = page
    .locator('label')
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })
    .locator('xpath=..');
  const [year, month, day] = iso.split('-');
  await field.getByPlaceholder('Day').fill(String(Number(day)));
  await field.locator('select').selectOption(MONTHS[Number(month) - 1]);
  await field.getByPlaceholder('Year').fill(year);
}

// ---------------------------------------------------------------------------
// Eligibility → secure claim
// ---------------------------------------------------------------------------

/**
 * VddB/VddKO check with 12–35 contribution months and an employment end
 * date (January 2020) long past the 24-month wait → eligible.
 */
export async function navigateStageClaimToEligible(
  page: Page,
  provider: 'VddB' | 'VddKO' = 'VddB'
) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'VddB / VddKO Refund');
  await selectPublicEntryPath(page, 'Answer questions');
  await selectStagePensionDetails(page, provider);
  await selectStageContributionDuration(page, '12 to 35 months');
  await selectEmploymentEndDate(page, 'January', '2020');
  await expectEligibleResult(page);
}

/**
 * bAV check: DRV refund already received (route A, § 3 Abs. 3 BetrAVG),
 * Allianz, a capital amount under the small-entitlement limit.
 */
export async function navigatePrivateBavToEligible(page: Page) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'bAV / Company Pension Cash-Out');
  await selectPrivateEntryPath(page, 'Answer questions');
  await selectPrivateStatePensionRefund(page, 'Yes');
  await selectPrivatePensionProvider(page, 'Allianz');
  await fillPrivateStatementAmount(page, {
    valueType: 'capital_amount',
    statementAmount: '4000',
  });
  await expectEligibleResult(page);
  await expect(
    page.getByRole('heading', {
      name: 'Your bAV cash-out can be started through CompanyPension',
    })
  ).toBeVisible();
}

/** Eligible result → "Create your secure claim" → e-mail sign-up. */
export async function requestSecureClaim(
  page: Page,
  email: string,
  cta: RegExp
) {
  await page.getByRole('button', { name: cta }).click();
  await expect(
    page.getByRole('heading', { name: 'Create your secure claim' })
  ).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /Continue with email/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' })
  ).toBeVisible();
}

// ---------------------------------------------------------------------------
// Shared steps
// ---------------------------------------------------------------------------

export interface SpecimenAddress {
  street: string;
  postalCode: string;
  city: string;
  /** ISO code, the value of the country select (lib/countries.ts). */
  country: string;
}

export async function completeAddressAbroad(
  page: Page,
  address: SpecimenAddress
) {
  await expect(
    page.getByRole('heading', { name: 'Your current residential address' })
  ).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder('Street and house number').fill(address.street);
  await page.getByPlaceholder('Postal code').fill(address.postalCode);
  await page.getByPlaceholder('City').fill(address.city);
  await page.locator('select').first().selectOption(address.country);
  await page.getByRole('button', { name: /Continue/i }).click();
}

// ---------------------------------------------------------------------------
// Stage (VddB / VddKO)
// ---------------------------------------------------------------------------

export interface StageDetails {
  /** VddB/VddKO membership number (stored as the claim's svNummer). */
  membershipNumber: string;
  stageName: string;
  rolePosition: string;
  employmentEndDate: string;
  currentOccupation: string;
}

/**
 * Membership step for a stage provider (Membership.tsx, item 26): two
 * internal screens, the first one with the membership number.
 */
export async function completeStageMembership(
  page: Page,
  provider: 'VddB' | 'VddKO',
  s: StageDetails
) {
  await expect(
    page.getByRole('heading', { name: 'Stage or orchestra employment details' })
  ).toBeVisible({ timeout: 15_000 });
  await page
    .getByLabel(`${provider} membership number`)
    .fill(s.membershipNumber);
  await page.getByPlaceholder('e.g. Berlin State Opera').fill(s.stageName);
  await page
    .getByPlaceholder('e.g. Violinist, actor, stage technician')
    .fill(s.rolePosition);
  await fillDateParts(
    page,
    'When did this employment end?',
    s.employmentEndDate
  );
  await page.getByRole('button', { name: /Continue/i }).click();

  await expect(
    page.getByRole('heading', { name: 'Leaving stage or orchestra employment' })
  ).toBeVisible();
  // Radios render as ['yes', 'no'] and ['no', 'yes'] (StageMembershipDetails).
  await page.locator('input[name="permanentlyStopped"]').first().check();
  await page.locator('select').selectOption('contract_ended');
  await page
    .getByPlaceholder('e.g. Office employee, self-employed, freelancer')
    .fill(s.currentOccupation);
  await page.locator('input[name="unableToWorkHealth"]').first().check();
  await page.getByRole('button', { name: /Continue/i }).click();
}

// ---------------------------------------------------------------------------
// Private bAV
// ---------------------------------------------------------------------------

export interface BavBank {
  iban: string;
  swiftBic: string;
  bankName: string;
}

/**
 * Bank step of the bAV flow: own EUR/SEPA account, IBAN plus the BIC and
 * bank name the Abfindung letters need (only asked for bAV claims).
 */
export async function completeBavBankDetails(page: Page, bank: BavBank) {
  await expect(
    page.getByRole('heading', { name: 'Where should the refund be paid?' })
  ).toBeVisible({ timeout: 5_000 });
  await page
    .getByRole('button', { name: /My own EUR \/ SEPA account/i })
    .click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Enter your bank details' })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByPlaceholder(/IBAN/i).fill(bank.iban);
  const continueButton = page.getByRole('button', { name: /Continue/i });
  // BIC and bank name are required for bAV.
  await expect(continueButton).toBeDisabled();
  await page.getByLabel('BIC / SWIFT code').fill(bank.swiftBic);
  await page.getByLabel('Name of the bank').fill(bank.bankName);
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
}

export async function completeBavMembership(
  page: Page,
  provider: string,
  contractReference: string
) {
  await expect(
    page.getByRole('heading', { name: 'Company pension membership details' })
  ).toBeVisible({ timeout: 15_000 });
  // The provider chosen in the eligibility check is carried over, locked.
  await expect(page.getByText(provider, { exact: true })).toBeVisible();
  await page
    .getByPlaceholder('Enter your contract, policy or reference number')
    .fill(contractReference);
  await page.getByRole('button', { name: /Continue/i }).click();
}

export interface BavEmployment {
  employerName: string;
  employmentEndDate: string;
  personnelNumber: string;
  /** Expected prefill from the provider (Employment.tsx). */
  durchfuehrungsweg: string;
  leftGermanyDate: string;
  taxId: string;
}

export async function completeBavEmployment(page: Page, e: BavEmployment) {
  await expect(
    page.getByRole('heading', { name: 'Your employment in Germany' })
  ).toBeVisible({ timeout: 15_000 });
  await page
    .getByPlaceholder('e.g. Muster Technologies GmbH')
    .fill(e.employerName);
  await fillDateParts(page, 'Last day of employment', e.employmentEndDate);
  await page
    .getByPlaceholder('Your employee or personnel number, if you know it')
    .fill(e.personnelNumber);
  const vehicle = page
    .locator('label')
    .filter({ hasText: /^How is your company pension set up\?$/ })
    .locator('xpath=..')
    .locator('select');
  // Prefilled from the provider (Allianz → Direktversicherung).
  await expect(vehicle).toHaveValue(e.durchfuehrungsweg);
  await fillDateParts(page, 'Date you left Germany', e.leftGermanyDate);
  await page.getByPlaceholder('11 digits, e.g. 12 345 678 901').fill(e.taxId);
  await page.getByRole('button', { name: /Continue/i }).click();
}

/**
 * Health insurance step: type first, then the specimen certificate with
 * real OCR (POST /vbl/extract-health-insurance-document). OCR results are
 * recorded as an annotation; an empty provider name is filled in.
 */
export async function completeBavHealthInsurance(
  page: Page,
  testInfo: TestInfo
) {
  const doc = BAV_DOCUMENTS.healthInsurance;
  await expect(
    page.getByRole('heading', { name: 'Health insurance confirmation' })
  ).toBeVisible({ timeout: 15_000 });
  await page.locator('select').first().selectOption(doc.type);
  const extraction = page.waitForResponse(
    (r) =>
      r.url().includes('/vbl/extract-health-insurance-document') &&
      r.request().method() === 'POST',
    { timeout: 120_000 }
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(FIXTURES, doc.file));
  const res = await extraction;
  await expect(
    page.getByRole('heading', { name: 'Confirm your health insurance details' })
  ).toBeVisible({ timeout: 120_000 });

  // The type chosen before the upload wins over OCR.
  await expect(page.locator('select').first()).toHaveValue(doc.type);
  const provider = page.getByPlaceholder(
    'Enter the name of your health insurance provider'
  );
  const notes = [`extract ${res.status()}`];
  const providerValue = (await provider.inputValue()).trim();
  if (providerValue === '') {
    notes.push('provider: empty, filled');
    await provider.fill(doc.providerName);
  } else {
    expect(providerValue.toUpperCase(), 'OCR provider name').toContain(
      'SPECIMEN'
    );
    notes.push(`provider: ${providerValue}`);
  }
  const number = page.getByPlaceholder(
    'Enter your health insurance number, if shown on your document'
  );
  notes.push(`number: ${(await number.inputValue()) || 'empty'}`);
  testInfo.annotations.push({
    type: 'ocr-health-insurance',
    description: notes.join('; '),
  });
  await page.getByRole('button', { name: /Continue/i }).click();
}

/**
 * Cash-out basis, route A: the "DRV refund received" answer is carried over
 * from the check; the specimen Erstattungsbescheid goes through real OCR
 * (POST /vbl/extract-drv-refund-decision). Office and date are asserted
 * when OCR returns them and filled in otherwise.
 */
export async function completeBavCashOutBasisRouteA(
  page: Page,
  testInfo: TestInfo
) {
  const doc = BAV_DOCUMENTS.drvRefundDecision;
  await expect(
    page.getByRole('heading', { name: 'Basis of your cash-out request' })
  ).toBeVisible({ timeout: 15_000 });
  const yes = page.getByRole('radio', { name: 'Yes, I received the refund' });
  await expect(yes, 'DRV answer carried over from the check').toHaveAttribute(
    'aria-checked',
    'true'
  );

  const upload = page.waitForResponse(
    (r) =>
      /\/documents(\/upload)?$/.test(new URL(r.url()).pathname) &&
      r.request().method() === 'POST',
    { timeout: 120_000 }
  );
  const extraction = page.waitForResponse(
    (r) =>
      r.url().includes('/vbl/extract-drv-refund-decision') &&
      r.request().method() === 'POST',
    { timeout: 120_000 }
  );
  await page
    .locator('#drv-refund-decision-file')
    .setInputFiles(path.join(FIXTURES, doc.file));
  const [uploadRes, extractRes] = await Promise.all([upload, extraction]);
  expect(uploadRes.ok(), 'DRV decision upload').toBe(true);
  await expect(page.getByText(doc.file)).toBeVisible();

  const notes = [`extract ${extractRes.status()}`];
  let ocrDate: string | null = null;
  if (extractRes.ok()) {
    const body = (await extractRes.json()) as {
      extraction?: {
        details?: {
          drvOffice?: string | null;
          decisionDate?: string | null;
          isRefundDecision?: boolean | null;
        };
      };
    };
    const details = body.extraction?.details ?? {};
    notes.push(
      `office: ${details.drvOffice ?? 'null'}`,
      `date: ${details.decisionDate ?? 'null'}`,
      `isRefundDecision: ${details.isRefundDecision ?? 'null'}`
    );
    if (details.decisionDate) {
      expect(details.decisionDate, 'OCR decision date').toBe(doc.decisionDate);
      ocrDate = details.decisionDate;
    }
    if (
      details.isRefundDecision !== null &&
      details.isRefundDecision !== undefined
    ) {
      expect(details.isRefundDecision, 'OCR recognises a refund decision').toBe(
        true
      );
    }
  }
  // Give the OCR result a moment to land in the form.
  const office = page.getByPlaceholder('e.g. Deutsche Rentenversicherung Bund');
  if (extractRes.ok()) {
    await expect(office)
      .not.toHaveValue('', { timeout: 5_000 })
      .catch(() => {});
  }
  const officeValue = (await office.inputValue()).trim();
  if (officeValue === '') {
    notes.push('office field: empty, filled');
    await office.fill(doc.drvOffice);
  } else {
    expect(officeValue, 'OCR DRV office').toBe(doc.drvOffice);
  }
  // DatePartsInput keeps its own day/month/year state from mount, so an OCR
  // date reaches the claim without showing in the three fields. Only type
  // the date when OCR did not deliver one.
  if (!ocrDate) {
    notes.push('decision date: filled');
    await fillDateParts(page, 'Date of the decision', doc.decisionDate);
  }
  testInfo.annotations.push({
    type: 'ocr-drv-decision',
    description: notes.join('; '),
  });
  await page.getByRole('button', { name: /Continue/i }).click();
}

// ---------------------------------------------------------------------------
// Backend state
// ---------------------------------------------------------------------------

export interface ClaimState {
  id: string;
  status: string;
  paymentStatus: string;
  caseType: string;
  pensionType: string | null;
  handlingRoute: string | null;
  lettershopSubmissionId: string | null;
  pdfS3Key: string | null;
  lawFirmId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string | null;
  passportNumber: string | null;
  currentCountry: string | null;
  iban: string | null;
  accountHolderName: string | null;
  swiftBic: string | null;
  bankName: string | null;
  signatureId: string | null;
  svNummer: string | null;
  pensionProvider: string | null;
  stageDetails: Record<string, string> | null;
  submissionHold: string | null;
  submissionHoldReason: string | null;
  salutation: string | null;
  taxId: string | null;
  moveOutDate: string | null;
  employerName: string | null;
  employmentEndDate: string | null;
  employerPersonnelNumber: string | null;
  bavProviderName: string | null;
  bavDurchfuehrungsweg: string | null;
  bavContractReference: string | null;
  bavAddresseeType: string | null;
  bavRecipientName: string | null;
  drvRefundReceived: boolean | null;
  drvOffice: string | null;
  drvDecisionDate: string | null;
  healthInsuranceType: string | null;
  healthInsuranceProviderName: string | null;
  submittedAt: string | null;
}

/** Signs in through the API and returns the user's only claim + docs. */
export async function fetchOnlyClaim(email: string) {
  const { accessToken } = await apiLogin(email);
  const api = await userApi(accessToken);
  try {
    const list = await api.get('/api/claims');
    expect(list.status()).toBe(200);
    const { claims } = (await list.json()) as { claims: Array<{ id: string }> };
    expect(claims).toHaveLength(1);
    const res = await api.get(`/api/claims/${claims[0].id}`);
    expect(res.status()).toBe(200);
    const { claim } = (await res.json()) as { claim: ClaimState };
    const docsRes = await api.get(`/api/claims/${claims[0].id}/documents`);
    expect(docsRes.status()).toBe(200);
    const { documents } = (await docsRes.json()) as {
      documents: Array<{ documentRole: string }>;
    };
    return { claim, documentRoles: documents.map((d) => d.documentRole) };
  } finally {
    await api.dispose();
  }
}
