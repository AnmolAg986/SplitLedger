import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', SearchController.search);

export default router;
