import { DestinationValidationError } from '../security/ssrfValidator.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // If headers have already been sent, delegate to standard Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Destination validation error (SSRF prevention)
  if (err instanceof DestinationValidationError) {
    return res.status(403).json({
      success: false,
      error: {
        code: err.code || 'FORBIDDEN_DESTINATION',
        message: err.message
      }
    });
  }

  // Zod input validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters or request payload',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }

  // Custom application error with code and status
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'CLIENT_ERROR',
        message: err.message,
        details: err.details || []
      }
    });
  }

  // Server internal error
  console.error('[Unhandled Server Error]:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred while processing the request.'
    }
  });
}
