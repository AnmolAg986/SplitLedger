import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/:id/presence', requireAuth, UserController.getPresence);

export default router;
