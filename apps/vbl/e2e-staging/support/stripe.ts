import { expect, type Page } from '@playwright/test';

/**
 * The VBL paygate (components/vbl/onboarding/steps/Payment.tsx) creates a
 * claim, asks the backend for a Stripe Checkout Session and redirects the
 * browser to the hosted page on checkout.stripe.com. Stripe sends the user
 * back to /get-started?payment=success&session_id=…, where the app calls
 * POST /api/payments/verify-session.
 *
 * Staging uses Stripe test mode, so the standard test card always succeeds.
 */
export const TEST_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '12 / 34',
  cvc: '123',
  name: 'SPECIMEN ERIKA',
  postalCode: '10115',
};

export async function payWithTestCard(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });

  // Newer Checkout pages collapse the card form behind an accordion when
  // other methods are enabled.
  const cardAccordion = page.locator(
    '[data-testid="card-accordion-item-button"]'
  );
  const cardNumber = page.locator('#cardNumber');
  await expect(cardAccordion.or(cardNumber).first()).toBeVisible({
    timeout: 60_000,
  });
  if (await cardAccordion.isVisible()) {
    await cardAccordion.click();
  }

  const email = page.locator('#email');
  if ((await email.count()) && (await email.isEditable())) {
    if ((await email.inputValue()) === '') {
      await email.fill('specimen@e2e.test');
    }
  }

  await cardNumber.fill(TEST_CARD.number);
  await page.locator('#cardExpiry').fill(TEST_CARD.expiry);
  await page.locator('#cardCvc').fill(TEST_CARD.cvc);
  const billingName = page.locator('#billingName');
  if (await billingName.isVisible()) await billingName.fill(TEST_CARD.name);
  const country = page.locator('#billingCountry');
  if (await country.isVisible()) await country.selectOption('DE');
  const postal = page.locator('#billingPostalCode');
  if (await postal.isVisible()) await postal.fill(TEST_CARD.postalCode);

  // Do not save the card with Link.
  const saveInfo = page.locator('#enableStripePass');
  if ((await saveInfo.count()) && (await saveInfo.isChecked())) {
    await saveInfo.uncheck();
  }

  await page
    .locator(
      '[data-testid="hosted-payment-submit-button"], button.SubmitButton'
    )
    .first()
    .click();

  await page.waitForURL(/\/get-started/, { timeout: 90_000 });
}
