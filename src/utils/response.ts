import { Response } from 'express';

/**
 * Send a standardised success response.
 *
 * @param res     - Express Response object
 * @param status  - HTTP status code
 * @param message - Human-readable description
 * @param data    - Optional payload
 */
export function sendSuccess(
  res: Response,
  status: number,
  message: string,
  data?: unknown,
): void {
  const body: { success: true; message: string; data?: unknown } = {
    success: true,
    message,
  };
  if (data !== undefined) body.data = data;
  res.status(status).json(body);
}

/**
 * Send a standardised error response.
 *
 * @param res     - Express Response object
 * @param status  - HTTP status code
 * @param message - Human-readable description
 * @param errors  - Optional error details (string or object)
 */
export function sendError(
  res: Response,
  status: number,
  message: string,
  errors?: unknown,
): void {
  const body: { success: false; message: string; errors?: unknown } = {
    success: false,
    message,
  };
  if (errors !== undefined) body.errors = errors;
  res.status(status).json(body);
}
