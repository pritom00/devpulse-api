import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';

// ─── GET /api/admin/metrics ───────────────────────────────────────────────────
// Access: maintainer only (enforced at router level via authorize())

export async function getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Total issues count
    const totalIssuesResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM issues',
    );

    // Issues grouped by status
    const byStatusResult = await pool.query<{ status: string; count: string }>(
      'SELECT status, COUNT(*) as count FROM issues GROUP BY status',
    );

    // Issues grouped by type
    const byTypeResult = await pool.query<{ type: string; count: string }>(
      'SELECT type, COUNT(*) as count FROM issues GROUP BY type',
    );

    // Total users count
    const totalUsersResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users',
    );

    // Users grouped by role
    const byRoleResult = await pool.query<{ role: string; count: string }>(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role',
    );

    // Most recent 5 issues
    const recentIssuesResult = await pool.query<{
      id: number;
      title: string;
      status: string;
      type: string;
      created_at: Date;
    }>(
      'SELECT id, title, status, type, created_at FROM issues ORDER BY created_at DESC LIMIT 5',
    );

    // Shape the response into a clean metrics object
    const statusCounts = byStatusResult.rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    const typeCounts = byTypeResult.rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = parseInt(row.count, 10);
      return acc;
    }, {});

    const roleCounts = byRoleResult.rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = parseInt(row.count, 10);
      return acc;
    }, {});

    const metrics = {
      issues: {
        total: parseInt(totalIssuesResult.rows[0].count, 10),
        by_status: {
          open:        statusCounts['open']        ?? 0,
          in_progress: statusCounts['in_progress'] ?? 0,
          resolved:    statusCounts['resolved']    ?? 0,
        },
        by_type: {
          bug:             typeCounts['bug']             ?? 0,
          feature_request: typeCounts['feature_request'] ?? 0,
        },
        recent: recentIssuesResult.rows,
      },
      users: {
        total: parseInt(totalUsersResult.rows[0].count, 10),
        by_role: {
          contributor: roleCounts['contributor'] ?? 0,
          maintainer:  roleCounts['maintainer']  ?? 0,
        },
      },
      generated_at: new Date().toISOString(),
    };

    sendSuccess(res, StatusCodes.OK, 'Metrics retrieved successfully', metrics);
  } catch (error) {
    next(error);
  }
}
