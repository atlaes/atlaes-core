/**
 * Payout currency routing (owner files of 30 Oct 2026,
 * "ATLAES_TransferMate_Direct_currency_routing.json", as of 2026-10-30;
 * source: SummitFX "Currency Capability" PDF, Jan 2026, and ATLAES's
 * routing decisions). All payouts are funded from EUR.
 *
 *  1. Informal codes are normalised first (NTD → TWD, RMB → CNY, YEN → JPY).
 *  2. EUR always goes direct (Katja): SEPA for EU/EEA IBANs, an
 *     international wire otherwise. Never TransferMate.
 *  3. A currency on the TransferMate list may be converted through
 *     SummitFX/TransferMate (route B).
 *  4. Any other currency: no conversion option; the client is paid in EUR
 *     to their own account or gives a SEPA account.
 *
 * Extra beneficiary fields are asked for when the client enters bank
 * details, so the transfer can be set up without going back to them. Only
 * 21 of the currencies have confirmed field data (TransferMate bene matrix
 * v18); the rest still need the full matrix from SummitFX.
 */

export const CURRENCY_ALIASES: Record<string, string> = {
  NTD: 'TWD',
  RMB: 'CNY',
  YEN: 'JPY',
};

/** TransferMate currencies with their names (88). */
export const TRANSFERMATE_CURRENCIES: Record<string, string> = {
  AED: 'UAE dirham',
  AMD: 'Armenian dram',
  AOA: 'Angolan kwanza',
  ARS: 'Argentine peso',
  AUD: 'Australian dollar',
  BBD: 'Barbadian dollar',
  BDT: 'Bangladeshi taka',
  BHD: 'Bahraini dinar',
  BIF: 'Burundian franc',
  BND: 'Brunei dollar',
  BOB: 'Bolivian boliviano',
  BRL: 'Brazilian real',
  BWP: 'Botswana pula',
  BZD: 'Belize dollar',
  CAD: 'Canadian dollar',
  CHF: 'Swiss franc',
  CLP: 'Chilean peso',
  CNH: 'Chinese yuan (offshore)',
  CNY: 'Chinese yuan',
  COP: 'Colombian peso',
  CRC: 'Costa Rican colon',
  CZK: 'Czech koruna',
  DKK: 'Danish krone',
  DOP: 'Dominican peso',
  EGP: 'Egyptian pound',
  ETB: 'Ethiopian birr',
  FJD: 'Fijian dollar',
  GBP: 'British pound',
  GEL: 'Georgian lari',
  GTQ: 'Guatemalan quetzal',
  GYD: 'Guyanese dollar',
  HKD: 'Hong Kong dollar',
  HNL: 'Honduran lempira',
  HUF: 'Hungarian forint',
  IDR: 'Indonesian rupiah',
  ILS: 'Israeli shekel',
  INR: 'Indian rupee',
  ISK: 'Icelandic krona',
  JMD: 'Jamaican dollar',
  JOD: 'Jordanian dinar',
  JPY: 'Japanese yen',
  KES: 'Kenyan shilling',
  KHR: 'Cambodian riel',
  KRW: 'South Korean won',
  KWD: 'Kuwaiti dinar',
  KZT: 'Kazakhstani tenge',
  LKR: 'Sri Lankan rupee',
  LSL: 'Lesotho loti',
  MAD: 'Moroccan dirham',
  MGA: 'Malagasy ariary',
  MKD: 'Macedonian denar',
  MUR: 'Mauritian rupee',
  MXN: 'Mexican peso',
  MYR: 'Malaysian ringgit',
  MZN: 'Mozambican metical',
  NAD: 'Namibian dollar',
  NGN: 'Nigerian naira',
  NOK: 'Norwegian krone',
  NPR: 'Nepalese rupee',
  NZD: 'New Zealand dollar',
  OMR: 'Omani rial',
  PEN: 'Peruvian sol',
  PKR: 'Pakistani rupee',
  PLN: 'Polish zloty',
  PYG: 'Paraguayan guarani',
  RON: 'Romanian leu',
  RSD: 'Serbian dinar',
  RWF: 'Rwandan franc',
  SAR: 'Saudi riyal',
  SEK: 'Swedish krona',
  SGD: 'Singapore dollar',
  SLE: 'Sierra Leonean leone',
  SZL: 'Eswatini lilangeni',
  THB: 'Thai baht',
  TND: 'Tunisian dinar',
  TRY: 'Turkish lira',
  TTD: 'Trinidad and Tobago dollar',
  TWD: 'New Taiwan dollar',
  TZS: 'Tanzanian shilling',
  UGX: 'Ugandan shilling',
  USD: 'US dollar',
  UYU: 'Uruguayan peso',
  VND: 'Vietnamese dong',
  XAF: 'Central African CFA franc',
  XCD: 'East Caribbean dollar',
  XOF: 'West African CFA franc',
  ZAR: 'South African rand',
  ZMW: 'Zambian kwacha',
};

/** Mandatory beneficiary tax ID (BRL: CPF, BDT: 12-digit tax ID). */
export const TAX_ID_REQUIRED: readonly string[] = ['BDT', 'BRL'];
/** Mandatory beneficiary phone number. */
export const PHONE_REQUIRED: readonly string[] = ['BDT', 'BRL', 'KRW'];

/** ISO 4217 code after alias normalisation (trimmed, upper case). */
export function normaliseCurrency(value: string | null | undefined): string {
  const c = (value ?? '').trim().toUpperCase();
  return CURRENCY_ALIASES[c] ?? c;
}

export type CurrencyRoute = 'direct' | 'transfermate' | 'unsupported';

/** Where a payout in `currency` can go (rules 1–4 above). */
export function currencyRoute(currency: string): CurrencyRoute {
  const c = normaliseCurrency(currency);
  if (c === 'EUR') return 'direct';
  return c in TRANSFERMATE_CURRENCIES ? 'transfermate' : 'unsupported';
}

/** Extra beneficiary fields the conversion route needs for `currency`. */
export function extraBeneficiaryFields(
  currency: string
): Array<'taxId' | 'phone'> {
  const c = normaliseCurrency(currency);
  const out: Array<'taxId' | 'phone'> = [];
  if (TAX_ID_REQUIRED.includes(c)) out.push('taxId');
  if (PHONE_REQUIRED.includes(c)) out.push('phone');
  return out;
}
