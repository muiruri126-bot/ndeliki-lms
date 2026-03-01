import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { BCRYPT_SALT_ROUNDS, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from '../../config/constants';
import { generateTokens, revokeAllUserTokens, verifyRefreshToken } from '../../middleware/authenticate';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../../utils/errors';
import logger from '../../config/logger';
import type { LoginInput, RegisterInput, ChangePasswordInput } from './auth.schemas';

export class AuthService {
  /**
   * Authenticate user with email/password
   */
  async login(input: LoginInput, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Contact administrator.');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      throw new UnauthorizedError(
        `Account is locked. Try again in ${minutesLeft} minute(s).`
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(input.password, user.password);

    if (!passwordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
        updateData.lockedUntil = lockedUntil;
        logger.warn(`Account locked for user ${user.email} after ${failedAttempts} failed attempts`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Successful login — reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip || null,
      },
    });

    // Build roles & permissions
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(user.userRoles.flatMap((ur) => {
        try { return JSON.parse(ur.role.permissions as string) as string[]; }
        catch { return []; }
      }))
    );

    // Generate tokens
    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      roles,
      permissions,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        ipAddress: ip,
        userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roles,
        permissions,
      },
      ...tokens,
    };
  }

  /**
   * Register a new user (self-registration defaults to BORROWER role)
   */
  async register(input: RegisterInput) {
    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    // Get borrower role
    const borrowerRole = await prisma.role.findUnique({
      where: { name: 'BORROWER' },
    });

    if (!borrowerRole) {
      throw new BadRequestError('System configuration error — borrower role not found');
    }

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        password: hashedPassword,
        userRoles: {
          create: { roleId: borrowerRole.id },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(user.userRoles.flatMap((ur) => {
        try { return JSON.parse(ur.role.permissions as string) as string[]; }
        catch { return []; }
      }))
    );

    const tokens = await generateTokens({
      id: user.id,
      email: user.email,
      roles,
      permissions,
    });

    logger.info(`New user registered: ${user.email}`);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roles,
        permissions,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(token: string) {
    const decoded = await verifyRefreshToken(token);

    // Revoke the old refresh token (rotate)
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(user.userRoles.flatMap((ur) => {
        try { return JSON.parse(ur.role.permissions as string) as string[]; }
        catch { return []; }
      }))
    );

    return generateTokens({
      id: user.id,
      email: user.email,
      roles,
      permissions,
    });
  }

  /**
   * Logout — revoke refresh token
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revokedAt: new Date() },
      });
    } else {
      await revokeAllUserTokens(userId);
    }

    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
        userId,
      },
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const valid = await bcrypt.compare(input.currentPassword, user.password);
    if (!valid) throw new BadRequestError('Current password is incorrect');

    const hashed = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });

    // Revoke all existing sessions
    await revokeAllUserTokens(userId);

    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        userId,
      },
    });

    logger.info(`Password changed for user ${userId}`);
  }

  /**
   * Send password reset email (generates token)
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) return;

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: Send email with reset link
    logger.info(`Password reset token generated for ${email}: ${token}`);
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string) {
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed, failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Revoke all sessions
    await revokeAllUserTokens(resetToken.userId);

    logger.info(`Password reset completed for user ${resetToken.userId}`);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: { role: { select: { name: true, permissions: true } } },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions: Array.from(
        new Set(user.userRoles.flatMap((ur) => {
          try { return JSON.parse(ur.role.permissions as string) as string[]; }
          catch { return []; }
        }))
      ),
      userRoles: undefined,
    };
  }
}

export const authService = new AuthService();
