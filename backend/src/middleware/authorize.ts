import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Check if the user has at least one of the specified roles
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasRole = req.user.roles.some((role) => roles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError('Insufficient role permissions'));
    }

    next();
  };
}

/**
 * Check if the user has at least one of the specified permissions
 */
export function requirePermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasPermission = req.user.permissions.some((perm) =>
      permissions.includes(perm)
    );

    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Ensure the user can only access their own resources, unless they are admin/officer
 */
export function requireOwnerOrRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Users with privileged roles can access any resource
    const hasPrivilege = req.user.roles.some((role) =>
      allowedRoles.includes(role)
    );

    if (hasPrivilege) {
      return next();
    }

    // Otherwise, the user can only access their own resource
    const resourceUserId = req.params.userId || req.params.id;
    if (resourceUserId && resourceUserId === req.user.id) {
      return next();
    }

    return next(new ForbiddenError('Access denied to this resource'));
  };
}

/**
 * Restrict borrowers to only see their own data by injecting a filter
 * Sets req.dataFilter with appropriate Prisma where conditions
 */
export function applyDataIsolation(entityField: string = 'id') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admin and officers see everything
    const privilegedRoles = ['SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'];
    const isPrivileged = req.user.roles.some((role) =>
      privilegedRoles.includes(role)
    );

    if (isPrivileged) {
      (req as any).dataFilter = {};
      return next();
    }

    // Borrowers can only see their own data
    (req as any).dataFilter = { [entityField]: req.user.id };
    next();
  };
}
