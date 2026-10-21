import { ZodError } from 'zod';

/**
 * Express middleware helper to validate request body with a Zod schema.
 * Returns consistent error shape: { error: { code: 'VALIDATION_ERROR', message: string, details?: any } }
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const field = firstIssue?.path?.join('.') || 'body';
        const message = `${field ? `${field}: ` : ''}${firstIssue?.message || 'Invalid input'}`;
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: err.issues
          }
        });
      }
      next(err);
    }
  };
}

/**
 * Express middleware helper to validate request query parameters with a Zod schema.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const field = firstIssue?.path?.join('.') || 'query';
        const message = `${field ? `${field}: ` : ''}${firstIssue?.message || 'Invalid query parameter'}`;
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: err.issues
          }
        });
      }
      next(err);
    }
  };
}

/**
 * Express middleware helper to validate request route params.
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const field = firstIssue?.path?.join('.') || 'param';
        const message = `${field ? `${field}: ` : ''}${firstIssue?.message || 'Invalid route parameter'}`;
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: err.issues
          }
        });
      }
      next(err);
    }
  };
}
