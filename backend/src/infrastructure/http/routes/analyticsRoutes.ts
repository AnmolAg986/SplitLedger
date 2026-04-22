import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/personal', requireAuth, AnalyticsController.getPersonalAnalytics);
router.get('/personal/export', requireAuth, AnalyticsController.exportPersonalAnalytics);
router.get('/group/:id', requireAuth, AnalyticsController.getGroupAnalytics);
router.get('/group/:id/export', requireAuth, AnalyticsController.exportGroupAnalytics);

// AI Insights
router.post('/insights', requireAuth, AnalyticsController.getAIInsights);

export default router;
