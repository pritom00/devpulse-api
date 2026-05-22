import { Router } from 'express';
import { signup, login } from './auth.controller';

const router = Router();

// Public routes — no JWT required
router.post('/signup', signup);
router.post('/login', login);

export default router;
