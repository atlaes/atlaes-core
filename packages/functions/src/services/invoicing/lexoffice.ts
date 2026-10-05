/**
 * Lexoffice (Lexware Office) public API client — fetch only, no SDK.
 * Docs: https://developers.lexoffice.io/docs/
 *
 *  - Invoice: POST /v1/invoices?finalize=true → { id }; GET /v1/invoices/{id}
 *    → voucherNumber (the sequential number Lexoffice assigns);
 *    GET /v1/invoices/{id}/file (Accept: application/pdf) → PDF.
 *  - Cancellation: POST /v1/credit-notes?finalize=true&precedingSalesVoucherId={id}
 *    (a credit note linked to the invoice; Lexoffice's cancellation path).
 *  - Payment status: the public API has no endpoint to book a payment;
 *    Lexoffice sets "paid" when the bank transaction is assigned there.
 *    `markPaid` therefore only reads GET /v1/payments/{id} and reports
 *    whether Lexoffice already shows it as paid.
 *
 * Rate limit: 2 requests/second — one retry after 1 s on HTTP 429.
 */

import type {
  CreateInvoiceInput,
  CreatedInvoice,
  InvoiceProvider,
  MarkPaidResult,
} from './types';

export interface LexofficeOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Unit name on the line item ("Stück" in Lexoffice's defaults). */
  unitName?: string;
}

/** Lexoffice wants RFC 3339 with milliseconds and an offset. */
export function lexofficeDate(isoDate: string): string {
  return `${isoDate}T00:00:00.000+01:00`;
}

export function buildLexofficeVoucher(
  input: CreateInvoiceInput,
  unitName = 'Stück'
) {
  const { customer } = input;
  return {
    archived: false,
    voucherDate: lexofficeDate(input.voucherDate),
    address: {
      name: customer.name,
      ...(customer.street ? { street: customer.street } : {}),
      ...(customer.zip ? { zip: customer.zip } : {}),
      ...(customer.city ? { city: customer.city } : {}),
      countryCode: customer.countryCode,
    },
    lineItems: [
      {
        type: 'custom',
        name: input.lineItemName,
        ...(input.lineItemDescription
          ? { description: input.lineItemDescription }
          : {}),
        quantity: 1,
        unitName,
        unitPrice: {
          currency: 'EUR',
          grossAmount: Math.round(input.grossAmount * 100) / 100,
          taxRatePercentage: input.taxRatePercent,
        },
      },
    ],
    totalPrice: { currency: 'EUR' },
    taxConditions: { taxType: 'gross' },
    shippingConditions: {
      shippingDate: lexofficeDate(input.voucherDate),
      shippingType: 'service',
    },
  };
}

export class LexofficeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export class LexofficeInvoiceProvider implements InvoiceProvider {
  readonly name = 'lexoffice' as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: LexofficeOptions) {
    this.baseUrl = (opts.baseUrl ?? 'https://api.lexoffice.io/v1').replace(
      /\/$/,
      ''
    );
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request(
    path: string,
    init: { method?: string; body?: unknown; accept?: string } = {}
  ): Promise<Response> {
    const doFetch = () =>
      this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          Accept: init.accept ?? 'application/json',
          ...(init.body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    let res = await doFetch();
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000));
      res = await doFetch();
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new LexofficeError(
        `Lexoffice ${init.method ?? 'GET'} ${path} failed: ${res.status} ${text.slice(0, 300)}`,
        res.status
      );
    }
    return res;
  }

  private async json<T>(
    path: string,
    init?: { method?: string; body?: unknown }
  ) {
    const res = await this.request(path, init);
    return (await res.json()) as T;
  }

  private async pdf(path: string): Promise<Buffer | null> {
    try {
      const res = await this.request(path, { accept: 'application/pdf' });
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
    const created = await this.json<{ id: string }>('/invoices?finalize=true', {
      method: 'POST',
      body: buildLexofficeVoucher(input, this.opts.unitName),
    });
    const invoice = await this.json<{ voucherNumber?: string }>(
      `/invoices/${created.id}`
    );
    return {
      status: invoice.voucherNumber ? 'issued' : 'pending',
      providerId: created.id,
      invoiceNumber: invoice.voucherNumber ?? null,
      pdf: await this.pdf(`/invoices/${created.id}/file`),
    };
  }

  async createCancellation(
    original: { providerId: string; invoiceNumber: string | null },
    input: CreateInvoiceInput
  ): Promise<CreatedInvoice> {
    const created = await this.json<{ id: string }>(
      `/credit-notes?finalize=true&precedingSalesVoucherId=${encodeURIComponent(original.providerId)}`,
      { method: 'POST', body: buildLexofficeVoucher(input, this.opts.unitName) }
    );
    const note = await this.json<{ voucherNumber?: string }>(
      `/credit-notes/${created.id}`
    );
    return {
      status: note.voucherNumber ? 'issued' : 'pending',
      providerId: created.id,
      invoiceNumber: note.voucherNumber ?? null,
      pdf: await this.pdf(`/credit-notes/${created.id}/file`),
    };
  }

  async markPaid(providerId: string, paidOn: string): Promise<MarkPaidResult> {
    try {
      const p = await this.json<{
        paymentStatus?: string;
        openAmount?: number;
      }>(`/payments/${providerId}`);
      if (p.paymentStatus === 'balanced' || p.openAmount === 0) {
        return { synced: true, note: 'Lexoffice shows the invoice as paid' };
      }
      return {
        synced: false,
        note: `Paid ${paidOn} on the platform; Lexoffice books the payment when the bank transaction is assigned there (status ${p.paymentStatus ?? 'unknown'})`,
      };
    } catch (e) {
      return {
        synced: false,
        note:
          e instanceof Error ? e.message : 'Lexoffice payment lookup failed',
      };
    }
  }
}
