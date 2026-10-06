import {
  completeBankDetails,
  completeConfirmStep,
  completeSignature,
} from '../../e2e/get-started/helpers';
import {
  expect,
  loginViaMagicLink,
  requireE2eSecret,
  test,
} from '../support/auth';
import {
  completeAddressAbroad,
  completeStageMembership,
  fetchOnlyClaim,
  navigateStageClaimToEligible,
  requestSecureClaim,
} from '../support/journeys';
import { startPayment, uploadSpecimenPassport } from '../support/onboarding';
import { payWithTestCard } from '../support/stripe';
import specimens from '../fixtures/specimens.json';

/**
 * Paid VddB (stage) refund on the real staging backend: eligibility check
 * (12–35 contribution months, employment ended January 2020, so the
 * 24-month wait is over) → magic-link login → Stripe test payment →
 * Indian specimen passport with real OCR → both stage employment screens →
 * address abroad → IBAN → review → stage declarations → signature →
 * submission, then the claim state via the API.
 *
 * What the backend does with it (services/claims-application.ts
 * submitClaim): a stage claim is a `vbl_refund` (pensionType 'public')
 * handled 'direct', and it now carries its institution (pensionProvider
 * 'VddB'), the membership number (svNummer) and the stage answers
 * (stageDetails). There is no VddB/VddKO claim form in the system yet, so
 * the claim is NOT sent to the lettershop with the VBL L203: it is put on
 * the 'manual_submission_required' hold and ops submit it by hand.
 */

test.beforeEach(() => requireE2eSecret());

const PASSPORT = specimens.passports.ind;
const STAGE = {
  membershipNumber: 'SPECIMEN-VDDB-0001',
  stageName: 'SPECIMEN Stadttheater',
  rolePosition: 'Violinist',
  employmentEndDate: '2020-01-31',
  currentOccupation: 'Office employee',
};

test('VddB refund: check → login → pay → passport → stage details (membership number) → sign → submitted, held for manual submission', async ({
  page,
  e2eEmail,
}, testInfo) => {
  test.setTimeout(360_000);
  const email = e2eEmail('vddb');

  await navigateStageClaimToEligible(page, 'VddB');
  await requestSecureClaim(page, email, /Create your secure claim/i);
  await loginViaMagicLink(page, email, '/get-started?fromAuth=1');

  // Stage claims get the public refund paygate, not the bAV one.
  await expect(
    page.getByRole('heading', { name: 'Start your refund claim' })
  ).toBeVisible({ timeout: 30_000 });
  await startPayment(page);
  await payWithTestCard(page);

  await uploadSpecimenPassport(page, testInfo, 'ind', 'png');

  await completeStageMembership(page, 'VddB', STAGE);
  await completeAddressAbroad(page, {
    street: '1 Specimen Road',
    postalCode: '110001',
    city: 'Sample Town',
    country: 'IN',
  });
  await completeBankDetails(page);

  await expect(
    page.getByRole('heading', { name: 'Review your refund request' })
  ).toBeVisible({ timeout: 20_000 });
  // Stage claims get the extra employment-details section (item 27).
  await expect(
    page.getByRole('button', { name: /Employment Details/i })
  ).toBeVisible();
  await page.getByRole('button', { name: /Continue to confirmation/i }).click();
  await completeConfirmStep(page);
  await completeSignature(page);
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
  expect(claim.caseType).toBe('vbl_refund');
  expect(claim.pensionType).toBe('public');
  expect(claim.handlingRoute).toBe('direct');
  expect(claim.firstName.toUpperCase()).toBe(PASSPORT.givenNames);
  expect(claim.lastName.toUpperCase()).toBe(PASSPORT.surname);
  expect(claim.dateOfBirth).toBe(PASSPORT.dateOfBirth);
  expect(claim.passportNumber).toBeTruthy();
  expect(claim.currentCountry).toBe('IN');
  expect(claim.iban).toBe('DE89370400440532013000');
  expect(claim.signatureId).toBeTruthy();
  expect(documentRoles).toContain('passport');

  // The VddB data is stored on the claim.
  expect(claim.pensionProvider).toBe('VddB');
  expect(claim.svNummer).toBe(STAGE.membershipNumber);
  expect(claim.stageDetails).toMatchObject({
    stageName: STAGE.stageName,
    rolePosition: STAGE.rolePosition,
    employmentEndDate: STAGE.employmentEndDate,
    currentOccupation: STAGE.currentOccupation,
    permanentlyStopped: 'yes',
    reasonForLeaving: 'contract_ended',
    unableToWorkHealth: 'no',
  });
  // No VddB form exists yet: held for manual submission by ops, never
  // mailed with the VBL L203.
  expect(claim.submissionHold).toBe('manual_submission_required');
  expect(claim.pdfS3Key).toBeNull();
  expect(
    claim.lettershopSubmissionId,
    'a VddB claim was sent to the lettershop'
  ).toBeNull();
  testInfo.annotations.push({
    type: 'claim',
    description:
      `status=${claim.status} payment=${claim.paymentStatus} ` +
      `caseType=${claim.caseType} route=${claim.handlingRoute} ` +
      `provider=${claim.pensionProvider ?? 'none'} ` +
      `hold=${claim.submissionHold ?? 'none'} ` +
      `pdf=${claim.pdfS3Key ?? 'none'} ` +
      `lettershop=${claim.lettershopSubmissionId ?? 'none'}`,
  });
});
