import { Router } from 'express';
import { GroupController } from '../controllers/GroupController';
import { requireAuth } from '../middleware/authMiddleware';
import { nudgeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', requireAuth, GroupController.createGroup);
router.get('/', requireAuth, GroupController.getGroups);
router.get('/:id', requireAuth, GroupController.getGroupDetail);
router.get('/:id/balances', requireAuth, GroupController.getGroupBalances);
router.get('/:id/expenses', requireAuth, GroupController.getGroupExpenses);
router.get('/:id/leaderboard', requireAuth, GroupController.getLeaderboard);
router.get('/:id/stats', requireAuth, GroupController.getMemberStats);
router.get('/:id/simplifications', requireAuth, GroupController.getGroupSimplifications);
router.get('/:id/invite', requireAuth, GroupController.getInviteToken);
router.post('/join', requireAuth, GroupController.joinGroupByToken);
router.put('/:id', requireAuth, GroupController.updateGroup);
router.post('/:id/archive', requireAuth, GroupController.archiveGroup);
router.get('/:id/templates', requireAuth, GroupController.getGroupTemplates);
router.delete('/templates/:id', requireAuth, GroupController.deleteTemplate);
router.delete('/:id', requireAuth, GroupController.deleteGroup);

router.post('/:id/members', requireAuth, GroupController.addGroupMember);
router.delete('/:id/members/:userId', requireAuth, GroupController.removeGroupMember);
router.put('/:id/members/:userId/role', requireAuth, GroupController.changeMemberRole);
router.post('/:id/members/:userId/approve', requireAuth, GroupController.approveMember);
router.post('/:id/members/:userId/reject', requireAuth, GroupController.rejectMember);

router.post('/:id/settle-all', requireAuth, require('../controllers/SettlementController').SettlementController.settleAllGroupMutual);
router.post('/:id/lock-expenses', requireAuth, GroupController.lockExpenses);

router.post('/:id/nudge/:userId', requireAuth, nudgeLimiter, (req, res) => GroupController.nudgeMember(req as any, res));

export default router;
