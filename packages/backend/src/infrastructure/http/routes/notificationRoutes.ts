import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// --- Core Notifications ---
router.get('/', requireAuth, NotificationController.getNotifications);
router.get('/unread-count', requireAuth, NotificationController.getUnreadCount);
router.patch('/read-all', requireAuth, NotificationController.markAllAsRead);
router.patch('/:id/read', requireAuth, NotificationController.markAsRead);
router.delete('/:id', requireAuth, NotificationController.deleteNotification);

// --- Push Subscriptions ---
router.post('/push/subscribe', requireAuth, NotificationController.subscribePush);
router.post('/push/unsubscribe', requireAuth, NotificationController.unsubscribePush);

// --- Preferences ---
router.get('/preferences', requireAuth, NotificationController.getPreferences);
router.patch('/preferences', requireAuth, NotificationController.updatePreferences);

export default router;
