import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { getMetrics } from './admin.controller';

const router = Router();

// All admin routes require authentication + maintainer role
router.get('/metrics', authenticate, authorize('maintainer'), getMetrics);

export default router;
