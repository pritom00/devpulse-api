import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendSuccess, sendError } from '../../utils/response';
import {
  validateCreateIssue,
  validateUpdateIssue,
  isValidIssueType,
  isValidIssueStatus,
} from '../../utils/validators';
import {
  findIssueById,
  insertIssue,
  patchIssue,
  deleteIssueById,
  findReporterInfo,
  findReportersByIds,
} from '../../utils/queries';
import { CreateIssueBody, UpdateIssueBody, IssueQueryParams, IssueType, IssueStatus } from '../../utils/types';
import pool from '../../config/database';
import { Issue } from '../../utils/types';

// ─── POST /api/issues ─────────────────────────────────────────────────────────

export async function createIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { valid, errors } = validateCreateIssue(req.body);
  if (!valid) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
    return;
  }

  // reporter_id is extracted from the verified JWT — never from the request body
  const reporterId = req.user!.id;
  const { title, description, type } = req.body as CreateIssueBody;

  try {
    const issue = await insertIssue({
      title: title.trim(),
      description: description.trim(),
      type,
      reporterId,
    });
    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', issue);
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/issues ──────────────────────────────────────────────────────────

export async function getAllIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { sort = 'newest', type, status } = req.query as IssueQueryParams;

  // Validate optional filter query params before building SQL
  if (type && !isValidIssueType(type)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid type filter', 'type must be: bug, feature_request');
    return;
  }
  if (status && !isValidIssueStatus(status)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid status filter', 'status must be: open, in_progress, resolved');
    return;
  }

  // Dynamically build WHERE clause — only add conditions for params that were supplied
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (type) {
    conditions.push(`type = $${params.length + 1}`);
    params.push(type);
  }
  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sort === 'oldest' ? 'ASC' : 'DESC'; // default newest first

  try {
    const result = await pool.query<Issue>(
      `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
       FROM issues
       ${where}
       ORDER BY created_at ${order}`,
      params,
    );

    const issues = result.rows;

    if (issues.length === 0) {
      sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', []);
      return;
    }

    // Batch-fetch all reporters in one query — avoids N+1 and no JOINs per spec
    const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
    const reporterMap = await findReportersByIds(reporterIds);

    // Replace reporter_id scalar with embedded reporter object
    const data = issues.map(({ reporter_id, ...issue }) => ({
      ...issue,
      reporter: reporterMap.get(reporter_id) ?? { id: reporter_id, name: 'Unknown', role: 'contributor' },
    }));

    sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', data);
  } catch (error) {
    next(error);
  }
}

// ─── GET /api/issues/:id ──────────────────────────────────────────────────────

export async function getIssueById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue id');
    return;
  }

  try {
    const issue = await findIssueById(id);
    if (!issue) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
      return;
    }

    // Fetch reporter details in a second query (no JOINs per spec)
    const reporter = await findReporterInfo(issue.reporter_id);
    const { reporter_id, ...issueFields } = issue;

    const data = {
      ...issueFields,
      reporter: reporter ?? { id: reporter_id, name: 'Unknown', role: 'contributor' },
    };

    sendSuccess(res, StatusCodes.OK, 'Issue retrieved successfully', data);
  } catch (error) {
    next(error);
  }
}

// ─── PATCH /api/issues/:id ────────────────────────────────────────────────────

export async function updateIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue id');
    return;
  }

  const { valid, errors } = validateUpdateIssue(req.body);
  if (!valid) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
    return;
  }

  try {
    const issue = await findIssueById(id);
    if (!issue) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
      return;
    }

    const { role, id: userId } = req.user!;

    // Access rules:
    //  • maintainer  → can update any issue
    //  • contributor → can only update their own issues, and only when status is 'open'
    if (role === 'contributor') {
      if (issue.reporter_id !== userId) {
        sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues');
        return;
      }
      if (issue.status !== 'open') {
        sendError(res, StatusCodes.CONFLICT, 'Contributors can only edit issues with status: open');
        return;
      }
    }

    const { title, description, type, status } = req.body as UpdateIssueBody;

    // Build a partial update map — only include fields actually provided in the request
    const fieldsToUpdate: Partial<{ title: string; description: string; type: IssueType; status: IssueStatus }> = {};
    if (title !== undefined)       fieldsToUpdate.title       = title.trim();
    if (description !== undefined) fieldsToUpdate.description = description.trim();
    if (type !== undefined)        fieldsToUpdate.type        = type;

    // Only maintainers can change status — contributors cannot touch it
    if (status !== undefined) {
      if (role !== 'maintainer') {
        sendError(res, StatusCodes.FORBIDDEN, 'Only maintainers can change issue status');
        return;
      }
      fieldsToUpdate.status = status;
    }

    // Returns updated row including reporter_id (spec response shape for PATCH)
    const updated = await patchIssue(id, fieldsToUpdate);
    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', updated);
  } catch (error) {
    next(error);
  }
}

// ─── DELETE /api/issues/:id ───────────────────────────────────────────────────
// Role guard (maintainer only) is enforced at the router level via authorize()

export async function deleteIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue id');
    return;
  }

  try {
    const issue = await findIssueById(id);
    if (!issue) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
      return;
    }

    await deleteIssueById(id);
    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (error) {
    next(error);
  }
}
