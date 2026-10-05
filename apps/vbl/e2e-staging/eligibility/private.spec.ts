import { expect, test, type Page } from '@playwright/test';
import {
  expectEligibleResult,
  fillPrivateStatementAmount,
  navigateToGetStarted,
  selectEmploymentType,
  selectPrivateEntryPath,
  selectPrivatePensionProvider,
  selectPrivateStatePensionRefund,
} from '../../e2e/get-started/helpers';

/**
 * Scenario 3 (eligibility check) — /get-started private bAV flow on staging.
 *
 * What the code does today (flows/private-sector.ts): the bAV check never
 * rejects. Every combination of the statutory-refund answer and the
 * statement value, under or over the BRSG II small-entitlement limits
 * (59.33 EUR / month, 7,119 EUR capital; lib/bav-thresholds.ts), reaches
 * "Your bAV cash-out can be started". The limits only drive an inline
 * "above the limit" warning in the logged-in "Basis of your cash-out
 * request" step (CashOutBasis.tsx), which needs a paid bAV claim and is not
 * covered here yet. The check offers Yes/No
 * only; "not sure" exists only as guidance text on that later step.
 */

async function startPrivate(page: Page) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'bAV / Company Pension Cash-Out');
  await selectPrivateEntryPath(page, 'Answer questions');
}

const AMOUNTS = [
  {
    label: 'monthly 59.33 (at the limit)',
    valueType: 'monthly_pension',
    amount: '59.33',
  },
  {
    label: 'monthly 59.34 (over the limit)',
    valueType: 'monthly_pension',
    amount: '59.34',
  },
  {
    label: 'capital 7,119 (at the limit)',
    valueType: 'capital_amount',
    amount: '7119',
  },
  {
    label: 'capital 7,120 (over the limit)',
    valueType: 'capital_amount',
    amount: '7120',
  },
  { label: 'no amount found', valueType: 'not_found', amount: undefined },
] as const;

test.describe('eligibility · private bAV', () => {
  for (const refund of ['Yes', 'No'] as const) {
    for (const value of AMOUNTS) {
      test(`statutory refund ${refund} · ${value.label} → can be started`, async ({
        page,
      }) => {
        await startPrivate(page);
        await selectPrivateStatePensionRefund(page, refund);
        await selectPrivatePensionProvider(page, 'Allianz');
        await fillPrivateStatementAmount(page, {
          valueType: value.valueType,
          statementAmount: value.amount,
        });
        await expectEligibleResult(page);
        await expect(
          page.getByRole('heading', {
            name: 'Your bAV cash-out can be started through CompanyPension',
          })
        ).toBeVisible();
      });
    }
  }

  test('"Other" provider with a free-text name → can be started', async ({
    page,
  }) => {
    await startPrivate(page);
    await selectPrivateStatePensionRefund(page, 'No');
    await selectPrivatePensionProvider(page, 'Other', 'Specimen Pensionskasse');
    await fillPrivateStatementAmount(page, {
      valueType: 'capital_amount',
      statementAmount: '4000',
    });
    await expectEligibleResult(page);
  });

  test('the statutory-refund question offers only Yes and No', async ({
    page,
  }) => {
    await startPrivate(page);
    await expect(
      page.getByRole('heading', {
        name: 'Have you already received your German state pension refund?',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Yes', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'No', exact: true })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /not sure/i })).toHaveCount(
      0
    );
  });
});
