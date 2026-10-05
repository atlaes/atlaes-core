/**
 * Invoice provider abstraction (platform brief Part 2 §6). Invoicing
 * stays in Lexoffice (Lexware); the platform creates invoices there via
 * the API and stores the number Lexoffice assigns. Corrections only by a
 * cancellation document + a new invoice, never by editing.
 */

export interface InvoiceCustomer {
  name: string;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
}

export interface CreateInvoiceInput {
  customer: InvoiceCustomer;
  /** Voucher date, YYYY-MM-DD. */
  voucherDate: string;
  lineItemName: string;
  lineItemDescription?: string | null;
  /** Gross amount incl. VAT, EUR. */
  grossAmount: number;
  taxRatePercent: number;
}

export interface CreatedInvoice {
  /** 'issued' when the provider assigned a number; 'pending' otherwise. */
  status: 'issued' | 'pending';
  providerId: string | null;
  invoiceNumber: string | null;
  pdf?: Buffer | null;
  error?: string | null;
}

export interface MarkPaidResult {
  /** True when the provider recorded the payment. */
  synced: boolean;
  note?: string;
}

export interface InvoiceProvider {
  readonly name: 'lexoffice' | 'none';
  createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice>;
  /** Cancellation document (credit note) referencing an issued invoice. */
  createCancellation(
    original: { providerId: string; invoiceNumber: string | null },
    input: CreateInvoiceInput
  ): Promise<CreatedInvoice>;
  markPaid(providerId: string, paidOn: string): Promise<MarkPaidResult>;
}
