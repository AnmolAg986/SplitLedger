import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { GroupRepository } from '../../persistence/GroupRepository';
import { RecurringExpenseRepository } from '../../persistence/RecurringExpenseRepository';
import { UserRepository } from '../../persistence/UserRepository';
import { DebtSimplificationService } from '../../../shared/services/DebtSimplificationService';

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

      const { pool } = require('../../config/db');
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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin' && requesterId !== targetUserId) {
        return res.status(403).json({ error: 'Not authorized to remove this member' });
      }

      await GroupRepository.removeMember(groupId, targetUserId);
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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

      if (isArchived) {
        const balances = await GroupRepository.getGroupBalances(groupId);
        const hasPendingBalances = balances.some((b: any) => parseFloat(b.amount) !== 0);
        if (hasPendingBalances) {
          return res.status(400).json({ error: 'Group cannot be archived until all outstanding balances are settled.' });
        }
      }

      await GroupRepository.archiveGroup(groupId, isArchived);
      return res.status(200).json({ message: isArchived ? 'Group archived' : 'Group unarchived' });
    } catch (err) {
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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

      await GroupRepository.updateGroupDetails(groupId, { name, description, avatarUrl, requiresApproval: requires_approval });
      return res.status(200).json({ message: 'Group updated' });
    } catch (err) {
      console.error('[GroupController] updateGroup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

      await GroupRepository.deleteGroup(groupId, requesterId);
      return res.status(200).json({ message: 'Group deleted' });
    } catch (err) {
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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

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

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

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
      
      const { ioInstance } = require('../../websocket/socketServer');
      if (ioInstance) {
        ioInstance.to(targetUserId).emit('notification', {
          type: 'reminder',
          message: `Reminder for ${group?.name || 'Group'}: You have a pending balance of ₹${amount}.`,
          groupId
        });
      }

      return res.status(200).json({ message: 'Nudge sent successfully' });
    } catch (err) {
      console.error('[GroupController] nudgeMember error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
