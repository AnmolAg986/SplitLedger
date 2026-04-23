import { Router } from 'express';
import { BlockController } from '../controllers/BlockController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/:id', requireAuth, BlockController.blockUser);
router.delete('/:id', requireAuth, BlockController.unblockUser);
router.get('/', requireAuth, BlockController.getBlockedUsers);

export default router;
