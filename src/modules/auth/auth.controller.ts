import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import jwtConfig from '../../config/jwt';
import { sendSuccess, sendError } from '../../utils/response';
import { validateSignup, validateLogin } from '../../utils/validators';
import { findUserByEmail, insertUser } from '../../utils/queries';
import { SignupBody, LoginBody, UserRole } from '../../utils/types';

const SALT_ROUNDS = 10; // bcrypt salt rounds — between 8 and 12 per spec

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Validate incoming body
  const { valid, errors } = validateSignup(req.body);
  if (!valid) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
    return;
  }

  const { name, email, password, role = 'contributor' } = req.body as SignupBody;

  try {
    // 2. Check for duplicate email — 409 Conflict per HTTP semantics
    const existing = await findUserByEmail(email);
    if (existing) {
      sendError(res, StatusCodes.CONFLICT, 'Email is already registered');
      return;
    }

    // 3. Hash password — never store plain-text
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Persist new user
    const user = await insertUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      hashedPassword,
      role: role as UserRole,
    });

    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', user);
  } catch (error) {
    // Pass to global error handler — Express 4 doesn't auto-catch async throws
    next(error);
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  // 1. Validate incoming body
  const { valid, errors } = validateLogin(req.body);
  if (!valid) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
    return;
  }

  const { email, password } = req.body as LoginBody;

  try {
    // 2. Look up user (includes password hash for comparison)
    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      // Generic message — don't reveal whether email exists
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password');
      return;
    }

    // 3. Constant-time password comparison via bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password');
      return;
    }

    // 4. Sign JWT — embed id, name, role (used by downstream middleware)
    const payload = { id: user.id, name: user.name, role: user.role };
    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as jwt.SignOptions['expiresIn'],
    });

    // 5. Return token + safe user object (no password field)
    const { password: _omit, ...safeUser } = user;
    sendSuccess(res, StatusCodes.OK, 'Login successful', { token, user: safeUser });
  } catch (error) {
    next(error);
  }
}
