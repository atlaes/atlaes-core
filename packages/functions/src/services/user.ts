import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { users, profiles, auditLogs } from '../drizzle/schema/shared';
import { AuthService } from '../utils/auth';
import { logger } from '../utils/logger';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  phone?: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  authProvider: string | null;
  mfaEnabled: boolean;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    nationality: string | null;
    phone: string | null;
  } | null;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export class UserService {
  /**
   * Create a new user with profile
   */
  static async createUser(userData: CreateUserData): Promise<UserWithProfile> {
    try {
      // Hash the password
      const passwordHash = await AuthService.hashPassword(userData.password);

      // Create user and profile in a transaction
      const result = await db.transaction(async (tx: any) => {
        // Create user
        const [newUser] = await tx
          .insert(users)
          .values({
            email: userData.email.toLowerCase(),
            passwordHash,
            authProvider: 'email',
            emailVerified: false,
            mfaEnabled: false,
          })
          .returning();

        // Create profile
        const [newProfile] = await tx
          .insert(profiles)
          .values({
            userId: newUser.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            dateOfBirth: userData.dateOfBirth || null,
            nationality: userData.nationality || null,
            phone: userData.phone || null,
          })
          .returning();

        // Log the user creation
        await tx.insert(auditLogs).values({
          userId: newUser.id,
          action: 'user_created',
          resource: 'user',
          resourceId: newUser.id,
          details: {
            email: newUser.email,
            authProvider: newUser.authProvider,
          },
        });

        return { ...newUser, profile: newProfile };
      });

      logger.info(`User created successfully: ${result.email}`);
      return result;
    } catch (error) {
      logger.error('User creation error:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<UserWithProfile | null> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
          passwordHash: users.passwordHash,
          authProvider: users.authProvider,
          mfaEnabled: users.mfaEnabled,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          profile: {
            id: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            dateOfBirth: profiles.dateOfBirth,
            nationality: profiles.nationality,
            phone: profiles.phone,
          },
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('User lookup error:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId: string): Promise<UserWithProfile | null> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
          authProvider: users.authProvider,
          mfaEnabled: users.mfaEnabled,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          profile: {
            id: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            dateOfBirth: profiles.dateOfBirth,
            nationality: profiles.nationality,
            phone: profiles.phone,
          },
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('User lookup error:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Verify user password
   */
  static async verifyPassword(
    email: string,
    password: string
  ): Promise<UserWithProfile | null> {
    try {
      const user = await this.findByEmail(email);

      if (!user || !user.passwordHash) {
        return null;
      }

      const isValid = await AuthService.verifyPassword(
        password,
        user.passwordHash
      );

      if (!isValid) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Password verification error:', error);
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    profileData: UpdateProfileData
  ): Promise<UserWithProfile> {
    try {
      const result = await db.transaction(async (tx: any) => {
        // Update profile
        const [updatedProfile] = await tx
          .update(profiles)
          .set({
            ...profileData,
            updatedAt: new Date(),
          })
          .where(eq(profiles.userId, userId))
          .returning();

        // Get updated user with profile
        const [user] = await tx
          .select({
            id: users.id,
            email: users.email,
            emailVerified: users.emailVerified,
            authProvider: users.authProvider,
            mfaEnabled: users.mfaEnabled,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            profile: {
              id: profiles.id,
              firstName: profiles.firstName,
              lastName: profiles.lastName,
              dateOfBirth: profiles.dateOfBirth,
              nationality: profiles.nationality,
              phone: profiles.phone,
            },
          })
          .from(users)
          .leftJoin(profiles, eq(profiles.userId, users.id))
          .where(eq(users.id, userId))
          .limit(1);

        // Log the profile update
        await tx.insert(auditLogs).values({
          userId,
          action: 'profile_updated',
          resource: 'profile',
          resourceId: updatedProfile.id,
          details: profileData,
        });

        return user;
      });

      logger.info(`Profile updated for user: ${userId}`);
      return result;
    } catch (error) {
      logger.error('Profile update error:', error);
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.findById(userId);

      if (!user || !user.passwordHash) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthService.verifyPassword(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await AuthService.hashPassword(newPassword);

      // Update password
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        // Log the password change
        await tx.insert(auditLogs).values({
          userId,
          action: 'password_changed',
          resource: 'user',
          resourceId: userId,
          details: {},
        });
      });

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Mark email as verified
   */
  static async verifyEmail(userId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        // Log the email verification
        await tx.insert(auditLogs).values({
          userId,
          action: 'email_verified',
          resource: 'user',
          resourceId: userId,
          details: {},
        });
      });

      logger.info(`Email verified for user: ${userId}`);
    } catch (error) {
      logger.error('Email verification error:', error);
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const result = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      logger.error('Email existence check error:', error);
      throw new Error('Failed to check email existence');
    }
  }
}
