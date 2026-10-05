/**
 * E1 end to end against PostgreSQL: statement upload → match → funds
 * receipt + release (payout-flow) + invoice → signed release → payout
 * queue → mark paid → paid out. Uses the default firm seeded by 0010.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { users } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import { payoutReleases } from '../../drizzle/schema/payout';
import {
  fundsReceipts,
  invoices,
  payoutLines,
  statementLines,
} from '../../drizzle/schema/payout-queue';
import { claimPayoutColumns } from './claim-columns';
import { StatementImportService } from '../statement-import';
import {
  InvoicingService,
  setInvoiceProviderForTests,
  type InvoiceProvider,
} from '../invoicing';
import { PayoutQueueService } from '.';
import { DEFAULT_LAW_FIRM_ID } from '../law-firm';

const FIRM = DEFAULT_LAW_FIRM_ID;
const tag = Math.random().toString(36).slice(2, 8).toUpperCase();
const vsnr = (n: number) =>
  `${10 + n}${String(140388 + n).padStart(6, '0')}S${500 + n}`;

let clientUserId = '';
let staffUserId = '';
const claimIds: string[] = [];
let invoiceSeq = 400;

const fakeProvider: InvoiceProvider = {
  name: 'lexoffice',
  async createInvoice() {
    invoiceSeq++;
    return {
      status: 'issued',
      providerId: `lx-${invoiceSeq}`,
      invoiceNumber: `RE-2026-0${invoiceSeq}`,
    };
  },
  async createCancellation() {
    return {
      status: 'issued',
      providerId: 'cn-1',
      invoiceNumber: 'GS-2026-0001',
    };
  },
  async markPaid() {
    return { synced: false, note: 'test' };
  },
};

beforeAll(async () => {
  process.env.ATLAES_IBAN = 'DE02100100100006820101';
  setInvoiceProviderForTests(fakeProvider);
  const [client] = await db
    .insert(users)
    .values({ email: `p3-client-${tag}@example.com`, emailVerified: true })
    .returning();
  const [staff] = await db
    .insert(users)
    .values({
      email: `p3-firm-${tag}@example.com`,
      emailVerified: true,
      role: 'law_firm',
    })
    .returning();
  clientUserId = client.id;
  staffUserId = staff.id;
  for (const [i, [first, last]] of [
    ['Anita', `Sharma${tag}`],
    ['Joseph', `Okafor${tag}`],
  ].entries()) {
    const [c] = await db
      .insert(claimsTable)
      .values({
        userId: clientUserId,
        firstName: first,
        lastName: last,
        vsnr: vsnr(i),
        lawFirmId: FIRM,
        handlingRoute: 'law_firm',
        currentCountry: 'India',
      })
      .returning();
    claimIds.push(c.id);
  }
});

afterAll(async () => {
  setInvoiceProviderForTests(null);
});

const csv = () =>
  Buffer.from(
    [
      'Buchungstag;Valutadatum;Verwendungszweck;Beguenstigter/Zahlungspflichtiger;Betrag',
      `18.09.26;18.09.26;BEITRAGSERSTATTUNG ${vsnr(0).slice(0, 2)} ${vsnr(0).slice(2, 8)} S ${vsnr(0).slice(9)} SHARMA${tag};DRV Bund;3.038,49`,
      `19.09.26;19.09.26;Kontofuehrung;Sparkasse;-12,50`,
      `21.09.26;21.09.26;ERSTATTUNG BEITRAEGE ${tag};DRV Bund;29.601,90`,
    ].join('\n'),
    'utf8'
  );

describe('statement → payout queue (DB)', () => {
  let importId = '';

  it('imports, matches by VSNR + name, records E1 with fee split, release and invoice', async () => {
    const preview = await StatementImportService.preview(
      FIRM,
      'Kontoauszug.csv',
      csv()
    );
    expect(preview.suggestedMap).toMatchObject({
      valueDate: 'Valutadatum',
      amount: 'Betrag',
    });

    const result = await StatementImportService.importStatement({
      firmId: FIRM,
      userId: staffUserId,
      fileName: 'Kontoauszug.csv',
      buf: csv(),
      columnMap: preview.suggestedMap as never,
    });
    importId = result.id;
    expect(result.lines.map((l) => l.status)).toEqual([
      'matched',
      'debit',
      'unmatched',
    ]);
    expect(result.matchedCount).toBe(1);
    expect(result.unmatchedCount).toBe(1);
    expect(result.matchedTotal).toBe(3038.49);
    expect(result.lines[0].matchedCase?.claimId).toBe(claimIds[0]);

    const [receipt] = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.claimId, claimIds[0]));
    expect(receipt).toMatchObject({
      fee: '296.25',
      atlaesShare: '117.75',
      lawFirmFee: '178.50',
      clientAmount: '2742.24',
      valueDate: '2026-09-18',
    });
    expect(receipt.payoutReleaseId).toBeTruthy();

    const [release] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.id, receipt.payoutReleaseId!));
    expect(release).toMatchObject({
      amountReceivedEur: '3038.49',
      atlaesShareEur: '117.75',
      status: 'open',
    });
    expect(release.invoiceNumber).toMatch(/^RE-2026-0\d+$/);

    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.fundsReceiptId, receipt.id));
    expect(inv).toMatchObject({
      status: 'issued',
      grossAmount: '117.75',
      kind: 'invoice',
    });
    const [c] = await db
      .select()
      .from(claimPayoutColumns)
      .where(eq(claimPayoutColumns.id, claimIds[0]));
    expect(c.invoiceNumber).toBe(inv.invoiceNumber);
  });

  it('re-uploading the same statement marks lines as duplicates', async () => {
    const again = await StatementImportService.importStatement({
      firmId: FIRM,
      userId: staffUserId,
      fileName: 'Kontoauszug.csv',
      buf: csv(),
    });
    expect(again.lines.map((l) => l.status)).toEqual([
      'duplicate',
      'debit',
      'duplicate',
    ]);
    const receipts = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.claimId, claimIds[0]));
    expect(receipts).toHaveLength(1);
    const last = await StatementImportService.lastUpload(FIRM);
    expect(last?.columnMap.reference).toBe('Verwendungszweck');
  });

  it('reconciliation: firm suggests, ATLAES assigns → E1 on that case (capped fee)', async () => {
    const recon = await StatementImportService.listReconciliation(FIRM);
    const line = recon.find((l) => l.importId === importId)!;
    expect(line.suggestions).toEqual([]); // firm never sees candidate cases
    await StatementImportService.suggest({
      firmId: FIRM,
      lineId: line.id,
      note: 'Okafor',
      userId: staffUserId,
    });
    await StatementImportService.assign({
      lineId: line.id,
      claimId: claimIds[1],
      adminId: staffUserId,
    });
    const [l] = await db
      .select()
      .from(statementLines)
      .where(eq(statementLines.id, line.id));
    expect(l.status).toBe('assigned');
    const [r] = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.claimId, claimIds[1]));
    expect(r).toMatchObject({
      fee: '2500.00',
      feeCapped: true,
      atlaesShare: '2321.50',
      clientAmount: '27101.90',
    });
    await expect(
      StatementImportService.assign({
        lineId: line.id,
        claimId: claimIds[1],
        adminId: staffUserId,
      })
    ).rejects.toThrow(/Invalid state/);
  });

  it('signed releases enter the queue; mark paid closes the case', async () => {
    const [receipt] = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.claimId, claimIds[0]));
    await db
      .update(payoutReleases)
      .set({
        status: 'signed',
        signedAt: new Date('2026-09-20T10:00:00Z'),
        route: 'A',
        zeS3Key: `claims/${claimIds[0]}/ze.pdf`,
        account: {
          accountHolder: 'Anita Sharma',
          bank: 'Commerzbank',
          country: 'DE',
          currency: 'EUR',
          iban: 'DE89370400440532013000',
        },
      })
      .where(eq(payoutReleases.id, receipt.payoutReleaseId!));
    await db
      .update(claimsTable)
      .set({ payoutReleasedAt: new Date() })
      .where(eq(claimsTable.id, claimIds[0]));

    const view = await PayoutQueueService.listQueue(FIRM);
    const c = view.cases.find((x) => x.claimId === claimIds[0])!;
    expect(c).toMatchObject({
      totalReceived: 3038.49,
      lawFirmFee: 178.5,
      atlaesShare: 117.75,
      sumOk: true,
      hasZe: true,
    });
    expect(c.lines.map((l) => [l.kind, l.amount, l.transferMethod])).toEqual([
      ['atlaes', 117.75, 'SEPA'],
      ['client', 2742.24, 'SEPA'],
    ]);
    expect(c.lines[0].reference).toBe(c.invoiceNumber);
    expect(c.lines[0].account).toBe('DE02100100100006820101');
    expect(c.lines[1].reference).toBe(`Beitragserstattung Anita Sharma${tag}`);
    // Not-yet-signed case (Okafor) stays hidden.
    expect(view.cases.some((x) => x.claimId === claimIds[1])).toBe(false);

    const csvOut = await PayoutQueueService.exportCsv(FIRM);
    expect(csvOut).toContain('2.742,24');

    const before = await PayoutQueueService.paidTodayEur(FIRM);
    const a = await PayoutQueueService.markLinePaid({
      firmId: FIRM,
      lineId: c.lines[0].id,
      actorId: staffUserId,
    });
    expect(a).toMatchObject({ caseClosed: false, invoicePaid: true });
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.fundsReceiptId, receipt.id));
    expect(inv.status).toBe('paid');

    const b = await PayoutQueueService.markLinePaid({
      firmId: FIRM,
      lineId: c.lines[1].id,
      actorId: staffUserId,
    });
    expect(b.caseClosed).toBe(true);
    expect(await PayoutQueueService.paidTodayEur(FIRM)).toBeCloseTo(
      before + 117.75 + 2742.24,
      2
    );
    const [claim] = await db
      .select()
      .from(claimPayoutColumns)
      .where(eq(claimPayoutColumns.id, claimIds[0]));
    expect(claim.paidOutAt).toBeTruthy();
    const after = await PayoutQueueService.listQueue(FIRM);
    expect(after.cases.some((x) => x.claimId === claimIds[0])).toBe(false);
    const lines = await db
      .select()
      .from(payoutLines)
      .where(eq(payoutLines.claimId, claimIds[0]));
    expect(lines.every((l) => l.status === 'paid')).toBe(true);
  });

  it('corrections only by cancellation + new invoice', async () => {
    const [receipt] = await db
      .select()
      .from(fundsReceipts)
      .where(eq(fundsReceipts.claimId, claimIds[1]));
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.fundsReceiptId, receipt.id));
    const { cancellation, reissued } = await InvoicingService.cancel(inv.id, {
      reissue: true,
      actorId: staffUserId,
      reason: 'wrong address',
    });
    expect(cancellation).toMatchObject({
      kind: 'cancellation',
      cancelsInvoiceId: inv.id,
      invoiceNumber: 'GS-2026-0001',
    });
    expect(reissued?.invoiceNumber).not.toBe(inv.invoiceNumber);
    const [orig] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, inv.id));
    expect(orig.status).toBe('cancelled');
    expect(orig.grossAmount).toBe(inv.grossAmount);
    const [release] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.id, receipt.payoutReleaseId!));
    expect(release.invoiceNumber).toBe(reissued?.invoiceNumber);
  });
});
