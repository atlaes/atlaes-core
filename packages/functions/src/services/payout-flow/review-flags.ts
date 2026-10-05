/**
 * "Payout details need review" (brief Part 2 §3): any change of bank
 * details against intake, an account holder other than the client, or an
 * account country different from the client's residence/nationality →
 * notice e-mail to the registered address + admin flag before the case
 * enters the payout queue. Pure.
 */

import type { PayoutReviewReason } from '../../drizzle/schema/payout';
import { compact, countryCode } from './bank-validation';

export interface IntakeBank {
  accountHolderName: string | null;
  iban: string | null;
  accountNumber: string | null;
  swiftBic: string | null;
  bsb: string | null;
  bankCountry: string | null;
}

export interface ClientIdentity {
  firstName: string | null;
  lastName: string | null;
  residenceCountry: string | null; // name or code
  nationality: string | null; // name or code
}

export interface ConfirmedAccount {
  accountHolder: string;
  country: string;
  iban: string | null;
  accountNumber: string | null;
  bic: string | null;
}

function normName(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/** Holder matches when every client name part appears in the holder name. */
export function holderIsClient(
  holder: string,
  client: ClientIdentity
): boolean {
  const h = new Set(normName(holder).split(' ').filter(Boolean));
  const parts = normName(`${client.firstName ?? ''} ${client.lastName ?? ''}`)
    .split(' ')
    .filter(Boolean);
  if (!parts.length) return true; // nothing to compare against
  return parts.every((p) => h.has(p));
}

export function reviewReasons(
  account: ConfirmedAccount,
  intake: IntakeBank,
  client: ClientIdentity
): PayoutReviewReason[] {
  const reasons: PayoutReviewReason[] = [];

  const intakeNumber = compact(intake.iban) || compact(intake.accountNumber);
  const newNumber = compact(account.iban) || compact(account.accountNumber);
  const intakeCountry = countryCode(intake.bankCountry);
  const changed =
    (!!intakeNumber && intakeNumber !== newNumber) ||
    (!!intake.accountHolderName &&
      normName(intake.accountHolderName) !== normName(account.accountHolder)) ||
    (!!intakeCountry && intakeCountry !== account.country.toUpperCase());
  if (changed) {
    reasons.push({
      kind: 'bank_details_changed',
      detail: 'Bank details differ from the details given at intake.',
    });
  }
  if (!holderIsClient(account.accountHolder, client)) {
    reasons.push({
      kind: 'holder_not_client',
      detail: `Account holder "${account.accountHolder}" is not the client.`,
    });
  }
  const allowed = [client.residenceCountry, client.nationality]
    .map((c) => countryCode(c))
    .filter((c): c is string => !!c);
  if (allowed.length && !allowed.includes(account.country.toUpperCase())) {
    reasons.push({
      kind: 'country_mismatch',
      detail: `Account country ${account.country} differs from residence/nationality (${allowed.join(', ')}).`,
    });
  }
  return reasons;
}
