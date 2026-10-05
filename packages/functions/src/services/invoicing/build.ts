import { toCountryCode } from './country';
import type { InvoicingConfig } from './config';
import type { CreateInvoiceInput } from './types';

export interface InvoiceClaimData {
  firstName: string | null;
  lastName: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2?: string | null;
  currentPostalCode: string | null;
  currentCity: string | null;
  currentCountry: string | null;
}

export interface InvoiceReceiptData {
  fee: number;
  atlaesShare: number;
  valueDate: string;
}

/** Amount invoiced for a receipt under the configured basis. */
export function invoiceAmount(
  receipt: InvoiceReceiptData,
  cfg: Pick<InvoicingConfig, 'amountBasis'>
): number {
  return cfg.amountBasis === 'fee' ? receipt.fee : receipt.atlaesShare;
}

/** Client name and address from the case (brief §6). */
export function buildInvoiceInput(
  claim: InvoiceClaimData,
  receipt: InvoiceReceiptData,
  cfg: InvoicingConfig,
  voucherDate: string
): CreateInvoiceInput {
  const name =
    [claim.firstName, claim.lastName].filter(Boolean).join(' ').trim() ||
    'Unknown client';
  const street = [claim.currentAddressLine1, claim.currentAddressLine2]
    .filter(Boolean)
    .join(', ');
  return {
    customer: {
      name,
      street: street || null,
      zip: claim.currentPostalCode,
      city: claim.currentCity,
      // Lexoffice requires a country; DE only when the case has none.
      countryCode: toCountryCode(claim.currentCountry) ?? 'DE',
    },
    voucherDate,
    lineItemName: cfg.lineItemName,
    grossAmount: invoiceAmount(receipt, cfg),
    taxRatePercent: cfg.taxRatePercent,
  };
}
