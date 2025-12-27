import { logger } from '../utils/logger';
import {
  VBLCalculationService,
  VBLCalculationInput,
  VBLCalculationResult,
} from './vbl-calculation';

/**
 * Simplified input from multi-step calculator (only job data)
 */
export interface VBLSimpleCalculationInput {
  jobs: Array<{
    location: string; // German state name
    employmentType: string; // "Public Sector", etc.
    supplementaryPension: string; // "VBLextra", "VBLklassik", etc.
    startDate: string; // YYYY-MM or YYYY-MM-DD
    endDate: string; // YYYY-MM or YYYY-MM-DD
    monthlyIncome: number;
  }>;
  dateOfBirth?: string; // Optional: YYYY-MM-DD
  currentAge?: number; // Optional: current age
  userType?: 'insured_person' | 'widow' | 'orphan'; // Optional: defaults to insured_person
}

/**
 * Service for simplified VBL calculations
 * Derives missing fields from job data to match frontend multi-step calculator
 */
export class VBLSimpleCalculationService {
  // West Germany states for automatic detection
  private static readonly WEST_GERMANY_STATES = [
    'Baden-Württemberg',
    'Bavaria',
    'Berlin (West)',
    'Bremen',
    'Hamburg',
    'Hesse',
    'Lower Saxony',
    'North Rhine-Westphalia',
    'Rheinland-Palatinate',
    'Rhineland-Palatinate',
    'Saarland',
    'Schleswig-Holstein',
  ];

  /**
   * Convert YYYY-MM to YYYY-MM-DD format by appending -01
   */
  private static formatDateToYYYYMMDD(dateString: string): string {
    if (!dateString) return '';
    // Already in YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    // Convert YYYY-MM to YYYY-MM-DD
    if (dateString.match(/^\d{4}-\d{2}$/)) return `${dateString}-01`;
    return dateString;
  }

  /**
   * Check if a state is in West Germany
   */
  private static isWestGermanyState(state: string): boolean {
    return this.WEST_GERMANY_STATES.some(
      (westState) =>
        westState.toLowerCase() === state.toLowerCase() ||
        state.toLowerCase().includes(westState.toLowerCase())
    );
  }

  /**
   * Calculate total months contributed from job periods
   */
  private static calculateMonthsContributed(
    jobs: VBLSimpleCalculationInput['jobs']
  ): number {
    return jobs.reduce((total, job) => {
      if (!job.startDate || !job.endDate) return total;
      const start = new Date(this.formatDateToYYYYMMDD(job.startDate));
      const end = new Date(this.formatDateToYYYYMMDD(job.endDate));
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1;
      return total + Math.max(0, months);
    }, 0);
  }

  /**
   * Calculate consecutive months for the last employment period
   * (used for post-2018 calculations)
   */
  private static calculateConsecutiveMonths(
    jobs: VBLSimpleCalculationInput['jobs']
  ): number {
    if (jobs.length === 0) return 0;

    // Sort jobs by start date
    const sortedJobs = [...jobs].sort((a, b) => {
      const dateA = new Date(this.formatDateToYYYYMMDD(a.startDate));
      const dateB = new Date(this.formatDateToYYYYMMDD(b.startDate));
      return dateA.getTime() - dateB.getTime();
    });

    // Find the last consecutive period
    let consecutiveMonths = 0;
    let currentEnd: Date | null = null;

    for (let i = sortedJobs.length - 1; i >= 0; i--) {
      const job = sortedJobs[i];
      const start = new Date(this.formatDateToYYYYMMDD(job.startDate));
      const end = new Date(this.formatDateToYYYYMMDD(job.endDate));

      if (currentEnd === null) {
        // Last job
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
        consecutiveMonths = months;
        currentEnd = start;
      } else {
        // Check if this job is consecutive (ends right before the next job starts)
        const monthsDiff =
          (currentEnd.getFullYear() - end.getFullYear()) * 12 +
          (currentEnd.getMonth() - end.getMonth());

        if (monthsDiff <= 1) {
          // Consecutive (allowing 1 month gap)
          const months =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth()) +
            1;
          consecutiveMonths += months;
          currentEnd = start;
        } else {
          // Not consecutive, stop
          break;
        }
      }
    }

    return consecutiveMonths;
  }

  /**
   * Determine if user has left public sector based on jobs
   */
  private static hasLeftPublicSector(
    jobs: VBLSimpleCalculationInput['jobs']
  ): boolean {
    if (jobs.length === 0) return true;

    // Sort by end date to find the most recent job
    const sortedJobs = [...jobs].sort((a, b) => {
      const dateA = new Date(this.formatDateToYYYYMMDD(a.endDate));
      const dateB = new Date(this.formatDateToYYYYMMDD(b.endDate));
      return dateB.getTime() - dateA.getTime();
    });

    const lastJob = sortedJobs[0];
    const lastEndDate = new Date(this.formatDateToYYYYMMDD(lastJob.endDate));
    const now = new Date();

    // If last job ended in the past, user has left
    return lastEndDate < now;
  }

  /**
   * Check if user is currently working in public sector
   */
  private static isWorkingInPublicSector(
    jobs: VBLSimpleCalculationInput['jobs']
  ): boolean {
    if (jobs.length === 0) return false;

    // Sort by end date to find the most recent job
    const sortedJobs = [...jobs].sort((a, b) => {
      const dateA = new Date(this.formatDateToYYYYMMDD(a.endDate));
      const dateB = new Date(this.formatDateToYYYYMMDD(b.endDate));
      return dateB.getTime() - dateA.getTime();
    });

    const lastJob = sortedJobs[0];
    const lastEndDate = new Date(this.formatDateToYYYYMMDD(lastJob.endDate));
    const now = new Date();

    // If last job is still ongoing and is public sector
    return (
      lastEndDate >= now &&
      lastJob.employmentType.toLowerCase().includes('public')
    );
  }

  /**
   * Calculate current age from date of birth
   */
  private static calculateCurrentAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  /**
   * Transform simplified input to full VBL calculation input
   */
  private static transformToFullInput(
    input: VBLSimpleCalculationInput
  ): VBLCalculationInput {
    // Sort jobs by start date
    const sortedJobs = [...input.jobs].sort((a, b) => {
      const dateA = new Date(this.formatDateToYYYYMMDD(a.startDate));
      const dateB = new Date(this.formatDateToYYYYMMDD(b.startDate));
      return dateA.getTime() - dateB.getTime();
    });

    // Get earliest start and latest end dates
    const employmentStart = this.formatDateToYYYYMMDD(
      sortedJobs[0]?.startDate || ''
    );
    const employmentEnd = this.formatDateToYYYYMMDD(
      sortedJobs[sortedJobs.length - 1]?.endDate || ''
    );

    // Determine if any job is in West Germany
    const hasWestGermanyJob = input.jobs.some((job) =>
      this.isWestGermanyState(job.location)
    );

    // Calculate months contributed
    const monthsContributed = this.calculateMonthsContributed(input.jobs);
    const consecutiveMonthsContributed =
      this.calculateConsecutiveMonths(input.jobs);

    // Check for VBLextra
    const hasPaidVBLExtra = input.jobs.some(
      (job) =>
        job.supplementaryPension.toLowerCase() === 'vblextra' ||
        job.supplementaryPension.toLowerCase().includes('extra')
    );

    // Determine user status
    const hasLeftPublicSector = this.hasLeftPublicSector(input.jobs);
    const isWorkingInPublicSectorEU = this.isWorkingInPublicSector(input.jobs);

    // Calculate or use provided age
    let currentAge = input.currentAge || 40;
    let dateOfBirth = input.dateOfBirth || '1980-01-01';

    if (input.dateOfBirth && !input.currentAge) {
      currentAge = this.calculateCurrentAge(input.dateOfBirth);
    } else if (!input.dateOfBirth && input.currentAge) {
      // Estimate date of birth from current age
      const birthYear = new Date().getFullYear() - input.currentAge;
      dateOfBirth = `${birthYear}-01-01`;
    }

    // Build the full input
    const fullInput: VBLCalculationInput = {
      userType: input.userType || 'insured_person',
      dateOfBirth,
      currentAge,
      employmentStart,
      employmentEnd,
      isWestGermany: hasWestGermanyJob,
      monthsContributed,
      consecutiveMonthsContributed,
      hasLeftPublicSector,
      isWorkingInPublicSectorEU,
      hasPaidVBLExtra,
      hasMovedContributions: false, // Assume not moved (we don't ask this)
      isStageOrchestra: false, // Assume not stage/orchestra (we don't ask this)
      // Build periods array for accurate calculation
      periods: input.jobs.map((job) => ({
        startDate: this.formatDateToYYYYMMDD(job.startDate),
        endDate: this.formatDateToYYYYMMDD(job.endDate),
        state: job.location,
        grossMonthlySalary: job.monthlyIncome,
        publicSector:
          job.employmentType.toLowerCase().includes('public') ||
          job.employmentType.toLowerCase().includes('öffentlich'),
      })),
    };

    return fullInput;
  }

  /**
   * Calculate VBL refund using simplified input
   */
  static async calculateVBLRefund(
    input: VBLSimpleCalculationInput
  ): Promise<VBLCalculationResult> {
    try {
      logger.info('Starting simplified VBL calculation', {
        numberOfJobs: input.jobs.length,
      });

      // Validate basic input
      if (!input.jobs || input.jobs.length === 0) {
        throw new Error('At least one job is required');
      }

      // Transform simplified input to full input
      const fullInput = this.transformToFullInput(input);

      logger.info('Transformed simplified input to full input', {
        fullInput: {
          employmentStart: fullInput.employmentStart,
          employmentEnd: fullInput.employmentEnd,
          monthsContributed: fullInput.monthsContributed,
          isWestGermany: fullInput.isWestGermany,
          hasLeftPublicSector: fullInput.hasLeftPublicSector,
        },
      });

      // Use the existing calculation service
      const result =
        await VBLCalculationService.calculateVBLRefund(fullInput);

      return result;
    } catch (error) {
      logger.error('Simplified VBL calculation error:', error);
      throw error;
    }
  }
}
