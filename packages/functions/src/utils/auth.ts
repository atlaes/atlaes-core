import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

// Registration schema
export const registrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().optional(),
  nationality: z.string().length(2).optional(),
  phone: z.string().max(20).optional(),
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      logger.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification error:', error);
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate JWT tokens for a user
   */
  static generateTokens(
    payload: Omit<TokenPayload, 'iat' | 'exp'>
  ): AuthTokens {
    try {
      logger.info('Starting token generation...');
      logger.info('JWT_SECRET available:', !!process.env.JWT_SECRET);
      logger.info(
        'JWT_SECRET length:',
        process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
      );

      const accessTokenPayload = {
        ...payload,
      };

      const refreshTokenPayload = {
        ...payload,
      };

      logger.info('Generating access token...');
      const accessToken = jwt.sign(
        accessTokenPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: this.ACCESS_TOKEN_EXPIRY,
        }
      );

      logger.info('Generating refresh token...');
      const refreshToken = jwt.sign(
        refreshTokenPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: this.REFRESH_TOKEN_EXPIRY,
        }
      );

      logger.info('Tokens generated successfully');
      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Token generation error:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      logger.error('Token verification error:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate a new access token from a refresh token
   */
  static refreshAccessToken(refreshToken: string): string {
    try {
      const payload = this.verifyToken(refreshToken);

      const newAccessTokenPayload: TokenPayload = {
        userId: payload.userId,
        email: payload.email,
        emailVerified: payload.emailVerified,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
      };

      return jwt.sign(newAccessTokenPayload, env.JWT_SECRET, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    try {
      passwordSchema.parse(password);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, errors: error.errors.map((e) => e.message) };
      }
      return { isValid: false, errors: ['Invalid password'] };
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; errors: string[] } {
    try {
      emailSchema.parse(email);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, errors: error.errors.map((e) => e.message) };
      }
      return { isValid: false, errors: ['Invalid email'] };
    }
  }

  /**
   * Generate a secure random string for MFA secrets
   */
  static generateMFASecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
