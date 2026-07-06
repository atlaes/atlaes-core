import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';
import path from 'path';
import {
  navigateToGetStarted,
  navigatePrivateSectorToEligible,
  selectEmploymentType,
  selectPrivateEntryPath,
  selectPrivateStatePensionRefund,
  selectPrivatePensionProvider,
  fillPrivateStatementAmount,
  expectEligibleResult,
  completeCreateAccount,
  completePayment,
  completeIdentityUpload,
  completeAddress,
  TEST_EMAIL,
} from './helpers';

const TEST_PASSPORT_PATH = path.join(__dirname, '../../public/USA.pdf');

// ============================================================
// Final review fix wave — CRITICAL 1 regression coverage.
//
// Before this fix, the private/bAV flow's eligibility-selected provider
// (eligibilityData.privatePensionProvider / privatePensionProviderOther) was
// never mapped into membership.pensionProvider — only the public/stage
// flow's eligibilityData.pensionProvider was read. bAV claimants therefore
// hit Membership.tsx's locked, read-only provider box empty (no dropdown
// fallback, by design) and a permanently disabled Continue: a dead end.
//
// This spec walks the bAV path end-to-end from eligibility through
// Membership (asserting the provider box shows the eligibility-selected
// provider and the bAV-specific "Contract, policy or reference number"
// label) → Health Insurance (completed) → Review (bAV heading present),
// following the mocked-API pattern from onboarding-full-flow.spec.ts.
// ============================================================

async function mockOnboardingApi(page: import('@playwright/test').Page) {
  const user = { id: 'user_mock', email: TEST_EMAIL, emailVerified: true };
  const claim = {
    id: 'claim_mock',
    userId: user.id,
    status: 'draft',
    workflowState: 'draft',
    completedSteps: {},
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/auth/magic-link/request', (route) =>
    route.fulfill(
      json({
        message: 'Magic link sent',
        magicLink: 'http://localhost:3000/auth/magic-link?token=mock-token',
      })
    )
  );
  await page.route('**/api/auth/magic-link/verify', (route) =>
    route.fulfill(
      json({
        message: 'Verified',
        user,
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
        isNewUser: false,
      })
    )
  );
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user })));
  await page.route('**/api/claims', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(json({ success: true, claim }));
    }
    return route.fulfill(json({ success: true, claims: [claim] }));
  });
  await page.route('**/api/claims/claim_mock', (route) =>
    route.fulfill(json({ success: true, claim }))
  );
  await page.route('**/api/claims/claim_mock/documents', (route) =>
    route.fulfill(json({ success: true }))
  );
  await page.route('**/api/claims/claim_mock/steps/**', (route) =>
    route.fulfill(json({ success: true, claim }))
  );
  await page.route('**/api/documents/upload', (route) =>
    route.fulfill(
      json({
        success: true,
        document: {
          id: 'document_mock',
          fileName: 'passport.jpg',
          fileType: 'application/pdf',
          fileSize: 1000,
          documentType: 'passport',
          status: 'processed',
          createdAt: new Date().toISOString(),
        },
        ocr: {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-15',
          gender: 'male',
          placeOfBirth: 'Sydney',
          nationality: 'Australian',
          passportNumber: 'P1234567',
          passportIssueDate: '',
          passportExpiryDate: '',
          issuingCountry: 'AU',
        },
      })
    )
  );
  // Health Insurance document upload + OCR extraction (Task 15 endpoint).
  await page.route('**/vbl/extract-health-insurance-document', (route) =>
    route.fulfill(
      json({
        extraction: {
          details: {
            type: 'statutory',
            providerName: 'TK',
            providerAddress: 'Hamburg, Germany',
            insuredSinceMonth: 'January',
            insuredSinceYear: '2015',
            placeOfBirth: 'Sydney',
            countryOfBirth: 'Australia',
            insuranceNumber: 'HI123456',
          },
          confidence: {},
          missingFields: [],
          model: 'mock',
        },
      })
    )
  );
}

test.describe('bAV membership carry-over (final review fix — CRITICAL 1/2)', () => {
  test('bAV manual path: membership shows the eligibility-selected provider with the contract-number label, through to review', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockOnboardingApi(page);

    // 1. Eligibility — private/bAV sector, manual entry, provider = BVV.
    await navigatePrivateSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Start bAV cash-out|Create your secure claim/i,
      })
      .click();

    // 2. Account + payment.
    await completeCreateAccount(page);
    await completePayment(page);

    // 3. Identity.
    await completeIdentityUpload(page);

    // 4. Membership — the seam under test. Provider must show BVV (carried
    // over from eligibility, not empty), and the number field must use the
    // bAV-specific label instead of the generic/VBL one.
    await expect(
      page.getByRole('heading', { name: 'Company pension membership details' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('BVV', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Contract, policy or reference number')
    ).toBeVisible();

    const contractNumberInput = page.getByPlaceholder(
      'Enter your contract, policy or reference number'
    );
    await expect(contractNumberInput).toBeVisible();
    await contractNumberInput.fill('BVV-CONTRACT-001');
    await page.getByRole('button', { name: /Continue/i }).click();

    // 5. Address (shared substep).
    await completeAddress(page);

    // 6. Health Insurance — bAV/private-only substep. The intro line must
    // read the real carried-over provider name, not the generic fallback.
    await expect(
      page.getByRole('heading', { name: 'Health insurance confirmation' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        /^BVV requires current health insurance information to process your bAV cash-out request\.$/
      )
    ).toBeVisible();

    await page.locator('select').first().selectOption('statutory');

    const fileInput = page.locator('input[type="file"]');
    if (existsSync(TEST_PASSPORT_PATH)) {
      await fileInput.setInputFiles(TEST_PASSPORT_PATH);
    } else {
      await fileInput.setInputFiles({
        name: 'healthinsurance.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%EOF'),
      });
    }

    await expect(
      page.getByRole('heading', {
        name: 'Confirm your health insurance details',
      })
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Continue/i }).click();

    // 7. Bank details (shared).
    await expect(
      page.getByRole('heading', { name: 'Where should the refund be paid?' })
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole('button', { name: /My own EUR \/ SEPA account/i })
      .click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Enter your bank details' })
    ).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/IBAN/i).fill('DE89370400440532013000');
    await page.getByRole('button', { name: /Continue/i }).click();

    // 8. Signature (shared).
    await expect(
      page.getByRole('heading', { name: 'Add your signature' })
    ).toBeVisible({ timeout: 5_000 });
    const canvas = page.locator('canvas');
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 80);
      await page.mouse.up();
    }
    await page.getByLabel('I confirm that this is my legal signature.').check();
    await page.getByRole('button', { name: /Continue/i }).click();

    // 9. Review — bAV-specific heading (IMPORTANT 5), and the Critical-1
    // seam stays closed: Pension details / Health insurance sections show
    // the carried-over provider, no dead-end anywhere in the walk above.
    await expect(
      page.getByRole('heading', { name: 'Review your bAV cash-out request' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', {
        name: /Submit lump-sum settlement request/i,
      })
    ).toBeEnabled();
  });

  test('bAV Other-provider path: membership shows the free-text provider name', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await mockOnboardingApi(page);

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivateStatePensionRefund(page, 'No');
    await selectPrivatePensionProvider(page, 'Other', 'Acme Pension Fund');
    await fillPrivateStatementAmount(page, {
      statementAmount: '9000',
      valueType: 'capital_amount',
    });
    await expectEligibleResult(page);

    await page
      .getByRole('button', {
        name: /Start bAV cash-out|Create your secure claim/i,
      })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);

    // The free-text "Other" provider name must carry over verbatim, not the
    // literal 'Other' enum value.
    await expect(
      page.getByRole('heading', { name: 'Company pension membership details' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('Acme Pension Fund', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Other', { exact: true })).not.toBeVisible();
  });
});
