import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ERROR_CODES } from '@deadwood/shared';

/**
 * Create validation middleware for request body
 */
export function validate(schema: ZodSchema): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: ERROR_CODES.INVALID_PARAMS,
          message: result.error.errors[0]?.message || 'Validation failed',
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
