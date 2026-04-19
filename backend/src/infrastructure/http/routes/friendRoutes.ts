import { Router } from 'express';
import { FriendController } from '../controllers/FriendController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/add', requireAuth, FriendController.addFriend);
router.post('/accept/:friendId', requireAuth, FriendController.acceptFriend);
router.delete('/:friendId', requireAuth, FriendController.removeFriend);
router.get('/', requireAuth, FriendController.getFriends);
router.get('/pending', requireAuth, FriendController.getPendingRequests);
router.get('/search', requireAuth, FriendController.searchUsers);
router.get('/insights', requireAuth, FriendController.getInsights);
router.get('/recent', requireAuth, FriendController.getRecentFriends);
router.post('/nickname', requireAuth, FriendController.setNickname);
router.post('/:friendId/nudge', requireAuth, FriendController.nudgeFriend);
router.get('/:friendId', requireAuth, FriendController.getFriendDetail);

export default router;
