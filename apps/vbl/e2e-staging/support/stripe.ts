import { expect, type Frame, type Locator, type Page } from '@playwright/test';

/**
 * The VBL paygate (components/vbl/onboarding/steps/Payment.tsx) creates a
 * claim, asks the backend for a Stripe Checkout Session and redirects the
 * browser to the hosted page on checkout.stripe.com. Stripe sends the user
 * back to /get-started?payment=success&session_id=…, where the app calls
 * POST /api/payments/verify-session.
 *
 * Staging uses Stripe test mode, so the standard test card always succeeds.
 *
 * 13 Nov 2026: Stripe's hosted Checkout moved the whole form (card fields,
 * billing, "Save my information", Pay button) into an iframe, and the
 * fields lost their old ids (#cardNumber, #cardExpiry, ...). The helper
 * now finds the frame that holds the card form and fills fields by id or,
 * failing that, by their accessible label, so both layouts work.
 */
export const TEST_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '12 / 34',
  cvc: '123',
  name: 'SPECIMEN ERIKA',
  postalCode: '10115',
};

type Root = Page | Frame;

const cardAccordion = (root: Root) =>
  root.locator('[data-testid="card-accordion-item-button"]');
const cardNumber = (root: Root) =>
  root
    .locator('#cardNumber')
    .or(root.getByRole('textbox', { name: /card number/i }))
    .first();

async function visible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

/** The page or iframe that holds the card form (or its accordion). */
async function findCheckoutRoot(page: Page): Promise<Root> {
  let root: Root | null = null;
  await expect
    .poll(
      async () => {
        for (const candidate of [page, ...page.frames()] as Root[]) {
          if (
            (await visible(cardAccordion(candidate).first())) ||
            (await visible(cardNumber(candidate)))
          ) {
            root = candidate;
            return true;
          }
        }
        return false;
      },
      { timeout: 60_000, message: 'Stripe card form not found' }
    )
    .toBe(true);
  return root as unknown as Root;
}

/** First visible match among the given locators, or null. */
async function firstVisible(...locators: Locator[]): Promise<Locator | null> {
  for (const l of locators) {
    if (await visible(l.first())) return l.first();
  }
  return null;
}

export async function payWithTestCard(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });

  const root = await findCheckoutRoot(page);

  // Newer Checkout pages collapse the card form behind an accordion when
  // other methods are enabled.
  const accordion = cardAccordion(root).first();
  if (await visible(accordion)) await accordion.click();

  const email = root.locator('#email');
  if ((await email.count()) && (await email.isEditable())) {
    if ((await email.inputValue()) === '') {
      await email.fill('specimen@e2e.test');
    }
  }

  await expect(cardNumber(root)).toBeVisible({ timeout: 30_000 });
  await cardNumber(root).fill(TEST_CARD.number);
  await root
    .locator('#cardExpiry')
    .or(root.getByRole('textbox', { name: /expir/i }))
    .first()
    .fill(TEST_CARD.expiry);
  await root
    .locator('#cardCvc')
    .or(root.getByRole('textbox', { name: /security code|cvc/i }))
    .first()
    .fill(TEST_CARD.cvc);

  const billingName = await firstVisible(
    root.locator('#billingName'),
    root.getByRole('textbox', { name: /name on card/i })
  );
  if (billingName) await billingName.fill(TEST_CARD.name);

  const country = await firstVisible(
    root.locator('#billingCountry'),
    root.getByRole('combobox', { name: /^country/i })
  );
  if (country) await country.selectOption('DE');

  const postal = await firstVisible(
    root.locator('#billingPostalCode'),
    root.getByRole('textbox', { name: /zip|postal/i })
  );
  if (postal) await postal.fill(TEST_CARD.postalCode);

  // Do not save the card with Link (it would ask for a phone number).
  const saveInfo = await firstVisible(
    root.locator('#enableStripePass'),
    root.getByRole('checkbox', { name: /save my information/i })
  );
  if (saveInfo && (await saveInfo.isChecked())) await saveInfo.uncheck();

  await root
    .locator(
      '[data-testid="hosted-payment-submit-button"], button.SubmitButton'
    )
    .or(root.getByRole('button', { name: /^(pay|subscribe)$/i }))
    .first()
    .click();

  await page.waitForURL(/\/get-started/, { timeout: 90_000 });
}
