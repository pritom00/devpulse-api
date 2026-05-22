import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

/**
 * Catches any error thrown or passed via next(err) throughout the application.
 * Keeps all 500 responses consistent and prevents stack traces leaking to clients.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error('Unhandled error:', err);
  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? err.message : undefined,
  );
}
