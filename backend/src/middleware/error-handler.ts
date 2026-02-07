import type { ErrorRequestHandler } from 'express';
import { ERROR_CODES } from '../shared/index.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      ok: false,
      error: {
        code: ERROR_CODES.INVALID_PARAMS,
        message: err.errors?.[0]?.message || 'Validation failed',
      },
    });
    return;
  }

  // Handle known API errors
  if (err.code && err.message) {
    res.status(err.status || 400).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    },
  });
};
