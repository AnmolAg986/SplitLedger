import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { requireAdmin } from '../middleware/adminAuthMiddleware';

const router = Router();

// Publicly accessible but only accepts the correct password
router.post('/login', AdminController.login);

// Guard everything else behind requireAdmin
router.use(requireAdmin);

router.get('/users', AdminController.getUsers);
router.patch('/users/:id/status', AdminController.toggleUserStatus);
router.get('/groups/:id', AdminController.getGroup);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/stats', AdminController.getStats);
router.post('/cron/trigger', AdminController.triggerCron);

export default router;
