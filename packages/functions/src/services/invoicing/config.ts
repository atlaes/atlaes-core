/**
 * Invoicing configuration (platform brief Part 2 §6). Environment values;
 * defaults are placeholders to confirm with the client:
 *
 *  - INVOICE_TAX_RATE_PERCENT: VAT rule (default 19; amounts are gross,
 *    "incl. VAT" per §1).
 *  - INVOICE_AMOUNT_BASIS: 'atlaes_share' (default — the amount ATLAES
 *    receives on payout line 1, paid against the invoice number; the
 *    law-firm fee is invoiced by the firm itself) or 'fee' (full fee).
 *  - INVOICE_LINE_ITEM_NAME: line text on the Lexoffice invoice.
 *  - LEXOFFICE_API_KEY / LEXOFFICE_API_BASE_URL.
 */

export type InvoiceAmountBasis = 'atlaes_share' | 'fee';

export interface InvoicingConfig {
  taxRatePercent: number;
  amountBasis: InvoiceAmountBasis;
  lineItemName: string;
  lexofficeApiKey: string | null;
  lexofficeBaseUrl: string;
}

export function invoicingConfig(
  envVars: Record<string, string | undefined> = process.env
): InvoicingConfig {
  const rate = Number(envVars.INVOICE_TAX_RATE_PERCENT);
  return {
    taxRatePercent:
      envVars.INVOICE_TAX_RATE_PERCENT && Number.isFinite(rate) && rate >= 0
        ? rate
        : 19,
    amountBasis:
      envVars.INVOICE_AMOUNT_BASIS === 'fee' ? 'fee' : 'atlaes_share',
    // PLACEHOLDER line text until the client confirms the invoice wording.
    lineItemName: envVars.INVOICE_LINE_ITEM_NAME?.trim() || 'Servicegebühr',
    lexofficeApiKey: envVars.LEXOFFICE_API_KEY?.trim() || null,
    lexofficeBaseUrl:
      envVars.LEXOFFICE_API_BASE_URL?.trim() || 'https://api.lexoffice.io/v1',
  };
}
