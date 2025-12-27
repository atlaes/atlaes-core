import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
  GPRCalculationService,
  GPRCalculationInput,
} from '../services/gpr-calculation';
import { GPRApplicationService } from '../services/gpr-application';

const gpr = new Hono();

// Basic calculation schema for GPR
const gprCalculationSchema = z.object({
  // User information
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),

  // Employment information
  employmentStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  employmentEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  monthsContributed: z.number().min(0),

  // Additional information
  hasLeftEmployment: z.boolean(),
  contributionAmount: z.number().min(0).optional(),
});

// Simplified calculation schema (job-based input from calculator)
const gprSimpleCalculationSchema = z.object({
  jobs: z
    .array(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
        endDate: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
        monthlySalary: z.number().min(0),
        sector: z.string().min(1),
        state: z.string().optional(),
        supplementaryPension: z.string().optional(),
      })
    )
    .min(1, 'At least one job is required'),
});

// Session save schema (for pre-registration data persistence)
const gprSessionSchema = z.object({
  email: z.string().email('Valid email is required'),
  calculatorData: z.object({
    numberOfJobs: z.number().min(1),
    jobs: z.array(
      z.object({
        startMonth: z.string(),
        startYear: z.string(),
        endMonth: z.string(),
        endYear: z.string(),
        monthlySalary: z.number(),
        sector: z.string(),
        state: z.string().optional(),
        supplementaryPension: z.string().optional(),
      })
    ),
    calculationResult: z.object({
      statePensionRefund: z.number(),
      supplementaryRefund: z.number(),
      totalRefund: z.number(),
      totalMonthsContributed: z.number(),
      details: z.object({
        drvEligible: z.boolean(),
        drvReason: z.string(),
        supplementaryEligible: z.boolean(),
        supplementaryReason: z.string(),
      }),
    }),
  }),
  eligibilityData: z
    .object({
      citizenship: z.string().optional(),
      residence: z.string().optional(),
      lastEmploymentMonth: z.string().optional(),
      lastEmploymentYear: z.string().optional(),
      contributionDuration: z.string().optional(),
      dateOfBirth: z.string().optional(),
      eligibilityResult: z
        .object({
          isEligible: z.boolean(),
          reasons: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
});

// Application update schema
const applicationUpdateSchema = z.object({
  citizenship: z.string().optional(),
  residence: z.string().optional(),
  status: z.enum(['draft', 'ready', 'submitted']).optional(),
});

// Health check endpoint
gpr.get('/health', async (c) => {
  return c.json({
    success: true,
    service: 'GPR',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Calculate GPR refund (public endpoint - no auth required)
gpr.post(
  '/calculate',
  optionalAuthMiddleware,
  zValidator('json', gprCalculationSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');

      // Check if user is authenticated (optional)
      const user = c.get('user') || null;

      if (user) {
        logger.info(`GPR calculation requested by user ${user.id}`);
      } else {
        logger.info('GPR calculation requested by anonymous user');
      }

      // TODO: Implement actual GPR calculation logic
      // For now, return a placeholder response
      const result = {
        isEligible: true,
        estimatedRefund: 0,
        monthsContributed: input.monthsContributed,
        calculationMethod: 'placeholder',
        details: {
          message: 'GPR calculation service is under development',
        },
      };

      return c.json({
        success: true,
        calculation: result,
        message: 'GPR calculation service is under development. Please check back later.',
      });
    } catch (error) {
      logger.error('GPR calculation error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to calculate GPR refund',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

// Calculate GPR refund using simplified input (job-based) - public endpoint
gpr.post(
  '/calculate-simple',
  zValidator('json', gprSimpleCalculationSchema),
  async (c) => {
    try {
      const input = c.req.valid('json') as GPRCalculationInput;

      logger.info('Simplified GPR calculation requested', {
        jobCount: input.jobs.length,
      });

      // Perform calculation
      const result = await GPRCalculationService.calculate(input);

      return c.json({
        success: true,
        calculation: result,
        message: result.isEligible
          ? 'Calculation completed successfully. You may be eligible for a German pension refund.'
          : 'Calculation completed. Based on the provided information, you may not be eligible for a refund.',
      });
    } catch (error) {
      logger.error('Simplified GPR calculation error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to calculate GPR refund',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

// Get GPR rules and requirements
gpr.get('/rules', async (c) => {
  try {
    const rules = {
      general: {
        title: 'GPR Refund Requirements',
        description: 'General requirements for GPR pension refunds',
        requirements: [
          'Must have contributed to the German pension system',
          'Must have left German employment',
          'Must meet minimum contribution period requirements',
        ],
      },
      eligibility: {
        minimumMonths: 0,
        maximumAge: 67,
        requiresTermination: true,
      },
    };

    return c.json({
      success: true,
      rules,
    });
  } catch (error) {
    logger.error('Get GPR rules error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get rules',
      },
      500
    );
  }
});

// ============================================================
// Session Management Endpoints (Pre-registration)
// ============================================================

// Save pending session (called when user submits email for magic link)
gpr.post(
  '/session',
  zValidator('json', gprSessionSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');

      // Get IP and user agent for audit
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';

      const session = await GPRApplicationService.savePendingSession({
        email: input.email,
        calculatorData: input.calculatorData,
        eligibilityData: input.eligibilityData,
        ipAddress,
        userAgent,
      });

      logger.info(`GPR pending session saved for: ${input.email}`);

      return c.json({
        success: true,
        sessionId: session.id,
        message: 'Session saved successfully',
      });
    } catch (error) {
      logger.error('Save GPR session error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to save session',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

// Get pending session by email (for recovery/debugging)
gpr.get('/session/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const session = await GPRApplicationService.getPendingSession(email);

    if (!session) {
      return c.json(
        {
          success: false,
          error: 'Session not found or expired',
        },
        404
      );
    }

    return c.json({
      success: true,
      session: {
        id: session.id,
        email: session.email,
        numberOfJobs: session.numberOfJobs,
        totalRefund: session.calculationResult?.totalRefund,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get GPR session error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get session',
      },
      500
    );
  }
});

// ============================================================
// Application Management Endpoints (Post-registration)
// ============================================================

// Get user's GPR applications (protected endpoint)
gpr.get('/applications', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const applications = await GPRApplicationService.getUserApplications(user.id);

    return c.json({
      success: true,
      applications,
    });
  } catch (error) {
    logger.error('Get GPR applications error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get applications',
      },
      500
    );
  }
});

// Get single application by ID (protected endpoint)
gpr.get('/applications/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const applicationId = c.req.param('id');

    const application = await GPRApplicationService.getApplication(applicationId, user.id);

    if (!application) {
      return c.json(
        {
          success: false,
          error: 'Application not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      application,
    });
  } catch (error) {
    logger.error('Get GPR application error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get application',
      },
      500
    );
  }
});

// Update application (protected endpoint)
gpr.put(
  '/applications/:id',
  authMiddleware,
  zValidator('json', applicationUpdateSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const applicationId = c.req.param('id');
      const data = c.req.valid('json');

      const application = await GPRApplicationService.updateApplication(
        applicationId,
        user.id,
        data
      );

      if (!application) {
        return c.json(
          {
            success: false,
            error: 'Application not found',
          },
          404
        );
      }

      logger.info(`GPR application ${applicationId} updated by user ${user.id}`);

      return c.json({
        success: true,
        application,
      });
    } catch (error) {
      logger.error('Update GPR application error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to update application',
        },
        500
      );
    }
  }
);

// Migrate pending session to application (called by auth service after magic link verify)
// This is an internal endpoint - normally called by auth service, not directly
gpr.post('/migrate-session', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Migrate any pending session for this user's email
    const application = await GPRApplicationService.migrateToApplication(user.email, user.id);

    if (!application) {
      return c.json({
        success: true,
        message: 'No pending session found to migrate',
        application: null,
      });
    }

    logger.info(`GPR session migrated to application ${application.id} for user ${user.id}`);

    return c.json({
      success: true,
      message: 'Session migrated to application',
      application,
    });
  } catch (error) {
    logger.error('Migrate GPR session error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to migrate session',
      },
      500
    );
  }
});

export default gpr;
