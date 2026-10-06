import {
  completeBankDetails,
  completeSignature,
} from '../../e2e/get-started/helpers';
import {
  expect,
  loginViaMagicLink,
  requireE2eSecret,
  test,
} from '../support/auth';
import {
  BAV_DOCUMENTS,
  completeAddressAbroad,
  completeBavCashOutBasisRouteA,
  completeBavEmployment,
  completeBavHealthInsurance,
  completeBavMembership,
  fetchOnlyClaim,
  navigatePrivateBavToEligible,
  requestSecureClaim,
  updateOwnClaim,
} from '../support/journeys';
import { startPayment, uploadSpecimenPassport } from '../support/onboarding';
import { payWithTestCard } from '../support/stripe';
import specimens from '../fixtures/specimens.json';
import type { Page, Response } from '@playwright/test';

/**
 * Paid private bAV cash-out on the real staging backend: eligibility check
 * (DRV refund already received → route A, Allianz) → magic-link login →
 * bAV paygate consents → Stripe test payment → Filipino specimen passport
 * with real OCR (salutation prefilled from the passport sex) → contract
 * number → employment (employer, dates, Durchführungsweg, Steuer-ID) →
 * address abroad → health insurance certificate with real OCR → cash-out
 * basis route A with the specimen DRV Erstattungsbescheid (real OCR) →
 * IBAN → signature → review → submission, then the claim state via the
 * API.
 *
 * What the backend does with it (services/claims-application.ts
 * submitClaim): a bAV claim is `bav_cashout`; with no route chosen by ops
 * defaultHandlingRoute() makes it 'law_firm'. Submission builds the
 * Abfindung package (services/bav-letters, signer LAW), stores it in S3 for
 * the law firm and skips the lettershop, so `lettershopSubmissionId`
 * stays empty. There is no direct-vs-law-firm choice in the claimant flow;
 * ops switch it in the admin (PUT /api/admin/claims/:id/routing).
 *
 * Product bug: validateBavIntake requires BIC and bank name, but the bAV
 * flow never asks for them (BankDetails.tsx collects holder + IBAN only),
 * so the first submit is rejected. The test asserts that rejection, then
 * stores the two fields through the claimant API (what a fixed bank step
 * would send) and submits again from the UI. The recipient address is
 * filled from the provider matrix at submit time; if staging has no matrix
 * row for the provider the rejection names it too and the workaround adds
 * a specimen address (recorded as an annotation).
 */

test.beforeEach(() => requireE2eSecret());

const PASSPORT = specimens.passports.phl;
const DRV = BAV_DOCUMENTS.drvRefundDecision;
const PROVIDER = 'Allianz';
const EMPLOYMENT = {
  employerName: 'SPECIMEN Muster GmbH',
  employmentEndDate: '2024-06-30',
  personnelNumber: 'SPECIMEN-0001',
  durchfuehrungsweg: 'Direktversicherung',
  leftGermanyDate: '2024-07-15',
  taxId: '12 345 678 903',
};
const CONTRACT_REFERENCE = 'SPECIMEN-VN-0001';
// The BIC/bank of the standard test IBAN completeBankDetails enters
// (DE89 3704 0044 0532 0130 00).
const BANK = { swiftBic: 'COBADEFFXXX', bankName: 'Commerzbank' };

function submitResponse(page: Page): Promise<Response> {
  return page.waitForResponse(
    (r) =>
      /\/api\/claims\/[^/]+\/submit$/.test(new URL(r.url()).pathname) &&
      r.request().method() === 'POST',
    { timeout: 90_000 }
  );
}

test(
  'bAV cash-out: check → login → pay → passport → employment → health insurance → DRV decision → sign → submitted (law firm)',
  {
    tag: '@product-bug',
    annotation: {
      type: 'product-bug',
      description:
        'A bAV claim cannot be submitted from the UI: the backend requires ' +
        'BIC and bank name (validateBavIntake) but the bAV bank step only ' +
        'collects account holder and IBAN. The test stores both through ' +
        'the API and submits again.',
    },
  },
  async ({ page, e2eEmail }, testInfo) => {
    test.setTimeout(480_000);
    const email = e2eEmail('bav');

    await navigatePrivateBavToEligible(page);
    await requestSecureClaim(page, email, /Start bAV cash-out/i);
    await loginViaMagicLink(page, email, '/get-started?fromAuth=1');

    await expect(
      page.getByRole('heading', { name: 'Start your bAV cash-out request' })
    ).toBeVisible({ timeout: 30_000 });
    // Both bAV consent boxes gate the pay button (startPayment checks them).
    await expect(page.getByRole('checkbox')).not.toHaveCount(0);
    await startPayment(page);
    await payWithTestCard(page);

    await uploadSpecimenPassport(page, testInfo, 'phl', 'png', async () => {
      // bAV letters need Herr/Frau, prefilled from the passport sex.
      await expect(
        page.locator('select', { has: page.locator('option[value="herr"]') })
      ).toHaveValue('herr');
    });

    await completeBavMembership(page, PROVIDER, CONTRACT_REFERENCE);
    await completeBavEmployment(page, EMPLOYMENT);
    await completeAddressAbroad(page, {
      street: '1 Specimen Street',
      postalCode: '1000',
      city: 'Sample City',
      country: 'PH',
    });
    await completeBavHealthInsurance(page, testInfo);
    await completeBavCashOutBasisRouteA(page, testInfo);
    await completeBankDetails(page);
    await completeSignature(page);

    await expect(
      page.getByRole('heading', { name: 'Review your bAV cash-out request' })
    ).toBeVisible({ timeout: 20_000 });
    // The bAV-only review sections, each complete (an incomplete health
    // insurance section would carry an extra error label in its name).
    for (const [id, title] of [
      ['bav-employment', 'Employment'],
      ['health-insurance', 'Health insurance'],
      ['cash-out-basis', 'Cash-out basis'],
    ]) {
      await expect(page.locator(`#review-section-toggle-${id}`)).toHaveText(
        title
      );
    }
    const submitButton = page.getByRole('button', {
      name: /Submit lump-sum settlement request/i,
    });
    await expect(submitButton).toBeEnabled();

    // First submit: rejected today (product bug, see the annotation).
    const firstResponse = submitResponse(page);
    await submitButton.click();
    const first = await firstResponse;
    const firstBody = (await first.json()) as {
      success: boolean;
      error?: string;
    };
    testInfo.annotations.push({
      type: 'first-submit',
      description: `${first.status()}: ${firstBody.error ?? 'ok'}`,
    });
    expect(
      first.status(),
      'The first bAV submit was accepted: the BIC/bank-name gap is fixed, ' +
        'drop the workaround from this test.'
    ).toBe(400);
    expect(firstBody.error).toContain('BIC is required');
    expect(firstBody.error).toContain('Bank name is required');
    await expect(page.getByText(/BIC is required/)).toBeVisible();

    const { claim: draft } = await fetchOnlyClaim(email);
    expect(draft.status).toBe('draft');
    const recipientMissing = /Recipient (street|postal code|city)/.test(
      firstBody.error ?? ''
    );
    testInfo.annotations.push({
      type: 'provider-matrix',
      description: recipientMissing
        ? `no staging matrix row for "${PROVIDER}": specimen recipient address added`
        : `recipient address of "${PROVIDER}" filled from the provider matrix`,
    });
    await updateOwnClaim(email, draft.id, {
      ...BANK,
      ...(recipientMissing
        ? {
            bavRecipientStreet: 'Specimenstraße 1',
            bavRecipientPostalCode: '10115',
            bavRecipientCity: 'Berlin',
          }
        : {}),
    });

    const secondResponse = submitResponse(page);
    await submitButton.click();
    const second = await secondResponse;
    expect(second.status(), await second.text()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: 'Your refund request has been submitted',
      })
    ).toBeVisible({ timeout: 90_000 });

    // Backend state.
    const { claim, documentRoles } = await fetchOnlyClaim(email);
    expect(claim.status).toBe('submitted');
    expect(claim.paymentStatus).toBe('paid');
    expect(claim.submittedAt).toBeTruthy();
    expect(claim.caseType).toBe('bav_cashout');
    expect(claim.pensionType).toBe('private');
    // defaultHandlingRoute('bav_cashout') — no route chosen by ops yet.
    expect(claim.handlingRoute).toBe('law_firm');
    // Law-firm claims are never mailed by us: package stored, no lettershop.
    expect(
      claim.lettershopSubmissionId,
      'a law-firm-routed bAV claim was sent to the lettershop'
    ).toBeNull();
    expect(claim.pdfS3Key ?? '', 'bAV letter package stored').toMatch(
      /\/bav-package-\d+\.pdf$/
    );

    expect(claim.firstName.toUpperCase()).toBe(PASSPORT.givenNames);
    expect(claim.lastName.toUpperCase()).toBe(PASSPORT.surname);
    expect(claim.dateOfBirth).toBe(PASSPORT.dateOfBirth);
    expect(claim.salutation).toBe('herr');
    expect(claim.currentCountry).toBe('PH');
    expect(claim.bavProviderName).toBe(PROVIDER);
    expect(claim.bavContractReference).toBe(CONTRACT_REFERENCE);
    expect(claim.employerName).toBe(EMPLOYMENT.employerName);
    expect(claim.employmentEndDate).toBe(EMPLOYMENT.employmentEndDate);
    expect(claim.employerPersonnelNumber).toBe(EMPLOYMENT.personnelNumber);
    expect(claim.bavDurchfuehrungsweg).toBe(EMPLOYMENT.durchfuehrungsweg);
    expect(claim.moveOutDate).toBe(EMPLOYMENT.leftGermanyDate);
    expect((claim.taxId ?? '').replace(/\s/g, '')).toBe(
      EMPLOYMENT.taxId.replace(/\s/g, '')
    );
    // Direktversicherung → letter goes to the provider.
    expect(claim.bavAddresseeType).toBe('provider');
    expect(claim.bavRecipientName).toBe(PROVIDER);
    expect(claim.healthInsuranceType).toBe(BAV_DOCUMENTS.healthInsurance.type);
    expect(claim.drvRefundReceived).toBe(true);
    expect(claim.drvOffice).toBe(DRV.drvOffice);
    expect(claim.drvDecisionDate).toBe(DRV.decisionDate);
    expect(claim.iban).toBe('DE89370400440532013000');
    expect(claim.signatureId).toBeTruthy();
    expect(documentRoles).toEqual(
      expect.arrayContaining([
        'passport',
        'health_insurance',
        'drv_refund_decision',
      ])
    );

    testInfo.annotations.push({
      type: 'claim',
      description:
        `status=${claim.status} payment=${claim.paymentStatus} ` +
        `caseType=${claim.caseType} route=${claim.handlingRoute} ` +
        `package=${claim.pdfS3Key ?? 'none'} ` +
        `lettershop=${claim.lettershopSubmissionId ?? 'none'} ` +
        `lawFirmId=${claim.lawFirmId ?? 'unassigned'}`,
    });
  }
);
