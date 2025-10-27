import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import {
  AuthService,
  registrationSchema,
  loginSchema,
  passwordChangeSchema,
} from '../utils/auth';
import { UserService } from '../services/user';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono();

// Simple JWT test endpoint
auth.get('/test-jwt', async (c) => {
  try {
    logger.info('Testing JWT generation...');
    logger.info('JWT_SECRET from process.env:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    logger.info('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ test: 'data' }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    return c.json({
      success: true,
      tokenGenerated: !!testToken,
      tokenLength: testToken ? testToken.length : 0
    });
  } catch (error) {
    logger.error('JWT test error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Simplified registration endpoint
auth.post('/simple-register', zValidator('json', registrationSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    logger.info('Starting simple registration...');

    // Step 1: Check email exists
    logger.info('Step 1: Checking email exists...');
    const emailExists = await UserService.emailExists(data.email);
    if (emailExists) {
      return c.json({ error: 'Email already registered' }, 400);
    }
    logger.info('Step 1: Email check passed');

    // Step 2: Hash password
    logger.info('Step 2: Hashing password...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password, 12);
    logger.info('Step 2: Password hashed successfully');

    // Step 3: Generate tokens directly
    logger.info('Step 3: Generating tokens...');
    const jwt = require('jsonwebtoken');
    const accessToken = jwt.sign(
      { userId: 'test-id', email: data.email, emailVerified: false },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: 'test-id', email: data.email, emailVerified: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    logger.info('Step 3: Tokens generated successfully');

    return c.json({
      message: 'Simple registration test completed',
      steps: {
        emailCheck: 'PASSED',
        passwordHashing: 'PASSED',
        tokenGeneration: 'PASSED'
      },
      tokens: { accessToken, refreshToken }
    });

  } catch (error) {
    logger.error('Simple registration error:', error);
    return c.json({ 
      error: 'Simple registration failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Debug endpoint to test registration components
auth.post(
  '/debug-register',
  zValidator('json', registrationSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');

      // Test 1: Check email exists
      logger.info('Testing email existence check...');
      const emailExists = await UserService.emailExists(data.email);
      logger.info(`Email exists: ${emailExists}`);

      if (emailExists) {
        return c.json(
          { error: 'Email already registered', step: 'email-check' },
          400
        );
      }

      // Test 2: Test password hashing
      logger.info('Testing password hashing...');
      const hashedPassword = await AuthService.hashPassword(data.password);
      logger.info(
        `Password hashed successfully: ${hashedPassword ? 'YES' : 'NO'}`
      );

      // Test 3: Test environment variables
      logger.info('Testing environment variables...');
      logger.info(
        'JWT_SECRET from process.env:',
        process.env.JWT_SECRET ? 'SET' : 'NOT SET'
      );
      logger.info(
        'JWT_SECRET length:',
        process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
      );

      // Test 4: Test token generation
      logger.info('Testing token generation...');
      const testTokens = AuthService.generateTokens({
        userId: 'test-user-id',
        email: data.email,
        emailVerified: false,
      });
      logger.info(`Tokens generated: ${testTokens ? 'YES' : 'NO'}`);

      return c.json({
        message: 'Debug test completed',
        steps: {
          emailCheck: 'PASSED',
          passwordHashing: hashedPassword ? 'PASSED' : 'FAILED',
          tokenGeneration: testTokens ? 'PASSED' : 'FAILED',
        },
      });
    } catch (error) {
      logger.error('Debug registration error:', error);
      return c.json(
        {
          error: 'Debug test failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          step: 'debug-test',
        },
        500
      );
    }
  }
);

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
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
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
auth.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json({ error: 'Refresh token required' }, 400);
    }

    // Generate new access token
    const newAccessToken = AuthService.refreshAccessToken(refreshToken);

    logger.info('Token refreshed successfully');

    return c.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return c.json({ error: 'Token refresh failed' }, 401);
  }
});

// Logout endpoint (client-side token removal)
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    logger.info(`User logged out: ${user.email}`);

    return c.json({
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// Get current user profile
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const userData = await UserService.findById(user.id);

    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      user: {
        id: userData.id,
        email: userData.email,
        emailVerified: userData.emailVerified,
        profile: userData.profile,
      },
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    return c.json({ error: 'Failed to get user profile' }, 500);
  }
});

// Update user profile
auth.put(
  '/profile',
  authMiddleware,
  zValidator(
    'json',
    z.object({
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      dateOfBirth: z.string().optional(),
      nationality: z.string().length(2).optional(),
      phone: z.string().max(20).optional(),
      addressLine1: z.string().max(255).optional(),
      addressLine2: z.string().max(255).optional(),
      city: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
    })
  ),
  async (c) => {
    try {
      const user = c.get('user');
      const profileData = c.req.valid('json');

      const updatedUser = await UserService.updateProfile(user.id, profileData);

      return c.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          profile: updatedUser.profile,
        },
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      return c.json({ error: 'Failed to update profile' }, 500);
    }
  }
);

// Change password endpoint
auth.post(
  '/change-password',
  authMiddleware,
  zValidator('json', passwordChangeSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { currentPassword, newPassword } = c.req.valid('json');

      await UserService.changePassword(user.id, currentPassword, newPassword);

      return c.json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Password change error:', error);

      if (
        error instanceof Error &&
        error.message === 'Current password is incorrect'
      ) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }

      return c.json({ error: 'Failed to change password' }, 500);
    }
  }
);

// Verify email endpoint
auth.post('/verify-email', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    await UserService.verifyEmail(user.id);

    return c.json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    return c.json({ error: 'Failed to verify email' }, 500);
  }
});

export default auth;
