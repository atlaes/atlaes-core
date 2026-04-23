import { describe, it, expect, vi, beforeAll } from 'vitest';
import { VBLCalculationService, VBLCalculationInput } from './vbl-calculation';

// Mock the db module to avoid real database writes for calculation logs
vi.mock('../utils/db', () => ({
  db: {
    insert: () => ({
      values: () => Promise.resolve(),
    }),
  },
}));

// Base eligible input for pre-2018
function makeInput(overrides: Partial<VBLCalculationInput> = {}): VBLCalculationInput {
  return {
    userType: 'insured_person',
    dateOfBirth: '1990-01-15',
    currentAge: 35,
    employmentStart: '2015-01-01',
    employmentEnd: '2017-06-30',
    isWestGermany: true,
    monthsContributed: 30,
    hasLeftPublicSector: true,
    isWorkingInPublicSectorEU: false,
    hasPaidVBLExtra: false,
    hasMovedContributions: false,
    isStageOrchestra: false,
    ...overrides,
  };
}

// Post-2018 eligible input
function makePost2018Input(overrides: Partial<VBLCalculationInput> = {}): VBLCalculationInput {
  return makeInput({
    employmentStart: '2019-01-01',
    employmentEnd: '2021-06-30',
    consecutiveMonthsContributed: 30,
    ...overrides,
  });
}

// Stage/Orchestra eligible input
function makeStageInput(overrides: Partial<VBLCalculationInput> = {}): VBLCalculationInput {
  return makeInput({
    isStageOrchestra: true,
    monthsContributed: 24,
    hasOccupationalDisability: false,
    isMandatoryInsuranceRequired: false,
    employmentStart: '2020-01-01',
    employmentEnd: '2022-01-01',
    ...overrides,
  });
}

describe('VBLCalculationService', () => {
  // ============================================================
  // Input Validation
  // ============================================================
  describe('input validation', () => {
    it('rejects missing user type', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ userType: '' as any })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain('User type is required');
    });

    it('rejects missing date of birth', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ dateOfBirth: '' })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain('Date of birth is required');
    });

    it('rejects invalid date formats', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ dateOfBirth: 'not-a-date' })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain('Invalid date of birth format');
    });

    it('rejects employment start after end', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2022-01-01',
          employmentEnd: '2020-01-01',
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain(
        'Employment start date must be before employment end date'
      );
    });

    it('rejects negative months contributed', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ monthsContributed: -5 })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain('Months contributed cannot be negative');
    });

    it('rejects invalid age values', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ currentAge: 150 })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain('Invalid current age');
    });

    it('requires occupational disability status for stage/orchestra', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          isStageOrchestra: true,
          hasOccupationalDisability: undefined,
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.warnings).toContain(
        'Occupational disability status is required for Stage/Orchestra calculations'
      );
    });
  });

  // ============================================================
  // Pre-2018 Calculation
  // ============================================================
  describe('pre-2018 calculation', () => {
    it('calculates eligible refund correctly', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(makeInput());
      expect(result.isEligible).toBe(true);
      expect(result.calculationMethod).toBe('pre2018');
      // 30 months × €50/month = €1500
      expect(result.baseRefundAmount).toBe(1500);
      expect(result.vatAmount).toBe(0); // VAT_RATE is 0
      expect(result.totalAmount).toBe(1500);
    });

    it('rejects when user has not left public sector', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ hasLeftPublicSector: false })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'User must have left the public sector'
      );
      expect(result.totalAmount).toBe(0);
    });

    it('rejects East Germany employment', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ isWestGermany: false })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Employment must be in West Germany'
      );
    });

    it('rejects 60+ months contribution (boundary)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ monthsContributed: 60 })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Contribution period must be less than 60 months'
      );
    });

    it('accepts exactly 59 months contribution (boundary)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ monthsContributed: 59 })
      );
      expect(result.isEligible).toBe(true);
      expect(result.baseRefundAmount).toBe(2950); // 59 × 50
    });

    it('rejects VBL extra contributions', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ hasPaidVBLExtra: true })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Only VBLklassik contributions allowed (no VBL extra)'
      );
    });

    it('rejects users 69 or older', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ currentAge: 69 })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'User must be younger than 69 years old'
      );
    });

    it('accepts users exactly 68 (boundary)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ currentAge: 68 })
      );
      expect(result.isEligible).toBe(true);
    });

    it('rejects moved contributions', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ hasMovedContributions: true })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Contributions must not be moved to another supplementary insurance'
      );
    });

    it('reports multiple eligibility failures at once', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          hasLeftPublicSector: false,
          isWestGermany: false,
          monthsContributed: 65,
          hasPaidVBLExtra: true,
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ============================================================
  // Post-2018 Calculation
  // ============================================================
  describe('post-2018 calculation', () => {
    it('calculates eligible refund correctly', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makePost2018Input()
      );
      expect(result.isEligible).toBe(true);
      expect(result.calculationMethod).toBe('post2018');
      expect(result.baseRefundAmount).toBe(1500); // 30 × 50
    });

    it('rejects 36+ consecutive months (boundary)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makePost2018Input({ consecutiveMonthsContributed: 36 })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Consecutive contribution period must be less than 36 months'
      );
    });

    it('accepts exactly 35 consecutive months (boundary)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makePost2018Input({ consecutiveMonthsContributed: 35 })
      );
      expect(result.isEligible).toBe(true);
    });

    it('rejects 60+ total months even with low consecutive', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makePost2018Input({
          monthsContributed: 60,
          consecutiveMonthsContributed: 20,
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Total contribution period must be less than 60 months'
      );
    });

    it('includes consecutive period in calculation details', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makePost2018Input({ consecutiveMonthsContributed: 25 })
      );
      expect(result.calculationDetails.consecutivePeriod).toBe(25);
    });

    it('falls back to monthsContributed when consecutiveMonthsContributed not set', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makePost2018Input({ consecutiveMonthsContributed: undefined })
      );
      // Should use monthsContributed (30) as consecutive
      expect(result.calculationDetails.consecutivePeriod).toBe(30);
    });
  });

  // ============================================================
  // Stage/Orchestra Calculation
  // ============================================================
  describe('stage/orchestra calculation', () => {
    it('calculates eligible refund correctly', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput()
      );
      expect(result.isEligible).toBe(true);
      expect(result.calculationMethod).toBe('stage_orchestra');
      expect(result.baseRefundAmount).toBe(1200); // 24 × 50
    });

    it('rejects less than 12 months contribution', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({ monthsContributed: 11 })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Minimum contribution period of 12 months required'
      );
    });

    it('accepts exactly 12 months (boundary)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({ monthsContributed: 12 })
      );
      expect(result.isEligible).toBe(true);
    });

    it('rejects 36+ months for post-2003 employment', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({
          monthsContributed: 36,
          employmentEnd: '2020-06-30',
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Maximum contribution period of 35 months for employments ending after 2003'
      );
    });

    it('allows unlimited contribution period for pre-2003 employment', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({
          monthsContributed: 50,
          employmentStart: '1998-01-01',
          employmentEnd: '2002-06-30',
        })
      );
      // Should not have the max contribution period error
      expect(result.eligibilityReasons).not.toContain(
        'Maximum contribution period of 35 months for employments ending after 2003'
      );
    });

    it('accepts eligibility when mandatory insurance no longer required', async () => {
      // Use a very recent employment end so timeSinceEmploymentEnd < 24
      // This way the "mandatory insurance" condition is the one that fires
      const recentEnd = new Date();
      recentEnd.setMonth(recentEnd.getMonth() - 6);
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({
          isMandatoryInsuranceRequired: false,
          employmentStart: '2023-01-01',
          employmentEnd: recentEnd.toISOString().split('T')[0],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.rulesApplied).toContain(
        'Employment end condition: Mandatory insurance no longer required'
      );
    });

    it('accepts eligibility with occupational disability', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({
          hasOccupationalDisability: true,
          isMandatoryInsuranceRequired: true,
        })
      );
      expect(result.isEligible).toBe(true);
    });
  });

  // ============================================================
  // Period-Based Calculation
  // ============================================================
  describe('period-based calculation', () => {
    it('calculates DRV and VBL separately for a single West period', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentEnd: '2020-12-31',
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2020-12-31',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      // Should have both statePension and vblKlassik amounts
      expect(result.statePension).toBeDefined();
      expect(result.vblKlassik).toBeDefined();
      expect(result.statePension!).toBeGreaterThan(0);
      expect(result.vblKlassik!).toBeGreaterThan(0);
      // DRV rate is 0.093, VBL rate is 0.0181
      // total = statePension + vblKlassik
      expect(result.totalAmount).toBeCloseTo(
        result.statePension! + result.vblKlassik!,
        2
      );
    });

    it('rejects East Germany periods for supplementary refund', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentEnd: '2020-12-31',
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2020-12-31',
              state: 'Saxony',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Only West Germany periods are refundable for supplementary'
      );
    });

    it('caps salary at the yearly westCap', async () => {
      // 2020 westCap is 6900
      const cappedResult = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentEnd: '2020-06-30',
          monthsContributed: 6,
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2020-06-30',
              state: 'Bavaria',
              grossMonthlySalary: 10000, // Over cap
            },
          ],
        })
      );

      const uncappedResult = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentEnd: '2020-06-30',
          monthsContributed: 6,
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2020-06-30',
              state: 'Bavaria',
              grossMonthlySalary: 6900, // At cap
            },
          ],
        })
      );

      // Both should yield same amounts since salary above cap gets capped
      expect(cappedResult.totalAmount).toBeCloseTo(uncappedResult.totalAmount, 2);
    });

    it('uses post2018 method for periods ending after 2018', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentEnd: '2020-12-31',
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2020-12-31',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.calculationMethod).toBe('post2018');
    });

    // ============================================================
    // Regression: client feedback #4, #6, #7 — month-counting bugs
    // The frontend sends end dates as "YYYY-MM-01" (first-of-month),
    // not "YYYY-MM-31". Month counts must use calendar-month arithmetic.
    // ============================================================
    it('client case #7: public sector Jan–Dec 2018, 10k salary, West = €1,411.80', async () => {
      // 2018 westCap=6500, vblklassik=1.81% → 6500 × 12 × 0.0181 = 1411.80
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2018-01-01',
          employmentEnd: '2018-12-01', // first-of-month, as production frontend sends
          currentAge: 40,
          periods: [
            {
              startDate: '2018-01-01',
              endDate: '2018-12-01',
              state: 'Bavaria',
              grossMonthlySalary: 10000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.vblKlassik).toBeCloseTo(1411.8, 2);
    });

    it('client case #6: 1-month period (same start/end month) is valid, not rejected', async () => {
      // Previously validateInput rejected start === end as "start must be before end"
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2020-03-01',
          employmentEnd: '2020-03-01',
          periods: [
            {
              startDate: '2020-03-01',
              endDate: '2020-03-01',
              state: 'Bavaria',
              grossMonthlySalary: 5000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.calculationDetails.contributionPeriod).toBe(1);
      // 2020 westCap=6900 (salary 5000 uncapped) × 1 × 0.0181
      expect(result.vblKlassik).toBeCloseTo(5000 * 1 * 0.0181, 2);
    });

    it('client case #2: historical year 2010 now works (5000€ West, Jan–Dec)', async () => {
      // Previously returned 0 because contributions.json had no entry for 2010.
      // Now: westCap 5500, drv 9.95%, vblklassik 1.81%.
      // 5000 × 12 × 0.0181 = 1086.00 (uncapped, salary < westCap)
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2010-01-01',
          employmentEnd: '2010-12-01',
          currentAge: 45,
          periods: [
            {
              startDate: '2010-01-01',
              endDate: '2010-12-01',
              state: 'Bavaria',
              grossMonthlySalary: 5000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.vblKlassik).toBeCloseTo(1086, 2);
      // DRV portion uses 2010's 9.95% rate, not 9.3%
      expect(result.statePension).toBeCloseTo(5000 * 12 * 0.0995, 2);
    });

    it('client case #4: Stage/Orchestra Jan–Dec 2025, 1k salary = €540', async () => {
      // 2025 vddb=4.5% → min(1000, 8050) × 12 × 0.045 = 540
      const result = await VBLCalculationService.calculateVBLRefund(
        makeStageInput({
          employmentStart: '2025-01-01',
          employmentEnd: '2025-12-01', // first-of-month, as production frontend sends
          currentAge: 40,
          monthsContributed: 12,
          hasOccupationalDisability: false,
          isMandatoryInsuranceRequired: false,
          periods: [
            {
              startDate: '2025-01-01',
              endDate: '2025-12-01',
              state: 'Bavaria',
              grossMonthlySalary: 1000,
              institution: 'vddb',
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.baseRefundAmount).toBeCloseTo(540, 2);
      expect(result.totalAmount).toBeCloseTo(540, 2);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('edge cases', () => {
    it('handles zero months contributed (pre-2018)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ monthsContributed: 0 })
      );
      expect(result.isEligible).toBe(true); // 0 < 60, so eligible
      expect(result.baseRefundAmount).toBe(0); // 0 × 50 = 0
    });

    it('handles single month contribution', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ monthsContributed: 1 })
      );
      expect(result.isEligible).toBe(true);
      expect(result.baseRefundAmount).toBe(50); // 1 × 50
    });

    it('returns correct calculation details', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ monthsContributed: 30 })
      );
      expect(result.calculationDetails.contributionPeriod).toBe(30);
      expect(result.calculationDetails.westGermanyEligible).toBe(true);
      expect(result.calculationDetails.ageAtEmploymentEnd).toBe(35);
      expect(result.calculationDetails.timeSinceEmploymentEnd).toBeGreaterThan(0);
    });

    it('handles employment end exactly on 2018-01-01 as post-2018', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentEnd: '2018-01-01',
          consecutiveMonthsContributed: 20,
        })
      );
      expect(result.calculationMethod).toBe('post2018');
    });

    it('handles employment end on 2017-12-31 as pre-2018', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({ employmentEnd: '2017-12-31' })
      );
      expect(result.calculationMethod).toBe('pre2018');
    });
  });

  // ============================================================
  // Vesting Logic (Pre/Post-2018 Classification)
  // ============================================================
  describe('vesting logic (pre/post-2018 classification)', () => {
    it('mixed-year claim with post-2018 period triggers 36-month consecutive gate', async () => {
      // This exposes the single-date bug: sortedJobs[last by start] can be a
      // pre-2018 job even when another job ends post-2018. The classifier
      // must look at ALL period end dates.
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          // employmentEnd mirrors what the simple service computes: latest by
          // start-date sort. Here the later-starting job ends pre-2018, but
          // an earlier-starting job ends post-2018.
          employmentStart: '2015-01-01',
          employmentEnd: '2017-12-31',
          monthsContributed: 50,
          consecutiveMonthsContributed: 37,
          periods: [
            {
              startDate: '2015-01-01',
              endDate: '2019-01-31', // 37 months, post-2018
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
            {
              startDate: '2016-01-01',
              endDate: '2017-12-31', // 13 months, pre-2018 (ignored by sort-last)
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );

      // Claim has a post-2018 period, consecutive >= 36 → ineligible.
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Consecutive contribution period must be less than 36 months'
      );
    });

    it('pre-2018 65-month claim emits isVested=true', async () => {
      // Karl's case: all jobs pre-2018, aggregate ≥60 months → vested,
      // not refundable. Frontend should render Figma "vested" screen.
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2012-01-01',
          employmentEnd: '2017-05-31',
          monthsContributed: 65,
          consecutiveMonthsContributed: 65,
          periods: [
            {
              startDate: '2012-01-01',
              endDate: '2017-05-31',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );

      expect(result.isEligible).toBe(false);
      expect(result.isVested).toBe(true);
      expect(result.eligibilityReasons).toContain(
        'Total contribution period must be less than 60 months'
      );
    });

    it('post-2018 claim with 50 total months but only 30 consecutive is eligible', async () => {
      // Exposes the line-628 bug: calculateFromPeriods overwrites the
      // caller's consecutiveMonthsContributed with monthsTotal, causing a
      // user with a 30-month stretch plus a separate 20-month stretch to
      // fail the 36-consecutive gate even though they never had 36 in a row.
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2018-01-01',
          employmentEnd: '2023-06-30',
          monthsContributed: 50,
          consecutiveMonthsContributed: 30,
          periods: [
            {
              startDate: '2018-01-01',
              endDate: '2019-08-31', // 20 months
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
            {
              startDate: '2021-01-01',
              endDate: '2023-06-30', // 30 months, last consecutive stretch
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );

      expect(result.isEligible).toBe(true);
      expect(result.isVested).toBeFalsy();
    });

    it('pre-2018 40-month claim is eligible (no 36-month gate)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2014-01-01',
          employmentEnd: '2017-04-30',
          monthsContributed: 40,
          consecutiveMonthsContributed: 40,
          periods: [
            {
              startDate: '2014-01-01',
              endDate: '2017-04-30',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.isVested).toBeFalsy();
    });

    it('post-2018 35-consecutive-month claim is eligible', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2020-01-01',
          employmentEnd: '2022-11-30',
          monthsContributed: 35,
          consecutiveMonthsContributed: 35,
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2022-11-30',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.isVested).toBeFalsy();
    });

    it('post-2018 38-consecutive-month claim is ineligible but not vested', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2020-01-01',
          employmentEnd: '2023-02-28',
          monthsContributed: 38,
          consecutiveMonthsContributed: 38,
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2023-02-28',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.isVested).toBeFalsy();
      expect(result.eligibilityReasons).toContain(
        'Consecutive contribution period must be less than 36 months'
      );
    });

    it('mixed-year claim with total ≥60 emits isVested=true', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2014-01-01',
          employmentEnd: '2021-12-31',
          monthsContributed: 72,
          consecutiveMonthsContributed: 24,
          periods: [
            {
              startDate: '2014-01-01',
              endDate: '2017-12-31', // 48 months pre-2018
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
            {
              startDate: '2020-01-01',
              endDate: '2021-12-31', // 24 months post-2018
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.isVested).toBe(true);
    });
  });
});
