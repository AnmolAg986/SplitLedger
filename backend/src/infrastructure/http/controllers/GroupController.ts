import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { GroupRepository } from '../../persistence/GroupRepository';
import { RecurringExpenseRepository } from '../../persistence/RecurringExpenseRepository';
import { UserRepository } from '../../persistence/UserRepository';
import { DebtSimplificationService } from '../../../shared/services/DebtSimplificationService';
import { PermissionService } from '../../../application/services/PermissionService';
import { GroupActivityRepository } from '../../persistence/GroupActivityRepository';
import { pool } from '../../../config/db';
import { ioInstance } from '../../websocket/socketServer';
import QRCode from 'qrcode';

export class GroupController {

  static async createGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, type, memberIds, defaultDueDay } = req.body;
      if (!name) return res.status(400).json({ error: 'Group name is required' });

      const group = await GroupRepository.createGroup(
        name,
        type || 'other',
        userId,
        memberIds || [],
        defaultDueDay
      );
      return res.status(201).json(group);
    } catch (err) {
      console.error('[GroupController] createGroup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groups = await GroupRepository.getGroups(userId);
      return res.status(200).json(groups);
    } catch (err) {
      console.error('[GroupController] getGroups error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGroupDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(id, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const group = await GroupRepository.getGroupDetail(id);
      if (!group) return res.status(404).json({ error: 'Group not found' });

      return res.status(200).json(group);
    } catch (err) {
      console.error('[GroupController] getGroupDetail error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGroupBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(id, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const balances = await GroupRepository.getGroupBalances(id);
      return res.status(200).json(balances);
    } catch (err) {
      console.error('[GroupController] getGroupBalances error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGroupExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(id, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const expenses = await GroupRepository.getGroupExpenses(id, userId);
      return res.status(200).json(expenses);
    } catch (err) {
      console.error('[GroupController] getGroupExpenses error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(id, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const leaderboard = await GroupRepository.getMonthlyLeaderboard(id);
      return res.status(200).json(leaderboard);
    } catch (err) {
      console.error('[GroupController] getLeaderboard error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMemberStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(id, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const stats = await GroupRepository.getMemberStats(id);
      return res.status(200).json(stats);
    } catch (err) {
      console.error('[GroupController] getMemberStats error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGroupSimplifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const { pool } = require('../../../config/db');
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            es.user_id as from_user,
            e.paid_by as to_user,
            es.amount
          FROM expense_splits es
          JOIN expenses e ON e.id = es.expense_id
          WHERE e.group_id = $1 AND es.is_paid = false AND e.deleted_at IS NULL
        `, [groupId]);

        const transactions = result.rows.map((r: any) => ({
          from: r.from_user,
          to: r.to_user,
          amount: parseFloat(r.amount)
        }));

        const simplified = DebtSimplificationService.simplify(transactions);

        // Enhance with display names
        const enriched = await Promise.all(simplified.map(async (s) => {
          const fromUser = await UserRepository.findById(s.from);
          const toUser = await UserRepository.findById(s.to);
          return {
            ...s,
            from_name: fromUser?.displayName || s.from,
            to_name: toUser?.displayName || s.to
          };
        }));

        return res.status(200).json(enriched);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[GroupController] getGroupSimplifications error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async addGroupMember(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const { userId } = req.body;

      const canDo = await PermissionService.can(requesterId, groupId, 'remove_member');
      if (!canDo) return res.status(403).json({ error: 'Admin or owner permissions required' });

      await GroupRepository.addMember(groupId, userId);
      return res.status(200).json({ message: 'Member added' });
    } catch (err) {
      console.error('[GroupController] addGroupMember error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async removeGroupMember(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const targetUserId = req.params.userId as string;

      const canRemove = await PermissionService.can(requesterId, groupId, 'remove_member');
      if (!canRemove && requesterId !== targetUserId) {
        return res.status(403).json({ error: 'Not authorized to remove this member' });
      }

      await GroupRepository.removeMember(groupId, targetUserId);

      GroupActivityRepository.log(groupId, requesterId, 'member_left', {
        removed_user_id: targetUserId
      });

      return res.status(200).json({ message: 'Member removed' });
    } catch (err) {
      console.error('[GroupController] removeGroupMember error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async changeMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const { role: newRole } = req.body;

      const validRoles = ['owner', 'admin', 'member', 'viewer'];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }

      // Promoting to admin requires promote_admin permission (owner only)
      // Changing to any other role requires remove_member permission (admin+)
      const requiredAction = newRole === 'admin' ? 'promote_admin' : 'remove_member';
      const canDo = await PermissionService.can(requesterId, groupId, requiredAction);
      if (!canDo) return res.status(403).json({ error: 'Insufficient permissions to change this role' });

      await GroupRepository.changeMemberRole(groupId, targetUserId, newRole);
      return res.status(200).json({ message: 'Member role updated' });
    } catch (err) {
      console.error('[GroupController] changeMemberRole error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getInviteToken(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const group = await GroupRepository.getGroupDetail(id);
      if (!group) return res.status(404).json({ error: 'Group not found' });

      return res.status(200).json({ invite_token: group.invite_token });
    } catch (err) {
      console.error('[GroupController] getInviteToken error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async joinGroupByToken(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { token } = req.body;
      const group = await GroupRepository.findByInviteToken(token);
      if (!group) return res.status(404).json({ error: 'Invalid or expired invite token' });

      // Check if already a member
      const isMember = await GroupRepository.isGroupMember(group.id, userId);
      if (isMember) return res.status(200).json({ message: 'Already a member', groupId: group.id });

      const status = group.requires_approval ? 'pending' : 'accepted';
      await GroupRepository.addMember(group.id, userId, status);

      GroupActivityRepository.log(group.id, userId, 'member_joined', {
        display_name: undefined, status
      });

      return res.status(200).json({ 
        message: status === 'pending' ? 'Join request sent. Pending admin approval.' : 'Joined successfully', 
        groupId: group.id 
      });
    } catch (err) {
      console.error('[GroupController] joinGroupByToken error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async archiveGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const { isArchived } = req.body;

      await PermissionService.assertCan(requesterId, groupId, 'archive_group');

      if (isArchived) {
        const balances = await GroupRepository.getGroupBalances(groupId);
        const hasPendingBalances = balances.some((b: any) => parseFloat(b.amount) !== 0);
        if (hasPendingBalances) {
          return res.status(400).json({ error: 'Group cannot be archived until all outstanding balances are settled.' });
        }
      }

      await GroupRepository.archiveGroup(groupId, isArchived);
      return res.status(200).json({ message: isArchived ? 'Group archived' : 'Group unarchived' });
    } catch (err: any) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      console.error('[GroupController] archiveGroup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const { name, description, avatarUrl, requires_approval } = req.body;

      await PermissionService.assertCan(requesterId, groupId, 'update_group');

      await GroupRepository.updateGroupDetails(groupId, { name, description, avatarUrl, requiresApproval: requires_approval });
      return res.status(200).json({ message: 'Group updated' });
    } catch (err: any) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      console.error('[GroupController] updateGroup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;

      await PermissionService.assertCan(requesterId, groupId, 'delete_group');

      await GroupRepository.deleteGroup(groupId, requesterId);
      return res.status(200).json({ message: 'Group deleted' });
    } catch (err: any) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      console.error('[GroupController] deleteGroup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGroupTemplates(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Forbidden' });

      const templates = await RecurringExpenseRepository.getGroupTemplates(groupId);
      return res.status(200).json(templates);
    } catch (err) {
      console.error('[GroupController] getGroupTemplates error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const { id: templateId } = req.params;
      // For simplicity, we just check if active. In production, check group admin role.
      await RecurringExpenseRepository.deactivateTemplate(templateId as string);
      return res.status(200).json({ message: 'Template deactivated' });
    } catch (err) {
      console.error('[GroupController] deleteTemplate error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async approveMember(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const targetUserId = req.params.userId as string;

      const canDo = await PermissionService.can(requesterId, groupId, 'remove_member');
      if (!canDo) return res.status(403).json({ error: 'Admin or owner permissions required' });

      await GroupRepository.updateMemberStatus(groupId, targetUserId, 'accepted');
      return res.status(200).json({ message: 'Member approved' });
    } catch (err) {
      console.error('[GroupController] approveMember error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async rejectMember(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const targetUserId = req.params.userId as string;

      const canDo = await PermissionService.can(requesterId, groupId, 'remove_member');
      if (!canDo) return res.status(403).json({ error: 'Admin or owner permissions required' });

      await GroupRepository.removeMember(groupId, targetUserId);
      return res.status(200).json({ message: 'Member rejected' });
    } catch (err) {
      console.error('[GroupController] rejectMember error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async nudgeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const { amount } = req.body;

      const group = await GroupRepository.getGroupDetail(groupId);
      
      const NotificationSys = require('../../../application/services/NotificationService').NotificationService;
      await NotificationSys.notify(
        targetUserId,
        'nudge',
        'Reminder to Settle Up',
        `Reminder for ${group?.name || 'Group'}: You have a pending balance of ₹${amount}.`,
        'group',
        groupId
      );

      return res.status(200).json({ message: 'Nudge sent successfully' });
    } catch (err) {
      console.error('[GroupController] nudgeMember error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async lockExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const { beforeDate } = req.body;

      if (!beforeDate) {
        return res.status(400).json({ error: 'beforeDate is required' });
      }

      await PermissionService.assertCan(userId, groupId, 'lock_expenses');

      const { ExpenseService } = await import('../../../application/services/ExpenseService');
      const count = await ExpenseService.lockGroupExpenses(groupId, new Date(beforeDate), userId);

      return res.status(200).json({ message: `${count} expenses locked successfully` });
    } catch (err: any) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      console.error('[GroupController] lockExpenses error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** Returns the current user\'s permissions for a group — consumed by the frontend. */
  static async getMyPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const permissions = await PermissionService.getPermissions(userId, groupId);

      if (!permissions) return res.status(403).json({ error: 'Not a member of this group' });
      return res.status(200).json(permissions);
    } catch (err) {
      console.error('[GroupController] getMyPermissions error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** GET /groups/:id/activity?limit=20&cursor=<ISO timestamp> */
  static async getActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member of this group' });

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const cursor = req.query.cursor as string | undefined;

      const activities = await GroupActivityRepository.getActivity(groupId, limit, cursor);

      const nextCursor = activities.length === limit
        ? activities[activities.length - 1].created_at
        : null;

      return res.status(200).json({ activities, nextCursor });
    } catch (err) {
      console.error('[GroupController] getActivity error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** POST /groups/:id/messages/:messageId/pin — admin-only */
  static async pinMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id: groupId, messageId } = req.params as { id: string; messageId: string };

      await PermissionService.assertCan(userId, groupId, 'update_group');

      const res2 = await pool.query(
        `UPDATE group_messages
         SET is_pinned = TRUE, pinned_by = $2, pinned_at = now()
         WHERE id = $1 AND group_id = $3
         RETURNING id, content, sender_id, created_at, is_pinned, pinned_by, pinned_at,
           (SELECT display_name FROM users WHERE id = sender_id) AS sender_name,
           (SELECT display_name FROM users WHERE id = $2) AS pinned_by_name`,
        [messageId, userId, groupId]
      );
      if (!res2.rows[0]) return res.status(404).json({ error: 'Message not found' });

      const pinned = res2.rows[0];

      // Broadcast to group room
      if (ioInstance) ioInstance.to(`group:${groupId}`).emit('message_pinned', pinned);

      return res.status(200).json(pinned);
    } catch (err: any) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      console.error('[GroupController] pinMessage error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** DELETE /groups/:id/messages/:messageId/pin — admin-only */
  static async unpinMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id: groupId, messageId } = req.params as { id: string; messageId: string };

      await PermissionService.assertCan(userId, groupId, 'update_group');

      await pool.query(
        `UPDATE group_messages
         SET is_pinned = FALSE, pinned_by = NULL, pinned_at = NULL
         WHERE id = $1 AND group_id = $2`,
        [messageId, groupId]
      );

      if (ioInstance) ioInstance.to(`group:${groupId}`).emit('message_unpinned', { messageId, groupId });

      return res.status(200).json({ message: 'Unpinned' });
    } catch (err: any) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      console.error('[GroupController] unpinMessage error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /** GET /groups/:id/pinned-messages */
  static async getPinnedMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });

      const result = await pool.query(
        `SELECT
           gm.id, gm.content, gm.created_at, gm.is_pinned, gm.pinned_at,
           sender.display_name AS sender_name,
           pinner.display_name AS pinned_by_name
         FROM group_messages gm
         JOIN users sender ON sender.id = gm.sender_id
         LEFT JOIN users pinner ON pinner.id = gm.pinned_by
         WHERE gm.group_id = $1 AND gm.is_pinned = TRUE
           AND gm.is_deleted_for_everyone = FALSE
         ORDER BY gm.pinned_at DESC`,
        [groupId]
      );

      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('[GroupController] getPinnedMessages error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /groups/:id/invite-qr
   * Returns a PNG image (Buffer) containing a QR code encoding the invite URL.
   * The invite URL uses the same token as GET /groups/:id/invite.
   */
  static async getInviteQR(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });

      // Reuse the existing invite token logic
      const tokenRes = await pool.query(
        `SELECT invite_token FROM groups WHERE id = $1`,
        [groupId]
      );
      const token = tokenRes.rows[0]?.invite_token;
      if (!token) return res.status(404).json({ error: 'Invite token not found' });

      const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteUrl = `${frontendOrigin}/join/${token}`;

      const pngBuffer = await QRCode.toBuffer(inviteUrl, {
        type: 'png',
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5-min cache
      return res.status(200).send(pngBuffer);
    } catch (err) {
      console.error('[GroupController] getInviteQR error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
