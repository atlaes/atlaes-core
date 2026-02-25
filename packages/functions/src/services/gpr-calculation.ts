import { logger } from '../utils/logger';

// Types for GPR calculation
export interface GPRJobInput {
  startDate: string; // YYYY-MM format
  endDate: string; // YYYY-MM format
  monthlySalary: number;
  sector: string;
  state?: string;
  supplementaryPension?: string;
}

export interface GPRCalculationInput {
  jobs: GPRJobInput[];
}

export interface GPRCalculationResult {
  isEligible: boolean;
  statePensionRefund: number; // DRV amount
  supplementaryRefund: number; // Additional schemes
  totalRefund: number;
  totalMonthsContributed: number;
  details: {
    drvEligible: boolean;
    drvReason: string;
    supplementaryEligible: boolean;
    supplementaryReason: string;
  };
}

// West Germany states for eligibility
const WEST_GERMANY_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin (West)',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Schleswig-Holstein',
];

// Vested (non-refundable) supplementary schemes
const VESTED_SCHEMES = ['VBLextra', 'ZVK'];

export class GPRCalculationService {
  // DRV contribution rate (employee portion) - approximately 9.3%
  private static readonly DRV_CONTRIBUTION_RATE = 0.093;

  // Supplementary pension contribution rate (approximate)
  private static readonly SUPPLEMENTARY_CONTRIBUTION_RATE = 0.045;

  /**
   * Main calculation method
   */
  static async calculate(
    input: GPRCalculationInput
  ): Promise<GPRCalculationResult> {
    try {
      logger.info('Starting GPR calculation', {
        jobCount: input.jobs.length,
      });

      // Calculate total months contributed across all jobs
      let totalMonths = 0;
      let consecutiveMonths = 0;
      let maxConsecutiveMonths = 0;
      let totalDRVContributions = 0;
      let totalSupplementaryContributions = 0;
      let hasWestGermanyJob = false;
      let hasVestedScheme = false;
      let supplementarySchemes: string[] = [];

      // Process each job
      for (const job of input.jobs) {
        const months = this.calculateMonthsBetween(job.startDate, job.endDate);

        // Validate date range
        if (months <= 0) {
          throw new Error(`Invalid date range: end date (${job.endDate}) must be after start date (${job.startDate})`);
        }

        totalMonths += months;

        // Track consecutive months (simplified - assumes jobs are in order)
        if (consecutiveMonths === 0 || consecutiveMonths === maxConsecutiveMonths) {
          consecutiveMonths += months;
        }
        maxConsecutiveMonths = Math.max(maxConsecutiveMonths, consecutiveMonths);

        // Calculate contributions
        const monthlyDRV = job.monthlySalary * this.DRV_CONTRIBUTION_RATE;
        totalDRVContributions += monthlyDRV * months;

        // Supplementary pension (only for certain sectors)
        if (job.sector === 'public' && job.supplementaryPension) {
          const monthlySupplementary =
            job.monthlySalary * this.SUPPLEMENTARY_CONTRIBUTION_RATE;
          totalSupplementaryContributions += monthlySupplementary * months;

          supplementarySchemes.push(job.supplementaryPension);

          if (VESTED_SCHEMES.includes(job.supplementaryPension)) {
            hasVestedScheme = true;
          }
        }

        // Check for West Germany
        if (job.state && WEST_GERMANY_STATES.includes(job.state)) {
          hasWestGermanyJob = true;
        }
      }

      // Determine DRV eligibility
      // Rule: <60 months total OR <36 consecutive months (post-2018)
      const drvEligible = totalMonths < 60 || maxConsecutiveMonths < 36;

      let drvReason: string;
      let statePensionRefund = 0;

      if (drvEligible) {
        if (totalMonths < 60) {
          drvReason = `With ${totalMonths} months of contributions (less than 60), you may be eligible for a DRV refund.`;
          statePensionRefund = Math.round(totalDRVContributions * 0.5); // Simplified: 50% refund
        } else {
          drvReason = `Contributions are vested after 60 months. You have ${totalMonths} months total but only ${maxConsecutiveMonths} consecutive months.`;
          statePensionRefund = 0;
        }
      } else {
        drvReason = `Contributions are vested. After 60 months of total contributions or 36 consecutive months, German law does not allow a DRV refund.`;
        statePensionRefund = 0;
      }

      // Determine supplementary pension eligibility
      let supplementaryEligible = false;
      let supplementaryReason: string;
      let supplementaryRefund = 0;

      if (supplementarySchemes.length === 0) {
        supplementaryReason =
          'No supplementary pension contributions found in your employment history.';
      } else if (hasVestedScheme) {
        supplementaryReason = `${supplementarySchemes.join(', ')} is a vested scheme. Refunds are not possible under German law.`;
      } else {
        // Check VBLklassik eligibility (similar rules to DRV)
        if (totalMonths < 60 && hasWestGermanyJob) {
          supplementaryEligible = true;
          supplementaryRefund = Math.round(totalSupplementaryContributions * 0.8); // Simplified: 80% refund
          supplementaryReason = `Estimated refund from supplementary pension schemes based on your ${totalMonths} months contribution period.`;
        } else {
          supplementaryReason = `Supplementary pension contributions may be vested based on your contribution period of ${totalMonths} months.`;
        }
      }

      const totalRefund = statePensionRefund + supplementaryRefund;
      const isEligible = totalRefund > 0;

      const result: GPRCalculationResult = {
        isEligible,
        statePensionRefund,
        supplementaryRefund,
        totalRefund,
        totalMonthsContributed: totalMonths,
        details: {
          drvEligible,
          drvReason,
          supplementaryEligible,
          supplementaryReason,
        },
      };

      logger.info('GPR calculation completed', {
        isEligible,
        totalRefund,
        totalMonths,
      });

      return result;
    } catch (error) {
      logger.error(
        'GPR calculation error:',
        error as unknown as Record<string, unknown>
      );
      // Re-throw with original message if it's already an Error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to calculate GPR refund');
    }
  }

  /**
   * Calculate months between two dates (YYYY-MM format)
   */
  private static calculateMonthsBetween(
    startDate: string,
    endDate: string
  ): number {
    const [startYear, startMonth] = startDate.split('-').map(Number);
    const [endYear, endMonth] = endDate.split('-').map(Number);

    const months =
      (endYear - startYear) * 12 + (endMonth - startMonth) + 1; // +1 to include both start and end months

    return Math.max(0, months);
  }
}
