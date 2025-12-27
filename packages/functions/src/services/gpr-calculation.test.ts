import { describe, it, expect, beforeAll } from 'vitest';
import { GPRCalculationService, GPRCalculationInput } from './gpr-calculation';
import {
  singleJobInput,
  multipleJobsInput,
  publicSectorJobInput,
  jobWithSupplementaryPension,
} from '../test/fixtures';

describe('GPRCalculationService', () => {
  describe('calculate', () => {
    // ============================================================
    // Basic Calculation Tests
    // ============================================================

    it('calculates refund for single private sector job', async () => {
      const result = await GPRCalculationService.calculate(singleJobInput);

      expect(result).toMatchObject({
        isEligible: expect.any(Boolean),
        statePensionRefund: expect.any(Number),
        supplementaryRefund: expect.any(Number),
        totalRefund: expect.any(Number),
        totalMonthsContributed: expect.any(Number),
        details: expect.objectContaining({
          drvEligible: expect.any(Boolean),
          drvReason: expect.any(String),
          supplementaryEligible: expect.any(Boolean),
          supplementaryReason: expect.any(String),
        }),
      });

      // Verify months calculation: 2020-01 to 2022-06 = 30 months
      expect(result.totalMonthsContributed).toBe(30);

      // With 30 months (< 60), should be DRV eligible
      expect(result.details.drvEligible).toBe(true);

      // Private sector should have no supplementary
      expect(result.supplementaryRefund).toBe(0);
    });

    it('calculates refund for multiple jobs', async () => {
      const result = await GPRCalculationService.calculate(multipleJobsInput);

      // Job 1: 2018-03 to 2020-02 = 24 months
      // Job 2: 2020-03 to 2022-12 = 34 months
      // Total: 58 months
      expect(result.totalMonthsContributed).toBe(58);

      // 58 months < 60, so should be eligible
      expect(result.details.drvEligible).toBe(true);
      expect(result.statePensionRefund).toBeGreaterThan(0);
    });

    it('handles public sector correctly with no supplementary specified', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'public',
            state: 'Bayern',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      expect(result.totalMonthsContributed).toBe(30);
      expect(result.supplementaryRefund).toBe(0);
      expect(result.details.supplementaryReason).toContain(
        'No supplementary pension contributions'
      );
    });

    // ============================================================
    // Supplementary Pension Tests
    // ============================================================

    it('calculates supplementary pension refund for VBLklassik', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'public',
            state: 'Baden-Württemberg', // West Germany state
            supplementaryPension: 'VBLklassik',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      expect(result.totalMonthsContributed).toBe(30);
      // VBLklassik is not in VESTED_SCHEMES, so should be eligible
      expect(result.details.supplementaryEligible).toBe(true);
      expect(result.supplementaryRefund).toBeGreaterThan(0);
    });

    it('handles vested supplementary schemes (VBLextra)', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'public',
            state: 'Bayern',
            supplementaryPension: 'VBLextra',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // VBLextra is vested, no refund possible
      expect(result.details.supplementaryEligible).toBe(false);
      expect(result.supplementaryRefund).toBe(0);
      expect(result.details.supplementaryReason).toContain('vested scheme');
    });

    it('handles vested supplementary schemes (ZVK)', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'public',
            state: 'Hesse',
            supplementaryPension: 'ZVK',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      expect(result.details.supplementaryEligible).toBe(false);
      expect(result.supplementaryRefund).toBe(0);
      expect(result.details.supplementaryReason).toContain('vested scheme');
    });

    // ============================================================
    // Vesting Threshold Tests
    // ============================================================

    it('returns no DRV refund when over 60 months', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2015-01',
            endDate: '2020-06',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // 2015-01 to 2020-06 = 66 months
      expect(result.totalMonthsContributed).toBe(66);

      // Over 60 months means vested (unless consecutive rule applies)
      // But 66 consecutive months > 36, so fully vested
      expect(result.details.drvEligible).toBe(false);
      expect(result.statePensionRefund).toBe(0);
      expect(result.details.drvReason).toContain('vested');
    });

    it('handles exactly 60 months (boundary case)', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2018-01',
            endDate: '2022-12',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // 2018-01 to 2022-12 = 60 months exactly
      expect(result.totalMonthsContributed).toBe(60);

      // At exactly 60 months, check the rule: < 60 means eligible
      // 60 is NOT < 60, so depends on consecutive rule
      expect(result.totalMonthsContributed).toBe(60);
    });

    it('handles exactly 59 months (boundary case)', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2018-02',
            endDate: '2022-12',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // 2018-02 to 2022-12 = 59 months
      expect(result.totalMonthsContributed).toBe(59);

      // 59 < 60, so should be eligible
      expect(result.details.drvEligible).toBe(true);
      expect(result.statePensionRefund).toBeGreaterThan(0);
    });

    // ============================================================
    // Salary & Contribution Tests
    // ============================================================

    it('calculates higher refund for higher salary', async () => {
      const lowSalaryInput: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 2000,
            sector: 'private',
          },
        ],
      };

      const highSalaryInput: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 6000,
            sector: 'private',
          },
        ],
      };

      const lowResult = await GPRCalculationService.calculate(lowSalaryInput);
      const highResult = await GPRCalculationService.calculate(highSalaryInput);

      expect(highResult.statePensionRefund).toBeGreaterThan(
        lowResult.statePensionRefund
      );
      // The ratio should be approximately 3:1 (6000/2000)
      expect(highResult.statePensionRefund / lowResult.statePensionRefund).toBeCloseTo(
        3,
        0
      );
    });

    it('returns zero for zero salary', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 0,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      expect(result.statePensionRefund).toBe(0);
      expect(result.totalRefund).toBe(0);
    });

    // ============================================================
    // Date Calculation Tests
    // ============================================================

    it('correctly calculates months for same-year job', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2022-03',
            endDate: '2022-10',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // March to October 2022 = 8 months (inclusive)
      expect(result.totalMonthsContributed).toBe(8);
    });

    it('correctly calculates months for single month job', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2022-06',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // June to June = 1 month
      expect(result.totalMonthsContributed).toBe(1);
    });

    it('correctly calculates months spanning multiple years', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2019-11',
            endDate: '2021-02',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      // Nov 2019 to Feb 2021 = 16 months
      expect(result.totalMonthsContributed).toBe(16);
    });

    // ============================================================
    // Error Handling Tests
    // ============================================================

    it('throws error for end date before start date', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2022-06',
            endDate: '2020-01',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };

      await expect(GPRCalculationService.calculate(input)).rejects.toThrow(
        'Invalid date range'
      );
    });

    it('handles empty jobs array gracefully', async () => {
      const input: GPRCalculationInput = {
        jobs: [],
      };

      const result = await GPRCalculationService.calculate(input);

      expect(result.totalMonthsContributed).toBe(0);
      expect(result.totalRefund).toBe(0);
      expect(result.isEligible).toBe(false);
    });

    // ============================================================
    // West Germany State Tests
    // ============================================================

    it('recognizes West Germany states for supplementary eligibility', async () => {
      const westGermanyInput: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'public',
            state: 'Baden-Württemberg',
            supplementaryPension: 'VBLklassik',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(westGermanyInput);

      // West Germany state with non-vested scheme should be eligible
      expect(result.details.supplementaryEligible).toBe(true);
      expect(result.supplementaryRefund).toBeGreaterThan(0);
    });

    // ============================================================
    // Total Refund Calculation Tests
    // ============================================================

    it('correctly sums DRV and supplementary refunds', async () => {
      const input: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2020-01',
            endDate: '2022-06',
            monthlySalary: 4000,
            sector: 'public',
            state: 'Bavaria', // West Germany
            supplementaryPension: 'VBLklassik',
          },
        ],
      };

      const result = await GPRCalculationService.calculate(input);

      expect(result.totalRefund).toBe(
        result.statePensionRefund + result.supplementaryRefund
      );
    });

    it('sets isEligible based on totalRefund', async () => {
      // Eligible case
      const eligibleResult = await GPRCalculationService.calculate(singleJobInput);
      if (eligibleResult.totalRefund > 0) {
        expect(eligibleResult.isEligible).toBe(true);
      }

      // Ineligible case (over 60 months)
      const ineligibleInput: GPRCalculationInput = {
        jobs: [
          {
            startDate: '2015-01',
            endDate: '2020-06',
            monthlySalary: 4000,
            sector: 'private',
          },
        ],
      };
      const ineligibleResult =
        await GPRCalculationService.calculate(ineligibleInput);
      expect(ineligibleResult.isEligible).toBe(false);
    });
  });
});
