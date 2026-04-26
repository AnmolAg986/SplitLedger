import { Router } from 'express';
import { PollController } from '../controllers/PollController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

router.post('/', requireAuth, PollController.createPoll);
router.get('/', requireAuth, PollController.getPolls);
router.get('/:pollId', requireAuth, PollController.getPoll);
router.post('/:pollId/vote', requireAuth, PollController.vote);

export default router;
