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
  /** Deregistration surcharge included in fee and atlaesShare (EUR). */
  deregistrationSurcharge?: number;
}

/** Amount invoiced for a receipt under the configured basis. */
export function invoiceAmount(
  receipt: InvoiceReceiptData,
  cfg: Pick<InvoicingConfig, 'amountBasis'>
): number {
  return cfg.amountBasis === 'fee' ? receipt.fee : receipt.atlaesShare;
}

/**
 * Client name and address from the case (brief §6). A deregistration
 * surcharge becomes its own line (gross, same VAT rate); the service line
 * carries the rest so the lines add up to the invoiced amount.
 */
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
  const total = invoiceAmount(receipt, cfg);
  const surcharge = Math.min(receipt.deregistrationSurcharge ?? 0, total);
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
    grossAmount: total,
    taxRatePercent: cfg.taxRatePercent,
    ...(surcharge > 0
      ? {
          lines: [
            {
              name: cfg.lineItemName,
              grossAmount: Math.round((total - surcharge) * 100) / 100,
            },
            { name: cfg.deregistrationLineItemName, grossAmount: surcharge },
          ],
        }
      : {}),
  };
}
