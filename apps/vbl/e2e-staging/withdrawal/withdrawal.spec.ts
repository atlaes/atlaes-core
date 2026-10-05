import {
  apiLogin,
  expect,
  loginViaMagicLink,
  requireE2eSecret,
  test,
  userApi,
} from '../support/auth';

/**
 * Scenario 6 — contract withdrawal (/withdraw-contract), public
 * identification path and logged-in path, against the staging backend.
 * The claim is set up through the API (draft claim with the claimant's
 * name, as the Identity step stores it); the confirmation e-mail goes to
 * an @e2e.test address, which the backend never hands to SES.
 */

test.beforeEach(() => requireE2eSecret());

const FIRST = 'ERIKA';
const LAST = 'SPECIMEN';

async function createDraftClaim(email: string) {
  const { accessToken } = await apiLogin(email);
  const api = await userApi(accessToken);
  const created = await api.post('/api/claims', { data: {} });
  expect(created.status(), await created.text()).toBeLessThan(300);
  const { claim } = (await created.json()) as { claim: { id: string } };
  const updated = await api.put(`/api/claims/${claim.id}`, {
    data: { firstName: FIRST, lastName: LAST },
  });
  expect(updated.status(), await updated.text()).toBe(200);
  return { claimId: claim.id, api };
}

test('public path: identify by name, e-mail and claim ID, then confirm', async ({
  page,
  e2eEmail,
}) => {
  const email = e2eEmail('withdraw-public');
  const { claimId, api } = await createDraftClaim(email);

  await page.goto('/withdraw-contract');
  await expect(
    page.getByRole('heading', { name: 'Withdraw your CompanyPension contract' })
  ).toBeVisible();
  await page.getByLabel('Full name').fill(`${FIRST} ${LAST}`);
  await page.getByLabel('Email address used for CompanyPension').fill(email);
  await page.getByLabel('Claim ID').fill(claimId);
  await page.getByLabel('Pension type or pension institution').fill('VBL');
  await page.getByRole('button', { name: 'Continue to confirmation' }).click();

  await expect(
    page.getByRole('heading', { name: 'Confirm contract withdrawal' })
  ).toBeVisible();
  await expect(page.getByText(claimId)).toBeVisible();
  await expect(
    page.getByText('CompanyPension will stop processing your application.', {
      exact: false,
    })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirm withdrawal' }).click();
  await expect(
    page.getByRole('heading', { name: 'Withdrawal received' })
  ).toBeVisible();

  // A second withdrawal of the same claim is refused (duplicate guard).
  const again = await api.post('/api/withdrawals/confirm', {
    data: { claimId },
  });
  expect(again.status()).toBe(409);
  await api.dispose();
});

test('public path: a wrong name is answered with the generic message', async ({
  page,
  e2eEmail,
}) => {
  const email = e2eEmail('withdraw-wrong');
  const { claimId, api } = await createDraftClaim(email);
  await api.dispose();

  await page.goto('/withdraw-contract');
  await page.getByLabel('Full name').fill('NOT THE OWNER');
  await page.getByLabel('Email address used for CompanyPension').fill(email);
  await page.getByLabel('Claim ID').fill(claimId);
  await page.getByLabel('Pension type or pension institution').fill('VBL');
  await page.getByRole('button', { name: 'Continue to confirmation' }).click();
  await expect(
    page.getByText(/could not identify the contract/i)
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Confirm contract withdrawal' })
  ).toHaveCount(0);
});

test('logged-in path: the owner withdraws from their account', async ({
  page,
  e2eEmail,
}) => {
  const email = e2eEmail('withdraw-login');
  const { claimId, api } = await createDraftClaim(email);
  await api.dispose();

  await loginViaMagicLink(
    page,
    email,
    `/withdraw-contract?claimId=${claimId}&institution=VBL`
  );

  // Logged-in owners skip the identification form. Magic-link accounts have
  // no profile name, so the page must not depend on it: the backend trusts
  // the signed-in owner and returns the name from the claim.
  await expect(
    page.getByRole('heading', { name: 'Confirm contract withdrawal' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Withdraw your CompanyPension contract',
    })
  ).toHaveCount(0);
  await expect(page.getByText(`${FIRST} ${LAST}`).first()).toBeVisible();
  await page.getByRole('button', { name: 'Confirm withdrawal' }).click();
  await expect(
    page.getByRole('heading', { name: 'Withdrawal received' })
  ).toBeVisible();
});
