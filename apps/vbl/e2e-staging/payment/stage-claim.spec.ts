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
 * What the backend does with it today (services/claims-application.ts
 * submitClaim): a stage claim is a plain `vbl_refund` (pensionType
 * 'public'), handled 'direct' (defaultHandlingRoute), so the submission
 * tries to build the VBL claim PDF and hand it to the lettershop. That PDF
 * requires `svNummer` (services/claim-pdf/index.ts), but the stage
 * Membership step has no membership-number field (Membership.tsx hides it
 * for VddB/VddKO) and the stage employment answers are client-only. The
 * PDF generation fails non-fatally, so the claim is submitted and paid but
 * no claim package exists and nothing reaches the lettershop. The test
 * asserts that and tags it as a product bug.
 */

test.beforeEach(() => requireE2eSecret());

const PASSPORT = specimens.passports.ind;

test(
  'VddB refund: check → login → pay → passport → stage details → sign → submitted',
  {
    tag: '@product-bug',
    annotation: {
      type: 'product-bug',
      description:
        'Stage claims never get a claim PDF or a lettershop job: the stage ' +
        'Membership step asks no VddB/VddKO membership number, so svNummer ' +
        'stays empty and ClaimPdfService refuses to build the package ' +
        '(non-fatal, logged only). The backend also has no column for the ' +
        'stage provider or the stage employment answers, so a VddB claim is ' +
        'indistinguishable from a VBL claim.',
    },
  },
  async ({ page, e2eEmail }, testInfo) => {
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

    await completeStageMembership(page, {
      stageName: 'SPECIMEN Stadttheater',
      rolePosition: 'Violinist',
      employmentEndDate: '2020-01-31',
      currentOccupation: 'Office employee',
    });
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
    await page
      .getByRole('button', { name: /Continue to confirmation/i })
      .click();
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

    // Today's behaviour (product bug, see the annotation): no membership
    // number → no claim PDF → no lettershop job.
    expect(claim.svNummer).toBeNull();
    expect(
      claim.pdfS3Key,
      'A stage claim now gets a claim PDF: the svNummer gap is fixed, ' +
        'update this test to expect the lettershop delivery.'
    ).toBeNull();
    expect(claim.lettershopSubmissionId).toBeNull();
    testInfo.annotations.push({
      type: 'claim',
      description:
        `status=${claim.status} payment=${claim.paymentStatus} ` +
        `caseType=${claim.caseType} route=${claim.handlingRoute} ` +
        `pdf=${claim.pdfS3Key ?? 'none'} ` +
        `lettershop=${claim.lettershopSubmissionId ?? 'none'}`,
    });
  }
);
