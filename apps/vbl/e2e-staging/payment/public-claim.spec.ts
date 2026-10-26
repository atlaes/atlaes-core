import {
  completeAddress,
  completeBankDetails,
  completeConfirmStep,
  completeMembership,
  completeSignature,
  navigatePublicSectorToEligible,
} from '../../e2e/get-started/helpers';
import {
  apiLogin,
  expect,
  loginViaMagicLink,
  requireE2eSecret,
  test,
  userApi,
} from '../support/auth';
import { startPayment, uploadSpecimenPassport } from '../support/onboarding';
import { payWithTestCard } from '../support/stripe';

/**
 * Scenarios 4 + 5 — a VBL/ZVK refund from the eligibility check into the
 * account and through to submission, on the real staging backend:
 * magic-link login, Stripe test payment, specimen passport with real OCR,
 * address, IBAN (EUR/SEPA account), declarations, signature, submission,
 * then the claim state via the API (paid, submitted, claim PDF handed to
 * the lettershop in test mode — parked in the cart, never printed).
 *
 * The test's own cleanup deletes the user, the claim, its S3 files and the
 * lettershop cart job.
 */

test.beforeEach(() => requireE2eSecret());

test('VBL refund: login → pay → passport → details → sign → submitted', async ({
  page,
  e2eEmail,
}, testInfo) => {
  const email = e2eEmail('claim');

  // Check → secure claim (the backend mails nothing to @e2e.test).
  await navigatePublicSectorToEligible(page);
  await page.getByRole('button', { name: /Create your secure claim/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Create your secure claim' })
  ).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /Continue with email/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' })
  ).toBeVisible();

  // "Click" the link from the e-mail in the same tab.
  await loginViaMagicLink(page, email, '/get-started?fromAuth=1');

  // Paygate → Stripe Checkout (test card) → back on /get-started.
  await startPayment(page);
  await payWithTestCard(page);

  // Identity with real OCR on a specimen passport.
  await uploadSpecimenPassport(page, testInfo, 'uto', 'png');

  await completeMembership(page);
  await completeAddress(page);
  await completeBankDetails(page);

  await expect(
    page.getByRole('heading', { name: 'Review your refund request' })
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Continue to confirmation/i }).click();
  // Per-institution declarations and authorisations.
  await completeConfirmStep(page);
  await completeSignature(page);
  await expect(
    page.getByRole('heading', {
      name: 'Your refund request has been submitted',
    })
  ).toBeVisible({ timeout: 90_000 });

  // Backend state.
  const { accessToken } = await apiLogin(email);
  const api = await userApi(accessToken);
  const list = await api.get('/api/claims');
  expect(list.status()).toBe(200);
  const { claims } = (await list.json()) as {
    claims: Array<{ id: string; status: string; paymentStatus: string }>;
  };
  expect(claims).toHaveLength(1);
  const res = await api.get(`/api/claims/${claims[0].id}`);
  const { claim } = (await res.json()) as {
    claim: {
      status: string;
      paymentStatus: string;
      firstName: string;
      lastName: string;
      iban?: string;
      lettershopSubmissionId: string | null;
      handlingRoute: string | null;
    };
  };
  expect(claim.status).toBe('submitted');
  expect(claim.paymentStatus).toBe('paid');
  expect(claim.lastName.toUpperCase()).toBe('SPECIMEN');
  expect(claim.handlingRoute).toBe('direct');
  // Lettershop runs in test mode on staging: the job id is the evidence
  // that the claim PDF reached the vendor's cart.
  expect(
    claim.lettershopSubmissionId,
    'claim PDF was not delivered to the lettershop'
  ).toBeTruthy();
  testInfo.annotations.push({
    type: 'lettershop',
    description: `printjob ${claim.lettershopSubmissionId} (deleted by cleanup)`,
  });
  await api.dispose();
});
