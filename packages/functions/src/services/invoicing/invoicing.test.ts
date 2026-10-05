import { describe, expect, it, vi } from 'vitest';
import { computeFeeSplit } from '../drv-pack/fee';
import { invoicingConfig } from './config';
import { buildInvoiceInput, invoiceAmount } from './build';
import { buildLexofficeVoucher, LexofficeInvoiceProvider } from './lexoffice';
import { NoopInvoiceProvider } from './noop';
import { toCountryCode } from './country';

const claim = {
  firstName: 'Anita',
  lastName: 'Sharma',
  currentAddressLine1: '12 MG Road',
  currentAddressLine2: 'Flat 4',
  currentPostalCode: '560001',
  currentCity: 'Bengaluru',
  currentCountry: 'India',
};

describe('invoice amounts (brief Part 2 §1 check figures)', () => {
  const cfg = invoicingConfig({});
  it.each([
    [3038.49, 296.25, 117.75],
    [29601.9, 2500, 2321.5],
    [3305.88, 322.32, 143.82],
  ])('%s → fee %s, ATLAES share %s invoiced', (amount, fee, share) => {
    const split = { ...computeFeeSplit(amount), valueDate: '2026-09-18' };
    expect(split.fee).toBe(fee);
    expect(split.atlaesShare).toBe(share);
    expect(invoiceAmount(split, cfg)).toBe(share);
    expect(invoiceAmount(split, { amountBasis: 'fee' })).toBe(fee);
  });

  it('small refund: ATLAES receives (and is invoiced) the full fee', () => {
    const split = { ...computeFeeSplit(1500), valueDate: '2026-09-18' };
    expect(split.smallRefund).toBe(true);
    expect(split.lawFirmFee).toBe(0);
    expect(invoiceAmount(split, cfg)).toBe(split.fee);
  });

  it('config defaults and overrides', () => {
    expect(invoicingConfig({})).toMatchObject({
      taxRatePercent: 19,
      amountBasis: 'atlaes_share',
      lexofficeApiKey: null,
    });
    expect(
      invoicingConfig({
        INVOICE_TAX_RATE_PERCENT: '0',
        INVOICE_AMOUNT_BASIS: 'fee',
        LEXOFFICE_API_KEY: ' k ',
      })
    ).toMatchObject({
      taxRatePercent: 0,
      amountBasis: 'fee',
      lexofficeApiKey: 'k',
    });
  });
});

describe('invoice input + Lexoffice voucher', () => {
  const split = computeFeeSplit(3038.49);
  const input = buildInvoiceInput(
    claim,
    { ...split, valueDate: '2026-09-18' },
    invoicingConfig({}),
    '2026-09-18'
  );

  it('client name and address from the case', () => {
    expect(input.customer).toEqual({
      name: 'Anita Sharma',
      street: '12 MG Road, Flat 4',
      zip: '560001',
      city: 'Bengaluru',
      countryCode: 'IN',
    });
    expect(input.grossAmount).toBe(117.75);
  });

  it('voucher body (gross, finalize-ready)', () => {
    const v = buildLexofficeVoucher(input);
    expect(v.voucherDate).toBe('2026-09-18T00:00:00.000+01:00');
    expect(v.taxConditions).toEqual({ taxType: 'gross' });
    expect(v.lineItems[0]).toMatchObject({
      type: 'custom',
      quantity: 1,
      unitPrice: {
        currency: 'EUR',
        grossAmount: 117.75,
        taxRatePercentage: 19,
      },
    });
    expect(v.address.countryCode).toBe('IN');
  });

  it('creates, reads the number and the PDF via fetch', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (url.endsWith('/invoices?finalize=true'))
        return new Response(JSON.stringify({ id: 'lx-1' }), { status: 200 });
      if (url.endsWith('/invoices/lx-1'))
        return new Response(JSON.stringify({ voucherNumber: 'RE-2026-0412' }));
      if (url.endsWith('/invoices/lx-1/file'))
        return new Response(new Uint8Array([37, 80, 68, 70]));
      return new Response('nope', { status: 404 });
    });
    const p = new LexofficeInvoiceProvider({
      apiKey: 'secret',
      baseUrl: 'https://lx.test/v1',
      fetchImpl: fetchImpl as never,
    });
    const res = await p.createInvoice(input);
    expect(res).toMatchObject({
      status: 'issued',
      providerId: 'lx-1',
      invoiceNumber: 'RE-2026-0412',
    });
    expect(res.pdf?.toString()).toBe('%PDF');
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://lx.test/v1/invoices?finalize=true',
    });
    const auth = (fetchImpl.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(auth.Authorization).toBe('Bearer secret');
  });

  it('cancellation is a credit note linked to the invoice', async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      if (url.includes('/credit-notes?'))
        return new Response(JSON.stringify({ id: 'cn-1' }));
      if (url.endsWith('/credit-notes/cn-1'))
        return new Response(JSON.stringify({ voucherNumber: 'GS-0001' }));
      return new Response('', { status: 404 });
    };
    const p = new LexofficeInvoiceProvider({
      apiKey: 'k',
      baseUrl: 'https://lx.test/v1',
      fetchImpl: fetchImpl as never,
    });
    const res = await p.createCancellation(
      { providerId: 'lx-1', invoiceNumber: 'RE-1' },
      input
    );
    expect(res).toMatchObject({ status: 'issued', invoiceNumber: 'GS-0001' });
    expect(urls[0]).toBe(
      'https://lx.test/v1/credit-notes?finalize=true&precedingSalesVoucherId=lx-1'
    );
  });

  it('throws with the status on API errors', async () => {
    const p = new LexofficeInvoiceProvider({
      apiKey: 'k',
      fetchImpl: (async () => new Response('bad', { status: 400 })) as never,
    });
    await expect(p.createInvoice(input)).rejects.toThrow(/400/);
  });

  it('markPaid reports whether Lexoffice already shows it paid', async () => {
    const mk = (body: object) =>
      new LexofficeInvoiceProvider({
        apiKey: 'k',
        fetchImpl: (async () => new Response(JSON.stringify(body))) as never,
      });
    expect(
      (
        await mk({ paymentStatus: 'balanced', openAmount: 0 }).markPaid(
          'x',
          '2026-09-21'
        )
      ).synced
    ).toBe(true);
    expect(
      (
        await mk({ paymentStatus: 'openRevenue', openAmount: 117.75 }).markPaid(
          'x',
          '2026-09-21'
        )
      ).synced
    ).toBe(false);
  });

  it('no-op provider records a pending invoice', async () => {
    const res = await new NoopInvoiceProvider().createInvoice(input);
    expect(res).toMatchObject({
      status: 'pending',
      invoiceNumber: null,
      providerId: null,
    });
  });
});

describe('country codes', () => {
  it.each([
    ['India', 'IN'],
    ['Indien', 'IN'],
    ['United States', 'US'],
    ['USA', 'US'],
    ['Vereinigtes Königreich', 'GB'],
    ['de', 'DE'],
    ['Atlantis', null],
    [null, null],
  ])('%s → %s', (name, code) => {
    expect(toCountryCode(name)).toBe(code);
  });
});
