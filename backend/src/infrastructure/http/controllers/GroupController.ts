import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { GroupRepository } from '../../persistence/GroupRepository';
import { RecurringExpenseRepository } from '../../persistence/RecurringExpenseRepository';

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

      await GroupRepository.addMember(group.id, userId);
      return res.status(200).json({ message: 'Joined successfully', groupId: group.id });
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
      const { name, description, avatarUrl } = req.body;

      const role = await GroupRepository.getGroupMemberRole(groupId, requesterId);
      if (role !== 'admin') return res.status(403).json({ error: 'Admin permissions required' });

      await GroupRepository.updateGroupDetails(groupId, { name, description, avatarUrl });
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
}
