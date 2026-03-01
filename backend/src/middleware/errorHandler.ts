import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import logger from '../config/logger';
import { env } from '../config/env';

/**
 * Global error handler middleware — must be registered last
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  if (err instanceof AppError && err.statusCode < 500) {
    logger.warn(`${err.statusCode} ${err.message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  } else {
    logger.error(err.message, {
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  }

  // App-level error (known)
  if (err instanceof AppError) {
    const response: any = {
      success: false,
      message: err.message,
    };

    if (err instanceof ValidationError && err.details) {
      response.errors = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Prisma known request errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    switch (prismaErr.code) {
      case 'P2002': {
        const target = prismaErr.meta?.target;
        res.status(409).json({
          success: false,
          message: `A record with this ${Array.isArray(target) ? target.join(', ') : 'value'} already exists`,
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          success: false,
          message: 'Record not found',
        });
        return;
      case 'P2003':
        res.status(400).json({
          success: false,
          message: 'Related record not found — invalid foreign key',
        });
        return;
      default:
        break;
    }
  }

  // Unexpected error — hide details in production
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error';

  res.status(500).json({
    success: false,
    message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
