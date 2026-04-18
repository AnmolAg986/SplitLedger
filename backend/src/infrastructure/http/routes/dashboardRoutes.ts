import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Retrieve all dashboard blocks in one unified request
router.get('/summary', requireAuth, DashboardController.getSummary);

// ── Phase 3+: Uncomment when reaching those phases ──
// router.get('/activity', requireAuth, DashboardController.getFullActivity);

export default router;
