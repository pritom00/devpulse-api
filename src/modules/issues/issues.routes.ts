import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from './issues.controller';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', getAllIssues);
router.get('/:id', getIssueById);

// ─── Authenticated routes (contributor or maintainer) ─────────────────────────
router.post('/', authenticate, createIssue);

// PATCH: authenticate first, then role-based logic is handled inside the controller
// (maintainer can edit anything; contributor can only edit their own open issues)
router.patch('/:id', authenticate, updateIssue);

// ─── Maintainer-only routes ───────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('maintainer'), deleteIssue);

export default router;
