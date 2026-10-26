import { logger } from '../../utils/logger';
import type {
  CreateInvoiceInput,
  CreatedInvoice,
  InvoiceProvider,
  MarkPaidResult,
} from './types';

/**
 * Used when LEXOFFICE_API_KEY is not set: nothing is sent anywhere, the
 * invoice is recorded as "pending invoice" and the call is logged so ops
 * can issue it by hand (or re-run once the key is configured).
 */
export class NoopInvoiceProvider implements InvoiceProvider {
  readonly name = 'none' as const;

  async createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
    logger.warn('[Invoicing] LEXOFFICE_API_KEY not set — invoice pending', {
      customer: input.customer.name,
      grossAmount: input.grossAmount,
      voucherDate: input.voucherDate,
    });
    return {
      status: 'pending',
      providerId: null,
      invoiceNumber: null,
      error: 'No invoice provider configured (LEXOFFICE_API_KEY unset)',
    };
  }

  async createCancellation(
    original: { providerId: string; invoiceNumber: string | null },
    input: CreateInvoiceInput
  ): Promise<CreatedInvoice> {
    logger.warn(
      '[Invoicing] LEXOFFICE_API_KEY not set — cancellation pending',
      {
        invoiceNumber: original.invoiceNumber,
        grossAmount: input.grossAmount,
      }
    );
    return {
      status: 'pending',
      providerId: null,
      invoiceNumber: null,
      error: 'No invoice provider configured (LEXOFFICE_API_KEY unset)',
    };
  }

  async markPaid(providerId: string, paidOn: string): Promise<MarkPaidResult> {
    logger.info('[Invoicing] invoice paid (no provider configured)', {
      providerId,
      paidOn,
    });
    return { synced: false, note: 'No invoice provider configured' };
  }
}
