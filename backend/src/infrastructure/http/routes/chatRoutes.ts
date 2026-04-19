import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/unread', requireAuth, ChatController.getUnreadCounts);
router.get('/:friendId', requireAuth, ChatController.getConversation);
router.post('/:friendId', requireAuth, ChatController.sendMessage);
router.patch('/:friendId/read', requireAuth, ChatController.markAsRead);

export default router;
