import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { UnauthorizedError } from '../utils/errors';
import logger from '../config/logger';

/**
 * Verify JWT access token and attach user to request
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid access token'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication — attaches user if token is present but doesn't fail without it
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };

    next();
  } catch {
    // Token is invalid but optional, so continue without user
    next();
  }
}

/**
 * Verify that a refresh token is valid and not revoked
 */
export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

    // Check if token is in database and not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token,
        userId: decoded.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token revoked or expired');
    }

    return decoded;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid refresh token');
  }
}

/**
 * Generate access and refresh token pair
 */
export async function generateTokens(user: {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}): Promise<{ accessToken: string; refreshToken: string }> {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    id: user.id,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, roles: user.roles, permissions: user.permissions },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY as any }
  );

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  logger.info(`Revoked all refresh tokens for user ${userId}`);
}
