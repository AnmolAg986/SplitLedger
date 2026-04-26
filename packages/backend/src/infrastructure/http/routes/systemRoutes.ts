import { Router } from 'express';
import { SystemController } from '../controllers/SystemController';

const router = Router();

router.get('/changelog', SystemController.getChangelog);

export default router;
