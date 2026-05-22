import pool from '../config/database';
import { User, Issue, SafeUser } from './types';

// ─── User queries ─────────────────────────────────────────────────────────────

/** Find a user by email (includes password for auth comparison) */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] ?? null;
}

/** Find a user by id (no password) */
export async function findUserById(id: number): Promise<SafeUser | null> {
  const result = await pool.query<SafeUser>(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

/** Fetch minimal reporter info needed for issue responses */
export async function findReporterInfo(
  id: number,
): Promise<{ id: number; name: string; role: string } | null> {
  const result = await pool.query<{ id: number; name: string; role: string }>(
    'SELECT id, name, role FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

/**
 * Batch-fetch reporter info for multiple reporter ids.
 * Returns a map of id → reporter info for O(1) lookup.
 */
export async function findReportersByIds(
  ids: number[],
): Promise<Map<number, { id: number; name: string; role: string }>> {
  if (ids.length === 0) return new Map();

  // Build $1,$2,... placeholders
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query<{ id: number; name: string; role: string }>(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    ids,
  );

  const map = new Map<number, { id: number; name: string; role: string }>();
  for (const row of result.rows) {
    map.set(row.id, row);
  }
  return map;
}

/** Insert a new user, returns the safe (no-password) record */
export async function insertUser(params: {
  name: string;
  email: string;
  hashedPassword: string;
  role: string;
}): Promise<SafeUser> {
  const result = await pool.query<SafeUser>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [params.name, params.email, params.hashedPassword, params.role],
  );
  return result.rows[0];
}

// ─── Issue queries ────────────────────────────────────────────────────────────

/** Find an issue by id */
export async function findIssueById(id: number): Promise<Issue | null> {
  const result = await pool.query<Issue>(
    'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

/** Insert a new issue, returns the full record */
export async function insertIssue(params: {
  title: string;
  description: string;
  type: string;
  reporterId: number;
}): Promise<Issue> {
  const result = await pool.query<Issue>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
    [params.title, params.description, params.type, params.reporterId],
  );
  return result.rows[0];
}

/** Dynamically build and run an UPDATE issues query from a partial patch object */
export async function patchIssue(
  id: number,
  fields: Partial<{ title: string; description: string; type: string; status: string }>,
): Promise<Issue | null> {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return findIssueById(id);

  // Build "title = $1, description = $2, ..." assignments
  const assignments = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);

  // updated_at refreshed on every update, id is the last param
  const result = await pool.query<Issue>(
    `UPDATE issues
     SET ${assignments}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
     RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
    [...values, id],
  );
  return result.rows[0] ?? null;
}

/** Delete an issue by id. Returns true if a row was deleted. */
export async function deleteIssueById(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM issues WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
