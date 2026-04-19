import { Router } from 'express';
import { SettlementController } from '../controllers/SettlementController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/', requireAuth, SettlementController.createSettlement);
router.post('/settle-all-mutual', requireAuth, SettlementController.settleAllMutual);
router.patch('/:id/settle', requireAuth, SettlementController.markSettled);
router.get('/', requireAuth, SettlementController.getSettlements);

export default router;
