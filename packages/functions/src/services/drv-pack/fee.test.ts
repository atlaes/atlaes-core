import { describe, expect, it } from 'vitest';
import {
  computeFeeSplit,
  conversionRateForAmount,
  deregistrationSurchargeFor,
  smallRefundThreshold,
} from './fee';

describe('computeFeeSplit — check figures from the platform brief', () => {
  it('3,038.49 → fee 296.25 → ATLAES 117.75, client 2,742.24', () => {
    const s = computeFeeSplit(3038.49);
    expect(s.fee).toBe(296.25);
    expect(s.lawFirmFee).toBe(178.5);
    expect(s.atlaesShare).toBe(117.75);
    expect(s.clientAmount).toBe(2742.24);
    expect(s.capped).toBe(false);
    expect(s.smallRefund).toBe(false);
  });

  it('29,601.90 → fee 2,500.00 → ATLAES 2,321.50, client 27,101.90', () => {
    const s = computeFeeSplit(29601.9);
    expect(s.fee).toBe(2500);
    expect(s.capped).toBe(true);
    expect(s.atlaesShare).toBe(2321.5);
    expect(s.clientAmount).toBe(27101.9);
  });

  it('3,305.88 → fee 322.32 → ATLAES 143.82, client 2,983.56', () => {
    const s = computeFeeSplit(3305.88);
    expect(s.fee).toBe(322.32);
    expect(s.atlaesShare).toBe(143.82);
    expect(s.clientAmount).toBe(2983.56);
  });

  it('small-refund rule at and below 1,830.77', () => {
    expect(smallRefundThreshold()).toBe(1830.77);
    const s = computeFeeSplit(1500);
    expect(s.fee).toBe(146.25);
    expect(s.smallRefund).toBe(true);
    expect(s.lawFirmFee).toBe(0);
    expect(s.atlaesShare).toBe(146.25);
    expect(s.clientAmount).toBe(1353.75);
    expect(computeFeeSplit(1830.77).smallRefund).toBe(true);
    expect(computeFeeSplit(1831).smallRefund).toBe(false);
  });

  it('deregistration surcharge: +50 to the fee and ATLAES, −50 to the client', () => {
    const s = computeFeeSplit(3038.49, undefined, {
      deregistrationSurchargeEur: 50,
    });
    expect(s.percentageFee).toBe(296.25);
    expect(s.deregistrationSurcharge).toBe(50);
    expect(s.fee).toBe(346.25);
    expect(s.lawFirmFee).toBe(178.5);
    expect(s.atlaesShare).toBe(167.75);
    expect(s.clientAmount).toBe(2692.24);
    expect(s.atlaesShare + s.lawFirmFee + s.clientAmount).toBeCloseTo(
      s.amountReceived,
      2
    );
    expect(computeFeeSplit(3038.49).deregistrationSurcharge).toBe(0);
  });

  it('deregistration surcharge applies on top of the cap', () => {
    const s = computeFeeSplit(29601.9, undefined, {
      deregistrationSurchargeEur: 50,
    });
    expect(s.capped).toBe(true);
    expect(s.percentageFee).toBe(2500);
    expect(s.fee).toBe(2550);
    expect(s.atlaesShare).toBe(2371.5);
    expect(s.clientAmount).toBe(27051.9);
  });

  it('deregistration surcharge leaves the small-refund rule alone', () => {
    // 1,830.77 → 178.50 percentage fee: still a small refund with +50.
    const s = computeFeeSplit(1830.77, undefined, {
      deregistrationSurchargeEur: 50,
    });
    expect(s.smallRefund).toBe(true);
    expect(s.lawFirmFee).toBe(0);
    expect(s.fee).toBe(228.5);
    expect(s.atlaesShare).toBe(228.5);
    expect(s.clientAmount).toBe(1602.27);
    // Never below zero for the client.
    const tiny = computeFeeSplit(40, undefined, {
      deregistrationSurchargeEur: 50,
    });
    expect(tiny.deregistrationSurcharge).toBe(36.1);
    expect(tiny.clientAmount).toBe(0);
  });

  it('deregistrationSurchargeFor reads the flag and the config', () => {
    expect(deregistrationSurchargeFor(true)).toBe(50);
    expect(deregistrationSurchargeFor(false)).toBe(0);
    expect(deregistrationSurchargeFor(null)).toBe(0);
    expect(
      deregistrationSurchargeFor(true, {
        rate: 0.0975,
        capEur: 2500,
        lawFirmFeeEur: 178.5,
        deregistrationSurchargeEur: 60,
      })
    ).toBe(60);
  });

  it('rejects non-positive amounts', () => {
    expect(() => computeFeeSplit(0)).toThrow();
  });

  it('SummitFX tiers: 1.5 % < 15k, 1.0 % 15k–25k, 0.7 % above', () => {
    expect(conversionRateForAmount(14999.99)).toBe(0.015);
    expect(conversionRateForAmount(15000)).toBe(0.01);
    expect(conversionRateForAmount(25000)).toBe(0.01);
    expect(conversionRateForAmount(27101.9)).toBe(0.007);
  });
});
