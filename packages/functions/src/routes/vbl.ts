import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import {
  VBLCalculationService,
  VBLCalculationInput,
} from '../services/vbl-calculation';
import { authMiddleware } from '../middleware/auth';
import { db } from '../utils/db';
import { applications, calculationLogs } from '../drizzle/schema/vbl';
import { eq, and } from 'drizzle-orm';

const vbl = new Hono();

// Validation schemas
const vblCalculationSchema = z.object({
  // User information
  userType: z.enum(['insured_person', 'widow', 'orphan']),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  currentAge: z.number().min(0).max(120),

  // Employment information
  employmentStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  employmentEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isWestGermany: z.boolean(),
  monthsContributed: z.number().min(0),
  consecutiveMonthsContributed: z.number().min(0).optional(),
  vblInsuranceNumber: z.string().optional(),

  // Additional information
  hasLeftPublicSector: z.boolean(),
  isWorkingInPublicSectorEU: z.boolean(),
  hasPaidVBLExtra: z.boolean(),
  hasMovedContributions: z.boolean(),

  // Stage/Orchestra specific
  isStageOrchestra: z.boolean(),
  hasOccupationalDisability: z.boolean().optional(),
  disabilityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  isMandatoryInsuranceRequired: z.boolean().optional(),
  retirementAge: z.number().min(50).max(80).optional(),

  // New: periods input (preferred for accurate calculation)
  periods: z
    .array(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        state: z.string().min(2),
        grossMonthlySalary: z.number().min(0),
        publicSector: z.boolean().optional(),
        institution: z.enum(['drv', 'vblklassik', 'vddb', 'vddko']).optional(),
      })
    )
    .optional(),
});

const applicationUpdateSchema = z.object({
  employerName: z.string().min(1).max(255).optional(),
  employmentStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  employmentEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  isWestGermany: z.boolean().optional(),
  monthsContributed: z.number().min(0).optional(),
  vblInsuranceNumber: z.string().optional(),
});

// Calculate VBL refund
vbl.post(
  '/calculate',
  authMiddleware,
  zValidator('json', vblCalculationSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const input = c.req.valid('json') as VBLCalculationInput;

      logger.info(`VBL calculation requested by user ${user.id}`);

      // Perform calculation
      const result = await VBLCalculationService.calculateVBLRefund(input);

      // If calculation is successful and user wants to save, create/update application
      const shouldSave = c.req.query('save') === 'true';
      let applicationId = null;

      if (shouldSave && result.isEligible) {
        // Check if application already exists
        const existingApplication = await db
          .select()
          .from(applications)
          .where(
            and(
              eq(applications.userId, user.id),
              eq(applications.status, 'draft')
            )
          )
          .limit(1);

        if (existingApplication.length > 0) {
          // Update existing application
          const [updatedApp] = await db
            .update(applications)
            .set({
              employmentStart: input.employmentStart
                ? new Date(input.employmentStart).toISOString().split('T')[0]
                : null,
              employmentEnd: input.employmentEnd
                ? new Date(input.employmentEnd).toISOString().split('T')[0]
                : null,
              isWestGermany: input.isWestGermany,
              monthsContributed: input.monthsContributed,
              vblInsuranceNumber: input.vblInsuranceNumber,
              calculationMethod: result.calculationMethod,
              baseRefundAmount: result.baseRefundAmount.toString(),
              vatAmount: result.vatAmount.toString(),
              totalAmount: result.totalAmount.toString(),
              updatedAt: new Date(),
            })
            .where(eq(applications.id, existingApplication[0].id))
            .returning();

          applicationId = updatedApp.id;
        } else {
          // Create new application
          const [newApp] = await db
            .insert(applications)
            .values({
              userId: user.id,
              employmentStart: input.employmentStart
                ? new Date(input.employmentStart).toISOString().split('T')[0]
                : null,
              employmentEnd: input.employmentEnd
                ? new Date(input.employmentEnd).toISOString().split('T')[0]
                : null,
              isWestGermany: input.isWestGermany,
              monthsContributed: input.monthsContributed,
              vblInsuranceNumber: input.vblInsuranceNumber,
              calculationMethod: result.calculationMethod,
              baseRefundAmount: result.baseRefundAmount.toString(),
              vatAmount: result.vatAmount.toString(),
              totalAmount: result.totalAmount.toString(),
              status: 'draft',
            })
            .returning();

          applicationId = newApp.id;
        }
      }

      return c.json({
        success: true,
        calculation: result,
        applicationId,
        message: result.isEligible
          ? 'Calculation completed successfully. You are eligible for a VBL refund.'
          : 'Calculation completed. You are not eligible for a VBL refund based on the provided information.',
      });
    } catch (error) {
      logger.error('VBL calculation error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to calculate VBL refund',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

// Get user's applications
vbl.get('/applications', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const userApplications = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, user.id))
      .orderBy(applications.createdAt);

    return c.json({
      success: true,
      applications: userApplications,
    });
  } catch (error) {
    logger.error('Get applications error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get applications',
      },
      500
    );
  }
});

// Get specific application
vbl.get('/applications/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const applicationId = c.req.param('id');

    const application = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (application.length === 0) {
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
      application: application[0],
    });
  } catch (error) {
    logger.error('Get application error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get application',
      },
      500
    );
  }
});

// Update application
vbl.put(
  '/applications/:id',
  authMiddleware,
  zValidator('json', applicationUpdateSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const applicationId = c.req.param('id');
      const updateData = c.req.valid('json');

      // Check if application exists and belongs to user
      const existingApp = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.userId, user.id)
          )
        )
        .limit(1);

      if (existingApp.length === 0) {
        return c.json(
          {
            success: false,
            error: 'Application not found',
          },
          404
        );
      }

      // Update application
      const [updatedApp] = await db
        .update(applications)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId))
        .returning();

      return c.json({
        success: true,
        application: updatedApp,
      });
    } catch (error) {
      logger.error('Update application error:', error);
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

// Get calculation history for an application
vbl.get('/applications/:id/calculations', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const applicationId = c.req.param('id');

    // Verify application belongs to user
    const application = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (application.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Application not found',
        },
        404
      );
    }

    const calculations =
      await VBLCalculationService.getCalculationHistory(applicationId);

    return c.json({
      success: true,
      calculations,
    });
  } catch (error) {
    logger.error('Get calculation history error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get calculation history',
      },
      500
    );
  }
});

// Submit application for processing
vbl.post('/applications/:id/submit', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const applicationId = c.req.param('id');

    // Check if application exists and belongs to user
    const application = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, user.id)
        )
      )
      .limit(1);

    if (application.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Application not found',
        },
        404
      );
    }

    if (application[0].status !== 'draft') {
      return c.json(
        {
          success: false,
          error: 'Application has already been submitted',
        },
        400
      );
    }

    // Update application status
    const [updatedApp] = await db
      .update(applications)
      .set({
        status: 'ready',
        workflowState: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))
      .returning();

    return c.json({
      success: true,
      application: updatedApp,
      message: 'Application submitted successfully',
    });
  } catch (error) {
    logger.error('Submit application error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to submit application',
      },
      500
    );
  }
});

// Get calculation rules and requirements
vbl.get('/rules', async (c) => {
  try {
    const rules = {
      publicServiceSector: {
        pre2018: {
          title: 'Public Service Sector - Pre 2018',
          description: 'For employments ending before 1 January 2018',
          requirements: [
            'User left the public sector (not working in public sector in EU/EEA/UK/Switzerland)',
            'Employment region: West Germany',
            'Contribution period less than 60 months',
            'Only VBLklassik contributions (no VBL extra)',
            'User younger than 69 years old',
            'Contributions not moved to another supplementary insurance',
          ],
        },
        post2018: {
          title: 'Public Service Sector - Post 2018',
          description: 'For employments ending after 1 January 2018',
          requirements: [
            'User left the public sector (not working in public sector in EU/EEA/UK/Switzerland)',
            'Employment region: West Germany',
            'Consecutive contribution less than 36 months AND total contribution less than 60 months',
            'Only VBLklassik contributions (no VBL extra)',
            'User younger than 69 years old',
            'Contributions not moved to another supplementary insurance',
          ],
        },
      },
      stageOrchestra: {
        title: 'Stage/Orchestra (VddB/VddKO)',
        description: 'For stage and orchestra employees',
        requirements: [
          'Minimum contribution period: 12 months',
          'Maximum contribution period: unlimited for pre-2003, <36 months for post-2003',
          'User left employment with specific conditions:',
          '  - 24 months have passed, OR',
          '  - User has occupational disability, OR',
          '  - Mandatory insurance no longer required, OR',
          '  - User too old to complete 36 months before retirement, OR',
          '  - Occupational disability less than 2 years ago (VddB only)',
        ],
      },
      westGermanyStates: [
        'Baden-Württemberg',
        'Bavaria',
        'West Berlin',
        'Bremen',
        'Hamburg',
        'Hesse',
        'Lower Saxony',
        'North Rhine-Westphalia',
        'Rhineland-Palatinate',
        'Saarland',
        'Schleswig-Holstein',
      ],
    };

    return c.json({
      success: true,
      rules,
    });
  } catch (error) {
    logger.error('Get rules error:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to get rules',
      },
      500
    );
  }
});

export default vbl;
