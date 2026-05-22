import { UserRole, IssueType, IssueStatus } from './types';

const VALID_ROLES: UserRole[]      = ['contributor', 'maintainer'];
const VALID_ISSUE_TYPES: IssueType[] = ['bug', 'feature_request'];
const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved'];

// ─── Email ────────────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Enum guards ──────────────────────────────────────────────────────────────

export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export function isValidIssueType(type: string): type is IssueType {
  return VALID_ISSUE_TYPES.includes(type as IssueType);
}

export function isValidIssueStatus(status: string): status is IssueStatus {
  return VALID_STATUSES.includes(status as IssueStatus);
}

// ─── Signup validation ────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSignup(body: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push('name is required');
  }
  if (!body.email || typeof body.email !== 'string') {
    errors.push('email is required');
  } else if (!isValidEmail(body.email)) {
    errors.push('email must be a valid email address');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.push('password is required and must be at least 6 characters');
  }
  if (body.role !== undefined && (typeof body.role !== 'string' || !isValidRole(body.role))) {
    errors.push(`role must be one of: contributor, maintainer`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Login validation ─────────────────────────────────────────────────────────

export function validateLogin(body: { email?: unknown; password?: unknown }): ValidationResult {
  const errors: string[] = [];

  if (!body.email || typeof body.email !== 'string') {
    errors.push('email is required');
  }
  if (!body.password || typeof body.password !== 'string') {
    errors.push('password is required');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Create issue validation ──────────────────────────────────────────────────

export function validateCreateIssue(body: {
  title?: unknown;
  description?: unknown;
  type?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    errors.push('title is required');
  } else if (body.title.length > 150) {
    errors.push('title must not exceed 150 characters');
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
    errors.push('description is required');
  } else if (body.description.trim().length < 20) {
    errors.push('description must be at least 20 characters');
  }

  if (!body.type || typeof body.type !== 'string') {
    errors.push('type is required');
  } else if (!isValidIssueType(body.type)) {
    errors.push('type must be one of: bug, feature_request');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Update issue validation ──────────────────────────────────────────────────

export function validateUpdateIssue(body: {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  status?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (Object.keys(body).length === 0) {
    errors.push('at least one field (title, description, type, status) must be provided');
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      errors.push('title must be a non-empty string');
    } else if (body.title.length > 150) {
      errors.push('title must not exceed 150 characters');
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim() === '') {
      errors.push('description must be a non-empty string');
    } else if (body.description.trim().length < 20) {
      errors.push('description must be at least 20 characters');
    }
  }

  if (body.type !== undefined) {
    if (typeof body.type !== 'string' || !isValidIssueType(body.type)) {
      errors.push('type must be one of: bug, feature_request');
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !isValidIssueStatus(body.status)) {
      errors.push('status must be one of: open, in_progress, resolved');
    }
  }

  return { valid: errors.length === 0, errors };
}
