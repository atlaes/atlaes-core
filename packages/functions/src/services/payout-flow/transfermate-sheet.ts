/**
 * TransferMate transfers sheet (owner file "TransferMate / Direct currency
 * routing overview — transfers columns", 30 Oct 2026): one row per
 * route-B payout in the column order A–Y of the "All" tab, so ops can
 * paste or import it until the Google Sheets API write is set up.
 *
 * Columns C, T, U, V, W and X must stay raw (leading zeros): import with
 * "Convert text to numbers, dates and formulas" switched off.
 */

import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../../utils/db';
import { claimsTable } from '../../drizzle/schema/claims';
import {
  payoutReleases,
  type PayoutAccount,
} from '../../drizzle/schema/payout';
import { payoutLines } from '../../drizzle/schema/payout-queue';

export const TRANSFERMATE_SHEET_HEADER = [
  'Amount',
  'Bank name',
  'Account No.',
  'SWIFT',
  'Account holder name ',
  'Buying',
  'Added Bene',
  'Status Katja',
  'Broker',
  'Status',
  'Payment date',
  'Value Date',
  'Notes',
  'Beneficiary type',
  'Reason for transfer',
  'Country Code',
  'Account type',
  'DOB',
  'Address',
  'IFSC',
  'BSB',
  'ABA',
  'Transit',
  'Institution Number',
  'DOB',
] as const;

export interface TransferMateSheetInput {
  amountEur: number;
  account: PayoutAccount;
  client: {
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null; // YYYY-MM-DD
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null; // name or ISO alpha-2
  };
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

let regionIndex: Map<string, string> | null = null;

/** ISO 3166 alpha-2 for a stored country name (or code). */
export function countryCode(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  if (!regionIndex) {
    regionIndex = new Map();
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    const A = 'A'.charCodeAt(0);
    for (let i = 0; i < 26; i++)
      for (let j = 0; j < 26; j++) {
        const code = String.fromCharCode(A + i, A + j);
        const name = names.of(code);
        if (name && name !== code) regionIndex.set(norm(name), code);
      }
  }
  return regionIndex.get(norm(v)) ?? '';
}

function dob(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

const holderKey = (s: string) => norm(s.split(/\s+/).sort().join(' '));

/** One sheet row, columns A–Y. */
export function transferMateSheetRow(input: TransferMateSheetInput): string[] {
  const { account: a, client: c } = input;
  const currency = a.currency.toUpperCase();
  const clientName = [c.firstName, c.lastName].filter(Boolean).join(' ');
  const residence = countryCode(c.country);
  const routing = (label: string) =>
    a.routingLabel === label ? (a.routingValue ?? '') : '';
  const [transit, institution] =
    a.routingLabel === 'Transit/Institution' && a.routingValue
      ? a.routingValue.split('-')
      : ['', ''];
  const address = [
    c.addressLine1,
    c.addressLine2,
    [c.postalCode, c.city].filter(Boolean).join(' '),
  ]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ');
  return [
    input.amountEur.toFixed(2),
    a.bank,
    a.iban || a.accountNumber || '',
    a.bic ?? '',
    a.accountHolder,
    currency,
    '',
    '',
    'TransferMate',
    '',
    '',
    '',
    clientName && holderKey(clientName) !== holderKey(a.accountHolder)
      ? `Client name: ${clientName}`
      : '',
    'Individual',
    'Professinal services',
    residence,
    currency === 'INR'
      ? residence === 'IN'
        ? 'Resident'
        : 'Non-Resident'
      : '',
    dob(c.dateOfBirth),
    address,
    routing('IFSC'),
    routing('BSB'),
    routing('Routing number'),
    transit ?? '',
    institution ?? '',
    '',
  ];
}

const csvCell = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export function transferMateSheetCsv(rows: string[][]): string {
  return `${[TRANSFERMATE_SHEET_HEADER as readonly string[], ...rows]
    .map((r) => r.map(csvCell).join(','))
    .join('\r\n')}\r\n`;
}

/**
 * Signed route-B payouts whose onward transfer is not recorded yet,
 * oldest first.
 */
export async function pendingTransferMateRows(): Promise<string[][]> {
  const rows = await db
    .select({ release: payoutReleases, claim: claimsTable, line: payoutLines })
    .from(payoutReleases)
    .innerJoin(claimsTable, eq(claimsTable.id, payoutReleases.claimId))
    .innerJoin(
      payoutLines,
      and(
        eq(payoutLines.payoutReleaseId, payoutReleases.id),
        eq(payoutLines.kind, 'client')
      )
    )
    .where(
      and(
        eq(payoutReleases.status, 'signed'),
        eq(payoutReleases.route, 'B'),
        isNull(payoutReleases.onwardTransferDate)
      )
    )
    .orderBy(asc(payoutReleases.signedAt));
  return rows
    .filter((r) => r.release.account)
    .map(({ release, claim, line }) =>
      transferMateSheetRow({
        amountEur: Number(line.amount),
        account: release.account as PayoutAccount,
        client: {
          firstName: claim.firstName,
          lastName: claim.lastName,
          dateOfBirth: claim.dateOfBirth,
          addressLine1: claim.currentAddressLine1,
          addressLine2: claim.currentAddressLine2,
          postalCode: claim.currentPostalCode,
          city: claim.currentCity,
          country: claim.currentCountry,
        },
      })
    );
}
