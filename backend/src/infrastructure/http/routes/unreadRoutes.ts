import { Router } from 'express';
import { UnreadController } from '../controllers/UnreadController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', requireAuth, UnreadController.getUnreadCounts);
router.post('/read', requireAuth, UnreadController.markAsRead);

export default router;
