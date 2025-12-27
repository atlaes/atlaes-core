import { logger } from '../utils/logger';
import { db } from '../utils/db';
import { calculationLogs } from '../drizzle/schema/vbl';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Types for VBL calculation
export interface VBLCalculationInput {
  // User information
  userType: 'insured_person' | 'widow' | 'orphan';
  dateOfBirth: string; // YYYY-MM-DD format
  currentAge: number;

  // Employment information
  employmentStart: string; // YYYY-MM-DD format
  employmentEnd: string; // YYYY-MM-DD format
  isWestGermany: boolean;
  monthsContributed: number;
  consecutiveMonthsContributed?: number; // For post-2018 calculations
  vblInsuranceNumber?: string;

  // Additional information
  hasLeftPublicSector: boolean;
  isWorkingInPublicSectorEU: boolean; // EU/EEA/UK/Switzerland
  hasPaidVBLExtra: boolean; // Only VBLklassik contributions
  hasMovedContributions: boolean;

  // Stage/Orchestra specific
  isStageOrchestra: boolean;
  hasOccupationalDisability?: boolean;
  disabilityDate?: string; // YYYY-MM-DD format
  isMandatoryInsuranceRequired?: boolean;
  retirementAge?: number;

  // New period-based input (preferred)
  periods?: Array<{
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    state: string; // German state name
    grossMonthlySalary: number;
    publicSector?: boolean; // whether this period is public sector
    institution?: 'drv' | 'vblklassik' | 'vddb' | 'vddko'; // optional hint
  }>;
}

export interface VBLCalculationResult {
  isEligible: boolean;
  eligibilityReasons: string[];
  calculationMethod: 'pre2018' | 'post2018' | 'stage_orchestra';
  baseRefundAmount: number;
  vatAmount: number;
  totalAmount: number;
  // Separate amounts for each pension type
  statePension?: number; // DRV (Deutsche Rentenversicherung) refund
  vblKlassik?: number; // VBL supplementary pension refund
  calculationDetails: {
    contributionPeriod: number;
    consecutivePeriod?: number;
    ageAtEmploymentEnd: number;
    westGermanyEligible: boolean;
    timeSinceEmploymentEnd: number; // in months
  };
  rulesApplied: string[];
  warnings: string[];
}

export class VBLCalculationService {
  // For supplementary refunds we do NOT add VAT; set to 0 for new model
  private static readonly VAT_RATE = 0;
  private static readonly RULES_VERSION = '1.0.0';

  // West Germany states (for reference)
  // private static readonly WEST_GERMANY_STATES = [
  //   'Baden-Württemberg', 'Bavaria', 'West Berlin', 'Bremen',
  //   'Hamburg', 'Hesse', 'Lower Saxony', 'North Rhine-Westphalia',
  //   'Rhineland-Palatinate', 'Saarland', 'Schleswig-Holstein'
  // ];

  /**
   * Main calculation method that determines which calculation to use
   */
  static async calculateVBLRefund(
    input: VBLCalculationInput
  ): Promise<VBLCalculationResult> {
    try {
      logger.info('Starting VBL calculation', {
        input: this.sanitizeInput(input) as Record<string, unknown>,
      });

      // Validate input
      const validationResult = this.validateInput(input);
      if (!validationResult.isValid) {
        return {
          isEligible: false,
          eligibilityReasons: validationResult.errors,
          calculationMethod: 'pre2018',
          baseRefundAmount: 0,
          vatAmount: 0,
          totalAmount: 0,
          calculationDetails: this.getEmptyCalculationDetails(),
          rulesApplied: [],
          warnings: validationResult.errors,
        };
      }

      let result: VBLCalculationResult;

      // Determine calculation method
      if (input.isStageOrchestra) {
        result = this.calculateStageOrchestraRefund(input);
      } else {
        // Public Service Sector calculation
        const employmentEndDate = new Date(input.employmentEnd);
        const isPost2018 = employmentEndDate >= new Date('2018-01-01');

        // If period-based input is present, use new per-year capped model
        if (input.periods && input.periods.length > 0) {
          result = this.calculateFromPeriods(input);
        } else {
          if (isPost2018) {
            result = this.calculatePost2018Refund(input);
          } else {
            result = this.calculatePre2018Refund(input);
          }
        }
      }

      // Log calculation
      await this.logCalculation(input, result);

      logger.info('VBL calculation completed', {
        isEligible: result.isEligible,
        totalAmount: result.totalAmount,
      });

      return result;
    } catch (error) {
      logger.error(
        'VBL calculation error:',
        error as unknown as Record<string, unknown>
      );
      throw new Error('Failed to calculate VBL refund');
    }
  }

  /**
   * Calculate refund for employments ending before 1 Jan 2018
   */
  private static calculatePre2018Refund(
    input: VBLCalculationInput
  ): VBLCalculationResult {
    const rulesApplied: string[] = [];
    const warnings: string[] = [];
    const eligibilityReasons: string[] = [];

    // Rule 1: User left the public sector
    if (!input.hasLeftPublicSector) {
      eligibilityReasons.push('User must have left the public sector');
    } else {
      rulesApplied.push('User left public sector');
    }

    // Rule 2: Employment region is West Germany
    if (!input.isWestGermany) {
      eligibilityReasons.push('Employment must be in West Germany');
    } else {
      rulesApplied.push('Employment in West Germany');
    }

    // Rule 3: Contribution period less than 60 months
    if (input.monthsContributed >= 60) {
      eligibilityReasons.push(
        'Contribution period must be less than 60 months'
      );
    } else {
      rulesApplied.push('Contribution period less than 60 months');
    }

    // Rule 4: Only VBLklassik contributions (no VBL extra)
    if (input.hasPaidVBLExtra) {
      eligibilityReasons.push(
        'Only VBLklassik contributions allowed (no VBL extra)'
      );
    } else {
      rulesApplied.push('Only VBLklassik contributions');
    }

    // Rule 5: User younger than 69 years old
    if (input.currentAge >= 69) {
      eligibilityReasons.push('User must be younger than 69 years old');
    } else {
      rulesApplied.push('User younger than 69 years old');
    }

    // Rule 6: Contributions not moved to another supplementary insurance
    if (input.hasMovedContributions) {
      eligibilityReasons.push(
        'Contributions must not be moved to another supplementary insurance'
      );
    } else {
      rulesApplied.push('Contributions not moved to another insurance');
    }

    const isEligible = eligibilityReasons.length === 0;

    // Legacy path (no periods): keep existing behavior but with VAT_RATE=0
    const baseRefundAmount = isEligible
      ? this.calculateBaseRefundAmount(input.monthsContributed)
      : 0;
    const vatAmount = baseRefundAmount * this.VAT_RATE;
    const totalAmount = baseRefundAmount + vatAmount;

    return {
      isEligible,
      eligibilityReasons,
      calculationMethod: 'pre2018',
      baseRefundAmount,
      vatAmount,
      totalAmount,
      calculationDetails: {
        contributionPeriod: input.monthsContributed,
        ageAtEmploymentEnd: input.currentAge,
        westGermanyEligible: input.isWestGermany,
        timeSinceEmploymentEnd: this.calculateMonthsSinceEmploymentEnd(
          input.employmentEnd
        ),
      },
      rulesApplied,
      warnings,
    };
  }

  /**
   * Calculate refund for employments ending after 1 Jan 2018
   */
  private static calculatePost2018Refund(
    input: VBLCalculationInput
  ): VBLCalculationResult {
    const rulesApplied: string[] = [];
    const warnings: string[] = [];
    const eligibilityReasons: string[] = [];

    // Rule 1: User left the public sector
    if (!input.hasLeftPublicSector) {
      eligibilityReasons.push('User must have left the public sector');
    } else {
      rulesApplied.push('User left public sector');
    }

    // Rule 2: Employment region is West Germany
    if (!input.isWestGermany) {
      eligibilityReasons.push('Employment must be in West Germany');
    } else {
      rulesApplied.push('Employment in West Germany');
    }

    // Rule 3: Consecutive contribution less than 36 months AND total contribution less than 60 months
    const consecutiveMonths =
      input.consecutiveMonthsContributed || input.monthsContributed;

    if (consecutiveMonths >= 36) {
      eligibilityReasons.push(
        'Consecutive contribution period must be less than 36 months'
      );
    } else {
      rulesApplied.push('Consecutive contribution period less than 36 months');
    }

    if (input.monthsContributed >= 60) {
      eligibilityReasons.push(
        'Total contribution period must be less than 60 months'
      );
    } else {
      rulesApplied.push('Total contribution period less than 60 months');
    }

    // Rule 4: Only VBLklassik contributions (no VBL extra)
    if (input.hasPaidVBLExtra) {
      eligibilityReasons.push(
        'Only VBLklassik contributions allowed (no VBL extra)'
      );
    } else {
      rulesApplied.push('Only VBLklassik contributions');
    }

    // Rule 5: User younger than 69 years old
    if (input.currentAge >= 69) {
      eligibilityReasons.push('User must be younger than 69 years old');
    } else {
      rulesApplied.push('User younger than 69 years old');
    }

    // Rule 6: Contributions not moved to another supplementary insurance
    if (input.hasMovedContributions) {
      eligibilityReasons.push(
        'Contributions must not be moved to another supplementary insurance'
      );
    } else {
      rulesApplied.push('Contributions not moved to another insurance');
    }

    const isEligible = eligibilityReasons.length === 0;

    // Legacy path (no periods): keep existing behavior but with VAT_RATE=0
    const baseRefundAmount = isEligible
      ? this.calculateBaseRefundAmount(input.monthsContributed)
      : 0;
    const vatAmount = baseRefundAmount * this.VAT_RATE;
    const totalAmount = baseRefundAmount + vatAmount;

    return {
      isEligible,
      eligibilityReasons,
      calculationMethod: 'post2018',
      baseRefundAmount,
      vatAmount,
      totalAmount,
      calculationDetails: {
        contributionPeriod: input.monthsContributed,
        consecutivePeriod: consecutiveMonths,
        ageAtEmploymentEnd: input.currentAge,
        westGermanyEligible: input.isWestGermany,
        timeSinceEmploymentEnd: this.calculateMonthsSinceEmploymentEnd(
          input.employmentEnd
        ),
      },
      rulesApplied,
      warnings,
    };
  }

  /**
   * Calculate refund for Stage/Orchestra (VddB/VddKO)
   */
  private static calculateStageOrchestraRefund(
    input: VBLCalculationInput
  ): VBLCalculationResult {
    const rulesApplied: string[] = [];
    const warnings: string[] = [];
    const eligibilityReasons: string[] = [];

    // Rule 1: Minimum contribution period of 12 months
    if (input.monthsContributed < 12) {
      eligibilityReasons.push(
        'Minimum contribution period of 12 months required'
      );
    } else {
      rulesApplied.push('Minimum 12 months contribution period');
    }

    // Rule 2: Maximum contribution period
    const employmentEndDate = new Date(input.employmentEnd);
    const isPre2003 = employmentEndDate < new Date('2003-01-01');

    if (!isPre2003 && input.monthsContributed >= 36) {
      eligibilityReasons.push(
        'Maximum contribution period of 36 months for employments ending after 2003'
      );
    } else {
      rulesApplied.push(
        isPre2003
          ? 'Unlimited contribution period (pre-2003)'
          : 'Maximum 36 months contribution period'
      );
    }

    // Rule 3: User left employment with specific conditions
    const timeSinceEmploymentEnd = this.calculateMonthsSinceEmploymentEnd(
      input.employmentEnd
    );
    const hasOccupationalDisability = input.hasOccupationalDisability || false;
    const isMandatoryInsuranceRequired =
      input.isMandatoryInsuranceRequired || false;
    const retirementAge = input.retirementAge || 67;
    const monthsToRetirement = (retirementAge - input.currentAge) * 12;

    let leftEmploymentConditionMet = false;
    let conditionReason = '';

    if (timeSinceEmploymentEnd >= 24) {
      leftEmploymentConditionMet = true;
      conditionReason = '24 months have passed since employment end';
    } else if (hasOccupationalDisability) {
      leftEmploymentConditionMet = true;
      conditionReason = 'User has occupational disability';
    } else if (!isMandatoryInsuranceRequired) {
      leftEmploymentConditionMet = true;
      conditionReason = 'Mandatory insurance no longer required';
    } else if (monthsToRetirement < 36) {
      leftEmploymentConditionMet = true;
      conditionReason = 'User too old to complete 36 months before retirement';
    } else if (hasOccupationalDisability && timeSinceEmploymentEnd < 24) {
      leftEmploymentConditionMet = true;
      conditionReason = 'Occupational disability less than 2 years ago';
    }

    if (!leftEmploymentConditionMet) {
      eligibilityReasons.push(
        'User must meet one of the employment end conditions'
      );
    } else {
      rulesApplied.push(`Employment end condition: ${conditionReason}`);
    }

    const isEligible = eligibilityReasons.length === 0;

    // Legacy path (no periods): keep existing behavior but with VAT_RATE=0
    const baseRefundAmount = isEligible
      ? this.calculateBaseRefundAmount(input.monthsContributed)
      : 0;
    const vatAmount = baseRefundAmount * this.VAT_RATE;
    const totalAmount = baseRefundAmount + vatAmount;

    return {
      isEligible,
      eligibilityReasons,
      calculationMethod: 'stage_orchestra',
      baseRefundAmount,
      vatAmount,
      totalAmount,
      calculationDetails: {
        contributionPeriod: input.monthsContributed,
        ageAtEmploymentEnd: input.currentAge,
        westGermanyEligible: input.isWestGermany,
        timeSinceEmploymentEnd,
      },
      rulesApplied,
      warnings,
    };
  }

  /**
   * Calculate base refund amount based on contribution period
   * This is a simplified calculation - in reality, this would be based on
   * actual contribution amounts and VBL's specific calculation formulas
   */
  private static calculateBaseRefundAmount(monthsContributed: number): number {
    // Legacy fallback: treat each month as a nominal unit; no interest/VAT
    const baseAmountPerMonth = 50;
    const baseAmount = monthsContributed * baseAmountPerMonth;
    return Math.round(baseAmount * 100) / 100;
  }

  /**
   * Calculate months since employment end
   */
  private static calculateMonthsSinceEmploymentEnd(
    employmentEnd: string
  ): number {
    const endDate = new Date(employmentEnd);
    const now = new Date();
    const diffTime = now.getTime() - endDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
  }

  /**
   * Validate input data
   */
  private static validateInput(input: VBLCalculationInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!input.userType) errors.push('User type is required');
    if (!input.dateOfBirth) errors.push('Date of birth is required');
    if (!input.employmentStart)
      errors.push('Employment start date is required');
    if (!input.employmentEnd) errors.push('Employment end date is required');

    // Date validation
    if (input.dateOfBirth && !this.isValidDate(input.dateOfBirth)) {
      errors.push('Invalid date of birth format');
    }
    if (input.employmentStart && !this.isValidDate(input.employmentStart)) {
      errors.push('Invalid employment start date format');
    }
    if (input.employmentEnd && !this.isValidDate(input.employmentEnd)) {
      errors.push('Invalid employment end date format');
    }

    // Date logic validation
    if (input.employmentStart && input.employmentEnd) {
      const startDate = new Date(input.employmentStart);
      const endDate = new Date(input.employmentEnd);
      if (startDate >= endDate) {
        errors.push('Employment start date must be before employment end date');
      }
    }

    // Age validation
    if (input.currentAge < 0 || input.currentAge > 120) {
      errors.push('Invalid current age');
    }

    // Contribution period validation
    if (input.monthsContributed < 0) {
      errors.push('Months contributed cannot be negative');
    }

    // Stage/Orchestra specific validation
    if (input.isStageOrchestra) {
      if (input.hasOccupationalDisability === undefined) {
        errors.push(
          'Occupational disability status is required for Stage/Orchestra calculations'
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if date string is valid
   */
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Get empty calculation details
   */
  private static getEmptyCalculationDetails() {
    return {
      contributionPeriod: 0,
      ageAtEmploymentEnd: 0,
      westGermanyEligible: false,
      timeSinceEmploymentEnd: 0,
    };
  }

  /**
   * New: Calculate from periods using per-year caps and rates (no interest/VAT)
   */
  private static calculateFromPeriods(
    input: VBLCalculationInput
  ): VBLCalculationResult {
    const rulesApplied: string[] = [];
    const eligibilityReasons: string[] = [];
    const warnings: string[] = [];

    const { periods = [] } = input;

    // Load contribution caps/rates
    // In bundled code, __dirname is dist/, so data is at dist/data/
    const dataPath = path.join(__dirname, 'data', 'contributions.json');
    let tables: any;
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      tables = JSON.parse(raw);
    } catch (e) {
      logger.error('Failed to load contributions table', e as any);
      logger.error(`Attempted path: ${dataPath}`, {} as any);
      throw new Error('Configuration error');
    }

    const westStates: string[] = tables.states?.WEST ?? [];
    const years: Record<string, any> = tables.years ?? {};

    // Derive months from periods
    const monthsTotal = periods.reduce(
      (acc, p) => acc + this.monthsBetween(p.startDate, p.endDate),
      0
    );
    const consecutiveMonths = monthsTotal; // Placeholder: real consecutive detection can be added later

    // Eligibility checks (supplementary flavor for this route)
    if (!input.hasLeftPublicSector) {
      eligibilityReasons.push('User must have left the public sector');
    } else {
      rulesApplied.push('User left public sector');
    }

    // West-only check for supplementary
    const hasOnlyWest = periods.every((p) => westStates.includes(p.state));
    if (!hasOnlyWest) {
      eligibilityReasons.push(
        'Only West Germany periods are refundable for supplementary'
      );
    } else {
      rulesApplied.push('All periods in West Germany');
    }

    // Pre/Post 2018 logic based on employmentEnd
    const employmentEndDate = new Date(input.employmentEnd);
    const isPost2018 = employmentEndDate >= new Date('2018-01-01');
    if (isPost2018) {
      if (consecutiveMonths >= 36) {
        eligibilityReasons.push(
          'Consecutive contribution period must be less than 36 months'
        );
      } else {
        rulesApplied.push(
          'Consecutive contribution period less than 36 months'
        );
      }
    }
    if (monthsTotal >= 60) {
      eligibilityReasons.push(
        'Total contribution period must be less than 60 months'
      );
    } else {
      rulesApplied.push('Total contribution period less than 60 months');
    }
    if (input.hasPaidVBLExtra) {
      eligibilityReasons.push(
        'Only VBLklassik contributions allowed (no VBL extra)'
      );
    } else {
      rulesApplied.push('Only VBLklassik contributions');
    }
    if (input.currentAge >= 69) {
      eligibilityReasons.push('User must be younger than 69 years old');
    } else {
      rulesApplied.push('User younger than 69 years old');
    }
    if (input.hasMovedContributions) {
      eligibilityReasons.push(
        'Contributions must not be moved to another supplementary insurance'
      );
    } else {
      rulesApplied.push('Contributions not moved to another insurance');
    }

    const isEligible = eligibilityReasons.length === 0;

    let drvRefund = 0;
    let vblRefund = 0;
    if (isEligible) {
      // Calculate both DRV (State Pension) and VBL (Supplementary Pension) separately
      for (const p of periods) {
        drvRefund += this.sumPeriodContributionByType(p, years, westStates, 'drv');
        vblRefund += this.sumPeriodContributionByType(p, years, westStates, 'vblklassik');
      }
    }

    const baseRefundAmount = vblRefund; // Keep for backward compatibility
    const vatAmount = baseRefundAmount * this.VAT_RATE; // 0
    const totalAmount = drvRefund + vblRefund + vatAmount;

    return {
      isEligible,
      eligibilityReasons,
      calculationMethod: isPost2018 ? 'post2018' : 'pre2018',
      baseRefundAmount: Math.round(baseRefundAmount * 100) / 100,
      vatAmount,
      totalAmount: Math.round(totalAmount * 100) / 100,
      statePension: Math.round(drvRefund * 100) / 100,
      vblKlassik: Math.round(vblRefund * 100) / 100,
      calculationDetails: {
        contributionPeriod: monthsTotal,
        consecutivePeriod: consecutiveMonths,
        ageAtEmploymentEnd: input.currentAge,
        westGermanyEligible: hasOnlyWest,
        timeSinceEmploymentEnd: this.calculateMonthsSinceEmploymentEnd(
          input.employmentEnd
        ),
      },
      rulesApplied,
      warnings,
    };
  }

  private static monthsBetween(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    const ms = e.getTime() - s.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)) + 1); // inclusive approx
  }

  /**
   * Calculate contributions for a specific pension type (DRV or VBL)
   */
  private static sumPeriodContributionByType(
    period: {
      startDate: string;
      endDate: string;
      state: string;
      grossMonthlySalary: number;
    },
    years: Record<string, any>,
    westStates: string[],
    pensionType: 'drv' | 'vblklassik'
  ): number {
    let sum = 0;
    // Split by year boundaries
    const s = new Date(period.startDate);
    const e = new Date(period.endDate);
    let cursor = new Date(
      Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())
    );
    const end = new Date(
      Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate())
    );

    while (cursor <= end) {
      const year = cursor.getUTCFullYear();
      const yearEnd = new Date(Date.UTC(year, 11, 31));
      const segmentEnd = end < yearEnd ? end : yearEnd;

      const months = Math.max(
        0,
        Math.floor(
          (segmentEnd.getTime() - cursor.getTime()) /
            (1000 * 60 * 60 * 24 * 30.44)
        ) + 1
      );
      const yearCfg = years[String(year)] || {};
      const isWest = westStates.includes(period.state);
      const cap = isWest ? yearCfg.westCap : yearCfg.eastCap;
      const rates = yearCfg.rates || {};

      if (cap && rates) {
        const cappedGross = Math.min(period.grossMonthlySalary, cap);
        const rate = rates[pensionType] ?? 0;
        sum += months * cappedGross * rate;
      }

      // move cursor to next year start
      cursor = new Date(Date.UTC(year + 1, 0, 1));
    }

    return sum;
  }


  /**
   * Sanitize input for logging (remove sensitive data)
   */
  private static sanitizeInput(
    input: VBLCalculationInput
  ): Partial<VBLCalculationInput> {
    const { vblInsuranceNumber, ...sanitized } = input;
    return sanitized;
  }

  /**
   * Log calculation to database
   */
  private static async logCalculation(
    input: VBLCalculationInput,
    result: VBLCalculationResult
  ): Promise<void> {
    try {
      await db.insert(calculationLogs).values({
        inputData: input as unknown as Record<string, unknown>,
        rulesVersion: this.RULES_VERSION,
        calculationResult: result as unknown as Record<string, unknown>,
      });
    } catch (error) {
      logger.error(
        'Failed to log calculation:',
        error as unknown as Record<string, unknown>
      );
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get calculation history for an application
   */
  static async getCalculationHistory(applicationId: string) {
    try {
      const logs = await db
        .select()
        .from(calculationLogs)
        .where(eq(calculationLogs.applicationId, applicationId))
        .orderBy(desc(calculationLogs.createdAt));

      return logs;
    } catch (error) {
      logger.error(
        'Failed to get calculation history:',
        error as unknown as Record<string, unknown>
      );
      throw new Error('Failed to get calculation history');
    }
  }
}
