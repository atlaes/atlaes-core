import { describe, expect, it } from 'vitest';
import { computeFeeSplit } from '../drv-pack/fee';
import {
  buildPayoutLines,
  exportCsv,
  isAmountMismatch,
  MISSING,
  sumCheck,
  type ReleaseFigures,
} from './lines';

const atlaes = {
  holder: 'ATLAES GmbH',
  iban: 'DE02 1001 0010 0006 8201 01',
  bic: 'PBNKDEFF',
  bank: 'Postbank',
};

function figures(
  amount: number,
  extra: Partial<ReleaseFigures> = {}
): ReleaseFigures {
  const s = computeFeeSplit(amount);
  return {
    amountReceived: s.amountReceived,
    fee: s.fee,
    feeCapped: s.capped,
    smallRefund: s.smallRefund,
    lawFirmFee: s.lawFirmFee,
    atlaesShare: s.atlaesShare,
    clientAmount: s.clientAmount,
    invoiceNumber: 'RE-2026-0412',
    route: 'A',
    account: {
      accountHolder: 'Joseph Okafor',
      bank: 'Commerzbank',
      country: 'DE',
      currency: 'EUR',
      iban: 'DE89 3704 0044 0532 0130 00',
      bic: 'COBADEFFXXX',
    },
    ...extra,
  };
}

describe('payout lines (brief §5)', () => {
  it('route A: ATLAES share to the ATLAES IBAN with the invoice number; client remainder by SEPA', () => {
    const lines = buildPayoutLines({
      clientName: 'Joseph Okafor',
      figures: figures(29601.9),
      atlaes,
      feeCapEur: 2500,
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      kind: 'atlaes',
      recipient: 'ATLAES GmbH',
      amount: 2321.5,
      account: 'DE02 1001 0010 0006 8201 01',
      transferMethod: 'SEPA',
      reference: 'RE-2026-0412',
      remarks: 'Fee capped at €2,500',
    });
    expect(lines[1]).toMatchObject({
      kind: 'client',
      recipient: 'Joseph Okafor',
      amount: 27101.9,
      account: 'DE89 3704 0044 0532 0130 00',
      bank: 'Commerzbank',
      transferMethod: 'SEPA',
      reference: 'Beitragserstattung Joseph Okafor',
      remarks: 'EUR account — route 1',
    });
  });

  it('route B: provider collection account from the register', () => {
    const lines = buildPayoutLines({
      clientName: 'Anita Sharma',
      figures: figures(3038.49, {
        route: 'B',
        account: {
          accountHolder: 'Anita Sharma',
          bank: 'HDFC',
          country: 'IN',
          currency: 'INR',
          accountNumber: '123',
          routingLabel: 'IFSC',
          routingValue: 'HDFC0001',
        },
      }),
      atlaes,
      feeCapEur: 2500,
      collectionAccount: {
        holder: 'SummitFX collection account (TransferMate)',
        iban: 'IE29 AIBK 9311 5212 3456 78',
        bic: 'AIBKIE2D',
        reference: 'SFX-123',
      },
    });
    expect(lines[0].amount).toBe(117.75);
    expect(lines[1]).toMatchObject({
      recipient: 'SummitFX collection account (TransferMate)',
      amount: 2742.24,
      account: 'IE29 AIBK 9311 5212 3456 78',
      transferMethod: 'SEPA',
      reference: 'SFX-123',
      remarks: 'Route 2 — conversion to INR',
    });
  });

  it('route B without a register entry is flagged, not guessed', () => {
    const lines = buildPayoutLines({
      clientName: 'Anita Sharma',
      figures: figures(3038.49, {
        route: 'B',
        account: {
          accountHolder: 'A',
          bank: 'B',
          country: 'IN',
          currency: 'INR',
        },
      }),
      atlaes: { ...atlaes, iban: null },
      feeCapEur: 2500,
    });
    expect(lines[0].account).toBe(MISSING.atlaesIban);
    expect(lines[1].account).toBe(MISSING.collection);
    expect(lines[1].reference).toBe('Beitragserstattung Anita Sharma');
  });

  it('route C: client account by SWIFT', () => {
    const lines = buildPayoutLines({
      clientName: 'Mei Chen',
      figures: figures(3305.88, {
        route: 'C',
        invoiceNumber: null,
        account: {
          accountHolder: 'Mei Chen',
          bank: 'JPMorgan Chase',
          country: 'US',
          currency: 'USD',
          accountNumber: '4471 0092 8831',
          bic: 'CHASUS33',
          routingLabel: 'Routing number',
          routingValue: '021000021',
        },
      }),
      atlaes,
      feeCapEur: 2500,
    });
    expect(lines[0]).toMatchObject({
      amount: 143.82,
      reference: MISSING.invoice,
    });
    expect(lines[1]).toMatchObject({
      amount: 2983.56,
      account: '4471 0092 8831',
      bic: 'CHASUS33',
      transferMethod: 'SWIFT',
      remarks: 'USD account — route 3 (SWIFT) · Routing number: 021000021',
    });
  });

  it('small refund: no law-firm fee, full fee to ATLAES, settlement remark', () => {
    const f = figures(1500);
    const lines = buildPayoutLines({
      clientName: 'X Y',
      figures: f,
      atlaes,
      feeCapEur: 2500,
    });
    expect(f.lawFirmFee).toBe(0);
    expect(lines[0].amount).toBe(f.fee);
    expect(lines[0].remarks).toBe('Small refund — annual settlement');
    expect(lines[0].amount + lines[1].amount).toBeCloseTo(1500, 2);
  });

  it('sum check (law-firm fee + ATLAES share + client = received)', () => {
    for (const a of [3038.49, 29601.9, 3305.88, 1500, 1830.77, 1830.78]) {
      expect(sumCheck(figures(a))).toBe(true);
    }
    expect(
      sumCheck({
        amountReceived: 100,
        lawFirmFee: 0,
        atlaesShare: 10,
        clientAmount: 89,
      })
    ).toBe(false);
  });

  it('amount mismatch flag', () => {
    expect(isAmountMismatch(null, 3038.49)).toBe(false);
    expect(isAmountMismatch(3038.49, 3038.49)).toBe(false);
    expect(isAmountMismatch(3038.5, 3038.49)).toBe(true);
  });

  it('CSV export: semicolons, German decimals, BOM, quoting', () => {
    const csv = exportCsv([
      {
        clientName: 'Okafor; Joseph',
        zeSigned: true,
        valueDate: '2026-09-19',
        totalReceived: 29601.9,
        lawFirmFee: 178.5,
        atlaesShare: 2321.5,
        sumOk: true,
        recipient: 'ATLAES GmbH',
        amount: 2321.5,
        account: 'DE02',
        bic: null,
        bank: null,
        transferMethod: 'SEPA',
        reference: 'RE-2026-0415',
        status: 'open',
        remarks: null,
      },
    ]);
    expect(csv.startsWith('﻿Client name;ZE;Value date')).toBe(true);
    expect(csv).toContain(
      '"Okafor; Joseph";✓;2026-09-19;29.601,90;178,50;2.321,50;✓;ATLAES GmbH;2.321,50;DE02;;;SEPA;RE-2026-0415;open;'
    );
  });
});
