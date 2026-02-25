import { eq, and, sql } from 'drizzle-orm';
import { db } from '../utils/db';
import { pendingSessions, applications, calculationLogs, workflowStates } from '../drizzle/schema/gpr';
import { auditLogs } from '../drizzle/schema/shared';
import { logger } from '../utils/logger';

// Types for pending session data
export interface JobData {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  monthlySalary: number;
  sector: string;
  state?: string;
  supplementaryPension?: string;
}

export interface CalculationResult {
  statePensionRefund: number;
  supplementaryRefund: number;
  totalRefund: number;
  totalMonthsContributed: number;
  details: {
    drvEligible: boolean;
    drvReason: string;
    supplementaryEligible: boolean;
    supplementaryReason: string;
  };
}

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
}

export interface SavePendingSessionInput {
  email: string;
  calculatorData: {
    numberOfJobs: number;
    jobs: JobData[];
    calculationResult: CalculationResult;
  };
  eligibilityData?: {
    citizenship?: string;
    residence?: string;
    lastEmploymentMonth?: string;
    lastEmploymentYear?: string;
    contributionDuration?: string;
    dateOfBirth?: string;
    eligibilityResult?: EligibilityResult;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface PendingSession {
  id: string;
  email: string;
  numberOfJobs: number;
  jobs: JobData[];
  calculationResult: CalculationResult;
  citizenship: string | null;
  residence: string | null;
  eligibilityResult: EligibilityResult | null;
  expiresAt: Date | null;
  createdAt: Date | null;
}

export interface GPRApplication {
  id: string;
  userId: string;
  status: string;
  numberOfJobs: number | null;
  jobs: JobData[] | null;
  totalMonthsContributed: number | null;
  statePensionRefund: string | null;
  supplementaryRefund: string | null;
  totalRefund: string | null;
  citizenship: string | null;
  residence: string | null;
  eligibilityResult: EligibilityResult | null;
  workflowState: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class GPRApplicationService {
  /**
   * Save or update a pending session (upsert by email)
   * This is called when user submits email for magic link
   */
  static async savePendingSession(input: SavePendingSessionInput): Promise<PendingSession> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

      const sessionData = {
        email: input.email.toLowerCase(),
        numberOfJobs: input.calculatorData.numberOfJobs,
        jobs: input.calculatorData.jobs,
        calculationResult: input.calculatorData.calculationResult,
        citizenship: input.eligibilityData?.citizenship || null,
        residence: input.eligibilityData?.residence || null,
        lastEmploymentMonth: input.eligibilityData?.lastEmploymentMonth || null,
        lastEmploymentYear: input.eligibilityData?.lastEmploymentYear || null,
        contributionDuration: input.eligibilityData?.contributionDuration || null,
        dateOfBirth: input.eligibilityData?.dateOfBirth || null,
        eligibilityResult: input.eligibilityData?.eligibilityResult || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        expiresAt,
        updatedAt: new Date(),
      };

      // Upsert: insert if new, update if exists
      const result = await db
        .insert(pendingSessions)
        .values(sessionData)
        .onConflictDoUpdate({
          target: pendingSessions.email,
          set: {
            ...sessionData,
            updatedAt: new Date(),
          },
        })
        .returning();

      const session = result[0];

      // Log the calculation for audit
      await db.insert(calculationLogs).values({
        sessionId: session.id,
        inputData: {
          numberOfJobs: input.calculatorData.numberOfJobs,
          jobs: input.calculatorData.jobs,
        },
        calculationResult: input.calculatorData.calculationResult,
        rulesVersion: '1.0',
      });

      logger.info(`Pending session saved for email: ${input.email}`);

      return {
        id: session.id,
        email: session.email,
        numberOfJobs: session.numberOfJobs,
        jobs: session.jobs as JobData[],
        calculationResult: session.calculationResult as CalculationResult,
        citizenship: session.citizenship,
        residence: session.residence,
        eligibilityResult: session.eligibilityResult as EligibilityResult | null,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      };
    } catch (error) {
      logger.error('Error saving pending session:', error);
      throw new Error('Failed to save pending session');
    }
  }

  /**
   * Get pending session by email
   */
  static async getPendingSession(email: string): Promise<PendingSession | null> {
    try {
      const result = await db
        .select()
        .from(pendingSessions)
        .where(
          and(
            eq(pendingSessions.email, email.toLowerCase()),
            sql`${pendingSessions.expiresAt} > NOW()`
          )
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const session = result[0];
      return {
        id: session.id,
        email: session.email,
        numberOfJobs: session.numberOfJobs,
        jobs: session.jobs as JobData[],
        calculationResult: session.calculationResult as CalculationResult,
        citizenship: session.citizenship,
        residence: session.residence,
        eligibilityResult: session.eligibilityResult as EligibilityResult | null,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      };
    } catch (error) {
      logger.error('Error getting pending session:', error);
      throw new Error('Failed to get pending session');
    }
  }

  /**
   * Migrate pending session to application
   * Called when user verifies magic link
   */
  static async migrateToApplication(email: string, userId: string): Promise<GPRApplication | null> {
    try {
      const pendingSession = await this.getPendingSession(email);

      if (!pendingSession) {
        logger.info(`No pending session found for email: ${email}`);
        return null;
      }

      const calcResult = pendingSession.calculationResult;

      // Create application from pending session
      const result = await db.transaction(async (tx: any) => {
        // Create the application
        const [newApplication] = await tx
          .insert(applications)
          .values({
            userId,
            status: pendingSession.eligibilityResult?.isEligible ? 'ready' : 'draft',
            numberOfJobs: pendingSession.numberOfJobs,
            jobs: pendingSession.jobs,
            totalMonthsContributed: calcResult.totalMonthsContributed,
            statePensionRefund: calcResult.statePensionRefund.toString(),
            supplementaryRefund: calcResult.supplementaryRefund.toString(),
            totalRefund: calcResult.totalRefund.toString(),
            calculationDetails: calcResult.details,
            citizenship: pendingSession.citizenship,
            residence: pendingSession.residence,
            eligibilityResult: pendingSession.eligibilityResult,
            workflowState: 'draft',
            workflowHistory: [
              {
                state: 'draft',
                timestamp: new Date().toISOString(),
                triggeredBy: 'system',
                note: 'Application created from calculator',
              },
            ],
          })
          .returning();

        // Create initial workflow state
        await tx.insert(workflowStates).values({
          applicationId: newApplication.id,
          state: 'draft',
          previousState: null,
          triggeredBy: 'system',
          metadata: { source: 'calculator', migratedFromSession: pendingSession.id },
        });

        // Update calculation logs to reference the new application
        await tx
          .update(calculationLogs)
          .set({ applicationId: newApplication.id })
          .where(eq(calculationLogs.sessionId, pendingSession.id));

        // Delete the pending session
        await tx
          .delete(pendingSessions)
          .where(eq(pendingSessions.id, pendingSession.id));

        // Log the migration
        await tx.insert(auditLogs).values({
          userId,
          action: 'application_created',
          resource: 'gpr_application',
          resourceId: newApplication.id,
          details: {
            source: 'calculator_migration',
            sessionId: pendingSession.id,
            totalRefund: calcResult.totalRefund,
          },
        });

        return newApplication;
      });

      logger.info(`Application created for user: ${userId}, application: ${result.id}`);

      return {
        id: result.id,
        userId: result.userId,
        status: result.status || 'draft',
        numberOfJobs: result.numberOfJobs,
        jobs: result.jobs as JobData[] | null,
        totalMonthsContributed: result.totalMonthsContributed,
        statePensionRefund: result.statePensionRefund,
        supplementaryRefund: result.supplementaryRefund,
        totalRefund: result.totalRefund,
        citizenship: result.citizenship,
        residence: result.residence,
        eligibilityResult: result.eligibilityResult as EligibilityResult | null,
        workflowState: result.workflowState,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      logger.error('Error migrating session to application:', error);
      throw new Error('Failed to migrate session to application');
    }
  }

  /**
   * Get all applications for a user
   */
  static async getUserApplications(userId: string): Promise<GPRApplication[]> {
    try {
      const result = await db
        .select()
        .from(applications)
        .where(eq(applications.userId, userId))
        .orderBy(sql`${applications.createdAt} DESC`);

      return result.map((app) => ({
        id: app.id,
        userId: app.userId,
        status: app.status || 'draft',
        numberOfJobs: app.numberOfJobs,
        jobs: app.jobs as JobData[] | null,
        totalMonthsContributed: app.totalMonthsContributed,
        statePensionRefund: app.statePensionRefund,
        supplementaryRefund: app.supplementaryRefund,
        totalRefund: app.totalRefund,
        citizenship: app.citizenship,
        residence: app.residence,
        eligibilityResult: app.eligibilityResult as EligibilityResult | null,
        workflowState: app.workflowState,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      }));
    } catch (error) {
      logger.error('Error getting user applications:', error);
      throw new Error('Failed to get user applications');
    }
  }

  /**
   * Get a single application by ID
   */
  static async getApplication(applicationId: string, userId: string): Promise<GPRApplication | null> {
    try {
      const result = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.userId, userId)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const app = result[0];
      return {
        id: app.id,
        userId: app.userId,
        status: app.status || 'draft',
        numberOfJobs: app.numberOfJobs,
        jobs: app.jobs as JobData[] | null,
        totalMonthsContributed: app.totalMonthsContributed,
        statePensionRefund: app.statePensionRefund,
        supplementaryRefund: app.supplementaryRefund,
        totalRefund: app.totalRefund,
        citizenship: app.citizenship,
        residence: app.residence,
        eligibilityResult: app.eligibilityResult as EligibilityResult | null,
        workflowState: app.workflowState,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting application:', error);
      throw new Error('Failed to get application');
    }
  }

  /**
   * Update an application
   */
  static async updateApplication(
    applicationId: string,
    userId: string,
    data: Partial<{
      citizenship: string;
      residence: string;
      status: string;
    }>
  ): Promise<GPRApplication | null> {
    try {
      // Verify ownership first
      const existing = await this.getApplication(applicationId, userId);
      if (!existing) {
        return null;
      }

      const result = await db
        .update(applications)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.userId, userId)
          )
        )
        .returning();

      if (result.length === 0) {
        return null;
      }

      const app = result[0];
      return {
        id: app.id,
        userId: app.userId,
        status: app.status || 'draft',
        numberOfJobs: app.numberOfJobs,
        jobs: app.jobs as JobData[] | null,
        totalMonthsContributed: app.totalMonthsContributed,
        statePensionRefund: app.statePensionRefund,
        supplementaryRefund: app.supplementaryRefund,
        totalRefund: app.totalRefund,
        citizenship: app.citizenship,
        residence: app.residence,
        eligibilityResult: app.eligibilityResult as EligibilityResult | null,
        workflowState: app.workflowState,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    } catch (error) {
      logger.error('Error updating application:', error);
      throw new Error('Failed to update application');
    }
  }

  /**
   * Cleanup expired pending sessions
   * Should be called periodically (e.g., daily cron)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db
        .delete(pendingSessions)
        .where(sql`${pendingSessions.expiresAt} < NOW()`)
        .returning();

      const count = result.length;
      logger.info(`Cleaned up ${count} expired pending sessions`);
      return count;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw new Error('Failed to cleanup expired sessions');
    }
  }
}
