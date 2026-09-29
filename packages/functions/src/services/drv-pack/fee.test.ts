import { describe, expect, it } from 'vitest';
import {
  computeFeeSplit,
  conversionRateForAmount,
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
