import { describe, expect, it } from 'vitest';
import {
  buildBavPayoutRecord,
  isValidIsoDate,
  summarizeSettlementList,
} from './payout';

describe('buildBavPayoutRecord — fee split mapping onto the claim', () => {
  it('standard case: fee 9.75 %, law-firm fee deducted, not on the list', () => {
    const r = buildBavPayoutRecord({
      amountEur: 3038.49,
      valueDate: '2026-09-25',
    });
    expect(r.columns).toEqual({
      bavPayoutAmount: '3038.49',
      bavPayoutValueDate: '2026-09-25',
      bavFeeEur: '296.25',
      bavLawFirmFeeDeducted: true,
      bavSettlementList: false,
    });
    expect(r.split.lawFirmFee).toBe(178.5);
    expect(r.split.atlaesShare).toBe(117.75);
    expect(r.split.clientAmount).toBe(2742.24);
  });

  it('capped case: EUR 2,500 incl. VAT', () => {
    const r = buildBavPayoutRecord({
      amountEur: 29601.9,
      valueDate: '2026-01-02',
    });
    expect(r.columns.bavFeeEur).toBe('2500.00');
    expect(r.split.capped).toBe(true);
    expect(r.columns.bavLawFirmFeeDeducted).toBe(true);
    expect(r.columns.bavSettlementList).toBe(false);
  });

  it('small-refund rule: no deduction, goes on the settlement list', () => {
    const r = buildBavPayoutRecord({
      amountEur: 1500,
      valueDate: '2026-12-31',
    });
    expect(r.columns.bavFeeEur).toBe('146.25');
    expect(r.columns.bavLawFirmFeeDeducted).toBe(false);
    expect(r.columns.bavSettlementList).toBe(true);
    expect(r.split.lawFirmFee).toBe(0);
    expect(
      buildBavPayoutRecord({ amountEur: 1830.77, valueDate: '2026-12-31' })
        .columns.bavSettlementList
    ).toBe(true);
    expect(
      buildBavPayoutRecord({ amountEur: 1831, valueDate: '2026-12-31' }).columns
        .bavSettlementList
    ).toBe(false);
  });

  it('rejects bad input', () => {
    expect(() =>
      buildBavPayoutRecord({ amountEur: 0, valueDate: '2026-09-25' })
    ).toThrow(/positive/);
    expect(() =>
      buildBavPayoutRecord({ amountEur: 100, valueDate: '25.09.2026' })
    ).toThrow(/YYYY-MM-DD/);
    expect(() =>
      buildBavPayoutRecord({ amountEur: 100, valueDate: '2026-02-30' })
    ).toThrow(/YYYY-MM-DD/);
    expect(isValidIsoDate('2026-02-28')).toBe(true);
  });
});

describe('summarizeSettlementList', () => {
  it('sums amounts and fees to two decimals', () => {
    const list = summarizeSettlementList(2026, [
      {
        claimId: 'a',
        claimantName: 'A B',
        lawFirmRef: '00001-26',
        bavProviderName: 'Allianz',
        payoutAmount: 1500,
        feeEur: 146.25,
        valueDate: '2026-03-01',
      },
      {
        claimId: 'b',
        claimantName: null,
        lawFirmRef: null,
        bavProviderName: null,
        payoutAmount: 1000.1,
        feeEur: 97.51,
        valueDate: '2026-04-01',
      },
    ]);
    expect(list.year).toBe(2026);
    expect(list.totals).toEqual({
      payoutAmount: 2500.1,
      feeEur: 243.76,
      count: 2,
    });
  });
});
