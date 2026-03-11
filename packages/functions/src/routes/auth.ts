import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';
import { env, getJwtSecret } from '../utils/env';
import {
  AuthService,
  registrationSchema,
  loginSchema,
  passwordChangeSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
} from '../utils/auth';
import { UserService } from '../services/user';
import { authMiddleware } from '../middleware/auth';
import { GPRApplicationService } from '../services/gpr-application';
import { sendMagicLinkEmail } from '../services/email';
import { db } from '../utils/db';
import { users } from '../drizzle/schema/shared';
import { eq } from 'drizzle-orm';

const auth = new Hono();

// Initialize Google OAuth client
const googleClient =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new OAuth2Client(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        `${env.FRONTEND_URL}/auth/google/callback`
      )
    : null;

// Register endpoint
auth.post('/register', zValidator('json', registrationSchema), async (c) => {
  try {
    const data = c.req.valid('json');

    // Check if email already exists
    const emailExists = await UserService.emailExists(data.email);
    if (emailExists) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Create user
    const user = await UserService.createUser(data);

    // Generate tokens
    const tokens = AuthService.generateTokens({
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role || 'user',
    });

    logger.info(`User registered successfully: ${user.email}`);

    return c.json(
      {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          profile: user.profile,
        },
        tokens,
      },
      201
    );
  } catch (error) {
    logger.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login endpoint
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');

    // Verify user credentials
    const user = await UserService.verifyPassword(email, password);

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate tokens
    const tokens = AuthService.generateTokens({
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role || 'user',
    });

    logger.info(`User logged in successfully: ${user.email}`);

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        profile: user.profile,
      },
      tokens,
    });
  } catch (error) {
    logger.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Refresh token endpoint
auth.post(
  '/refresh',
  zValidator('json', z.object({ refreshToken: z.string() })),
  async (c) => {
    try {
      const { refreshToken } = c.req.valid('json');

      // Generate new tokens
      const tokens = AuthService.refreshTokens(refreshToken);

      return c.json({
        message: 'Tokens refreshed successfully',
        tokens,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      return c.json({ error: 'Token refresh failed' }, 401);
    }
  }
);

// Logout endpoint
auth.post('/logout', authMiddleware, async (c) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// Get current user endpoint
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    return c.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// Update profile endpoint
auth.put(
  '/profile',
  authMiddleware,
  zValidator(
    'json',
    z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(),
      nationality: z.string().length(2).optional(),
    })
  ),
  async (c) => {
    try {
      const user = c.get('user');
      const data = c.req.valid('json');

      const updatedUser = await UserService.updateProfile(user.id, data);

      return c.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      return c.json({ error: 'Profile update failed' }, 500);
    }
  }
);

// Change password endpoint
auth.put(
  '/change-password',
  authMiddleware,
  zValidator('json', passwordChangeSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { currentPassword, newPassword } = c.req.valid('json');

      // Verify current password
      const isValid = await UserService.verifyPassword(
        (user as any).email,
        currentPassword
      );
      if (!isValid) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }

      // Update password
      await UserService.changePassword(user.id, newPassword);

      return c.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Password change error:', error);
      return c.json({ error: 'Password change failed' }, 500);
    }
  }
);

// Verify email endpoint
auth.post(
  '/verify-email',
  zValidator('json', z.object({ token: z.string() })),
  async (c) => {
    try {
      const { token } = c.req.valid('json');

      const user = await UserService.verifyEmail(token);

      return c.json({
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      return c.json({ error: 'Email verification failed' }, 400);
    }
  }
);

// Test endpoint to check environment
auth.get('/test-env', async (c) => {
  return c.json({
    jwtSecret: !!getJwtSecret(),
    jwtSecretLength: getJwtSecret()?.length,
    databaseUrl: !!env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
  });
});

// Extended magic link request schema with optional GPR session data
const ALLOWED_ORIGINS = [
  'https://vbl.atlaes.de',
  'https://staging.vbl.atlaes.de',
  'https://admin.atlaes.de',
  'https://staging.admin.atlaes.de',
  'https://gpr.atlaes.de',
  'https://staging.gpr.atlaes.de',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
];

const extendedMagicLinkRequestSchema = z.object({
  email: z.string().email(),
  callbackUrl: z.string().url().optional(),
  redirectUrl: z.string().startsWith('/').max(200).optional(),
  gprSessionData: z
    .object({
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
    })
    .optional(),
});

// Request magic link endpoint (with optional GPR session data)
auth.post(
  '/magic-link/request',
  zValidator('json', extendedMagicLinkRequestSchema),
  async (c) => {
    try {
      const { email, callbackUrl, redirectUrl, gprSessionData } =
        c.req.valid('json');

      // Debug: Check if JWT_SECRET is available
      logger.info('JWT_SECRET available:', !!getJwtSecret());
      logger.info('Email received:', email);

      // If GPR session data is provided, save it to pending sessions
      if (gprSessionData) {
        const ipAddress =
          c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        const userAgent = c.req.header('user-agent') || 'unknown';

        try {
          await GPRApplicationService.savePendingSession({
            email,
            calculatorData: gprSessionData.calculatorData,
            eligibilityData: gprSessionData.eligibilityData,
            ipAddress,
            userAgent,
          });
          logger.info(`GPR session data saved for: ${email}`);
        } catch (sessionError) {
          logger.error('Failed to save GPR session data:', sessionError);
          // Don't fail the magic link request if session save fails
        }
      }

      // Generate magic link token (works for both existing and new users)
      const token = AuthService.generateMagicLinkToken(email);
      const baseUrl =
        callbackUrl && ALLOWED_ORIGINS.includes(callbackUrl)
          ? callbackUrl
          : env.FRONTEND_URL;
      const baseMagicLinkUrl = AuthService.generateMagicLinkUrl(
        token,
        baseUrl
      );
      const magicLinkUrl = redirectUrl
        ? `${baseMagicLinkUrl}&redirect=${encodeURIComponent(redirectUrl)}`
        : baseMagicLinkUrl;

      // Send magic link email (skips in local dev, sends via SES in prod)
      await sendMagicLinkEmail(email, magicLinkUrl);
      logger.info(`Magic link for ${email}: ${magicLinkUrl}`);

      // Only include magic link in response during development (for auto-verify)
      const response: Record<string, string> = {
        message: 'Magic link sent to your email address.',
      };
      if (env.NODE_ENV === 'development') {
        response.magicLink = magicLinkUrl;
      }

      return c.json(response);
    } catch (error) {
      logger.error('Magic link request error:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
      });
      return c.json({ error: 'Failed to send magic link' }, 500);
    }
  }
);

// Verify magic link endpoint
auth.post(
  '/magic-link/verify',
  zValidator('json', magicLinkVerifySchema),
  async (c) => {
    try {
      const { token } = c.req.valid('json');

      // Verify magic link token
      const { email } = AuthService.verifyMagicLinkToken(token);

      // Find user by email
      let user = await UserService.findByEmail(email);
      const isNewUser = !user;

      // If user doesn't exist, create a new account
      if (!user) {
        logger.info(`Creating new user account via magic link: ${email}`);

        // Create user with minimal data (no password required)
        user = await UserService.createUser({
          email,
          password: '', // Empty password for magic link users
          firstName: '', // Will be filled later in profile
          lastName: '', // Will be filled later in profile
          skipPasswordHash: true, // Skip password hashing for magic link users
        });

        // Auto-assign admin role for allowed domains
        const ADMIN_DOMAINS = ['atlaes.de', 'alibuas.com'];
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (emailDomain && ADMIN_DOMAINS.includes(emailDomain)) {
          await db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.id, user.id));
          user = { ...user, role: 'admin' };
          logger.info(`Auto-assigned admin role to ${email}`);
        }

        logger.info(`New user created via magic link: ${user.email}`);
      }

      // Generate authentication tokens
      const authTokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role || 'user',
      });

      // Migrate any pending GPR session to application
      let gprApplication = null;
      try {
        gprApplication = await GPRApplicationService.migrateToApplication(email, user.id);
        if (gprApplication) {
          logger.info(`GPR session migrated to application ${gprApplication.id} for user ${user.id}`);
        }
      } catch (migrationError) {
        logger.error('Failed to migrate GPR session:', migrationError);
        // Don't fail the login if migration fails
      }

      logger.info(`User logged in via magic link: ${user.email}`);

      return c.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          profile: user.profile,
        },
        tokens: authTokens,
        isNewUser: isNewUser || !user.profile?.firstName,
        gprApplication, // Include the migrated application if available
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired magic link') {
        return c.json({ error: 'Invalid or expired magic link' }, 400);
      }
      logger.error('Magic link verification error:', error);
      return c.json({ error: 'Account creation failed. Please try again.' }, 500);
    }
  }
);

// Google OAuth: Get authorization URL
auth.get('/google/authorize', async (c) => {
  try {
    if (!googleClient) {
      return c.json({ error: 'Google OAuth not configured' }, 500);
    }

    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent',
    });

    return c.json({ authUrl });
  } catch (error) {
    logger.error('Google OAuth authorization error:', error);
    return c.json({ error: 'Failed to generate authorization URL' }, 500);
  }
});

// Google OAuth: Verify token and create/login user
auth.post(
  '/google/verify',
  zValidator('json', z.object({ code: z.string() })),
  async (c) => {
    try {
      if (!googleClient) {
        return c.json({ error: 'Google OAuth not configured' }, 500);
      }

      const { code } = c.req.valid('json');

      // Exchange code for tokens
      const { tokens } = await googleClient.getToken(code);
      googleClient.setCredentials(tokens);

      // Get user info from Google
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: env.GOOGLE_CLIENT_ID!,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return c.json({ error: 'Invalid token payload' }, 400);
      }

      const email = payload.email;
      const googleId = payload.sub;
      const firstName = payload.given_name || '';
      const lastName = payload.family_name || '';
      const emailVerified = payload.email_verified || false;

      if (!email) {
        return c.json({ error: 'Email not provided by Google' }, 400);
      }

      // Find or create user
      const user = await UserService.findOrCreateOAuthUser({
        email,
        authProvider: 'google',
        authProviderId: googleId,
        firstName,
        lastName,
        emailVerified,
      });

      // Generate authentication tokens
      const authTokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role || 'user',
      });

      logger.info(`User logged in via Google OAuth: ${user.email}`);

      return c.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          profile: user.profile,
        },
        tokens: authTokens,
        isNewUser: !user.profile?.firstName, // Indicate if this is a new user
      });
    } catch (error) {
      logger.error('Google OAuth verification error:', error);
      return c.json({ error: 'Google authentication failed' }, 400);
    }
  }
);

// Google OAuth: Verify ID token directly (for client-side flow)
auth.post(
  '/google/verify-id-token',
  zValidator('json', z.object({ idToken: z.string() })),
  async (c) => {
    try {
      if (!googleClient) {
        return c.json({ error: 'Google OAuth not configured' }, 500);
      }

      const { idToken } = c.req.valid('json');

      // Verify the ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID!,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return c.json({ error: 'Invalid token payload' }, 400);
      }

      const email = payload.email;
      const googleId = payload.sub;
      const firstName = payload.given_name || '';
      const lastName = payload.family_name || '';
      const emailVerified = payload.email_verified || false;

      if (!email) {
        return c.json({ error: 'Email not provided by Google' }, 400);
      }

      // Find or create user
      const user = await UserService.findOrCreateOAuthUser({
        email,
        authProvider: 'google',
        authProviderId: googleId,
        firstName,
        lastName,
        emailVerified,
      });

      // Generate authentication tokens
      const authTokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role || 'user',
      });

      logger.info(`User logged in via Google OAuth: ${user.email}`);

      return c.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          profile: user.profile,
        },
        tokens: authTokens,
        isNewUser: !user.profile?.firstName, // Indicate if this is a new user
      });
    } catch (error) {
      logger.error('Google OAuth ID token verification error:', error);
      return c.json({ error: 'Google authentication failed' }, 400);
    }
  }
);

// ============================================
// Apple Sign-In Routes
// ============================================

// Apple Sign-In configuration check
const isAppleConfigured = !!(
  env.APPLE_CLIENT_ID &&
  env.APPLE_TEAM_ID &&
  env.APPLE_KEY_ID &&
  env.APPLE_PRIVATE_KEY
);

// Apple Sign-In: Verify ID token
auth.post(
  '/apple/verify',
  zValidator(
    'json',
    z.object({
      idToken: z.string(),
      user: z
        .object({
          email: z.string().email().optional(),
          name: z
            .object({
              firstName: z.string().optional(),
              lastName: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
  ),
  async (c) => {
    try {
      if (!isAppleConfigured) {
        return c.json(
          {
            error: 'Apple Sign-In not configured',
            hint: 'Set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY',
          },
          500
        );
      }

      const { idToken, user: appleUserData } = c.req.valid('json');

      // Decode the JWT to extract claims (Apple ID tokens are JWTs)
      // In production, you should verify the token with Apple's public keys
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        return c.json({ error: 'Invalid token format' }, 400);
      }

      // Decode payload (base64url)
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64url').toString('utf8')
      );

      // Verify issuer and audience
      if (payload.iss !== 'https://appleid.apple.com') {
        return c.json({ error: 'Invalid token issuer' }, 400);
      }

      if (payload.aud !== env.APPLE_CLIENT_ID) {
        return c.json({ error: 'Invalid token audience' }, 400);
      }

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return c.json({ error: 'Token expired' }, 400);
      }

      const email = payload.email || appleUserData?.email;
      const appleId = payload.sub;

      if (!email) {
        return c.json({ error: 'Email not provided by Apple' }, 400);
      }

      // Apple only sends user info on first sign-in, so we use it if available
      const firstName = appleUserData?.name?.firstName || '';
      const lastName = appleUserData?.name?.lastName || '';

      // Find or create user
      const user = await UserService.findOrCreateOAuthUser({
        email,
        authProvider: 'apple',
        authProviderId: appleId,
        firstName,
        lastName,
        emailVerified: true, // Apple verifies email
      });

      // Generate authentication tokens
      const authTokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role || 'user',
      });

      logger.info(`User logged in via Apple Sign-In: ${user.email}`);

      return c.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          profile: user.profile,
        },
        tokens: authTokens,
        isNewUser: !user.profile?.firstName,
      });
    } catch (error) {
      logger.error('Apple Sign-In verification error:', error);
      return c.json({ error: 'Apple authentication failed' }, 400);
    }
  }
);

// Apple Sign-In: Check if configured
auth.get('/apple/config', async (c) => {
  return c.json({
    configured: isAppleConfigured,
    clientId: isAppleConfigured ? env.APPLE_CLIENT_ID : undefined,
  });
});

export default auth;
