import { expect, type Page, type TestInfo } from '@playwright/test';
import path from 'path';
import { FIXTURES } from './calculator';
import specimens from '../fixtures/specimens.json';

export type SpecimenCode = keyof typeof specimens.passports;

/**
 * Uploads a specimen passport on the Identity step, waits for the real OCR
 * and checks every field OCR filled against the specimen. Fields OCR left
 * empty are filled in and recorded as test annotations.
 */
export async function uploadSpecimenPassport(
  page: Page,
  testInfo: TestInfo,
  code: SpecimenCode = 'uto',
  format: 'png' | 'pdf' = 'png'
) {
  const specimen = specimens.passports[code];
  await expect(
    page.getByRole('heading', { name: /passport|Upload/i })
  ).toBeVisible({ timeout: 30_000 });
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(FIXTURES, specimen.files[format].name));
  await expect(
    page.getByRole('heading', { name: /Confirm your identity details/i })
  ).toBeVisible({ timeout: 120_000 });

  const notes: string[] = [];
  const check = async (
    label: string,
    locator: ReturnType<Page['getByPlaceholder']>,
    expected: string,
    fill: () => Promise<void>
  ) => {
    const value = (await locator.inputValue()).trim();
    if (value === '') {
      notes.push(`${label}: empty, filled`);
      await fill();
      return;
    }
    expect(value.toUpperCase(), `OCR ${label}`).toBe(expected.toUpperCase());
    notes.push(`${label}: ${value}`);
  };

  const firstName = page.getByPlaceholder('John');
  const lastName = page.getByPlaceholder('Smith');
  await check('first name', firstName, specimen.givenNames, () =>
    firstName.fill(specimen.givenNames)
  );
  await check('last name', lastName, specimen.surname, () =>
    lastName.fill(specimen.surname)
  );

  const [year, month, day] = specimen.dateOfBirth.split('-');
  const dayInput = page.getByPlaceholder('Day');
  const yearInput = page.getByPlaceholder('Year');
  await check('birth day', dayInput, String(Number(day)), () =>
    dayInput.fill(String(Number(day)))
  );
  await check('birth year', yearInput, year, () => yearInput.fill(year));
  const selects = page.locator('select');
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
  const monthSelect = selects.first();
  if ((await monthSelect.inputValue()) === '') {
    notes.push('birth month: empty, filled');
    await monthSelect.selectOption(MONTHS[Number(month) - 1]);
  } else {
    notes.push(`birth month: ${await monthSelect.inputValue()}`);
  }
  const genderSelect = selects.nth(1);
  const gender = specimen.sex === 'F' ? 'female' : 'male';
  if ((await genderSelect.inputValue()) === '') {
    notes.push('gender: empty, filled');
    await genderSelect.selectOption(gender);
  } else {
    expect(await genderSelect.inputValue(), 'OCR gender').toBe(gender);
  }

  const nationality = page.getByPlaceholder('e.g. Australian');
  if ((await nationality.inputValue()).trim() === '') {
    notes.push('nationality: empty, filled');
    await nationality.fill(specimen.nationalityName);
  } else {
    notes.push(`nationality: ${await nationality.inputValue()}`);
  }
  const placeOfBirth = page.getByPlaceholder('e.g. Sydney');
  await check('place of birth', placeOfBirth, specimen.placeOfBirth, () =>
    placeOfBirth.fill(specimen.placeOfBirth)
  );

  testInfo.annotations.push({ type: 'ocr', description: notes.join('; ') });
  await page.getByRole('button', { name: /Continue/i }).click();
}

/** Checks every consent box on the paygate and starts Stripe Checkout. */
export async function startPayment(page: Page) {
  await expect(
    page.getByRole('heading', {
      name: /Start your (refund claim|bAV cash-out request)/i,
    })
  ).toBeVisible({ timeout: 30_000 });
  const boxes = page.getByRole('checkbox');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) await boxes.nth(i).check();
  await page.getByRole('button', { name: /Pay €199/i }).click();
}
