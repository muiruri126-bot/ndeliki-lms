import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

/**
 * Validate request body, query, or params against a Zod schema
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      // Replace with parsed (and transformed) data
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate multiple sources at once
 */
export function validateAll(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const allErrors: { field: string; message: string }[] = [];

      for (const [source, schema] of Object.entries(schemas)) {
        if (schema) {
          try {
            const data = schema.parse((req as any)[source]);
            (req as any)[source] = data;
          } catch (error) {
            if (error instanceof ZodError) {
              error.errors.forEach((e) => {
                allErrors.push({
                  field: `${source}.${e.path.join('.')}`,
                  message: e.message,
                });
              });
            }
          }
        }
      }

      if (allErrors.length > 0) {
        return next(new ValidationError('Validation failed', allErrors));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
