import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import jwtConfig from '../config/jwt';
import { JwtPayload, UserRole } from '../utils/types';
import { sendError } from '../utils/response';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: verifies the JWT in the Authorization header.
 * Per spec the header value is the raw token: Authorization: <JWT_TOKEN>
 * On success, attaches decoded payload to req.user and calls next().
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Authorization token is required');
    return;
  }

  // Header format per spec: "Authorization: <JWT_TOKEN>" (no "Bearer " prefix)
  const token = authHeader.trim();

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Token has expired');
    } else {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid token');
    }
  }
}

/**
 * Middleware factory: rejects requests where req.user.role is not in the allowed list.
 * Must be composed AFTER authenticate().
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Authentication required');
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, StatusCodes.FORBIDDEN, 'Insufficient permissions');
      return;
    }
    next();
  };
}
