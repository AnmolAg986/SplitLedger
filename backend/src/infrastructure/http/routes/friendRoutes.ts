import { Router } from 'express';
import { FriendController } from '../controllers/FriendController';
import { requireAuth } from '../middleware/authMiddleware';
import { nudgeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/add', requireAuth, FriendController.addFriend);
router.post('/accept/:friendId', requireAuth, FriendController.acceptFriend);
router.delete('/:friendId', requireAuth, FriendController.removeFriend);
router.get('/', requireAuth, FriendController.getFriends);
router.get('/pending', requireAuth, FriendController.getPendingRequests);
router.get('/search', requireAuth, FriendController.searchUsers);
router.get('/suggestions', requireAuth, FriendController.getSuggestions);
router.get('/insights', requireAuth, FriendController.getInsights);
router.put('/:friendId/category', requireAuth, FriendController.updateCategory);

router.get('/recent', requireAuth, FriendController.getRecentFriends);
router.post('/nickname', requireAuth, FriendController.setNickname);
router.post('/:friendId/nudge', requireAuth, nudgeLimiter, FriendController.nudgeFriend);
router.get('/:friendId', requireAuth, FriendController.getFriendDetail);

export default router;
