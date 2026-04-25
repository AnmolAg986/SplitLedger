import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { SettlementRepository } from '../../persistence/SettlementRepository';
import { FriendRepository } from '../../persistence/FriendRepository';
import { UnreadRepository } from '../../persistence/UnreadRepository';
import { ioInstance } from '../../websocket/socketServer';
import { NotificationService as NotificationSys } from '../../../application/services/NotificationService';
import { AuditLogRepository } from '../../persistence/AuditLogRepository';
import { invalidateCache } from '../../persistence/CachingRepository';

export class SettlementController {

  static async createSettlement(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { toUser, amount, currency, groupId, paymentMethod, paymentRef } = req.body;
      if (!toUser || !amount) {
        return res.status(400).json({ error: 'toUser and amount are required' });
      }

      // Create the settlement record
      const settlement = await SettlementRepository.createSettlement(
        userId, toUser, amount, currency || 'INR', groupId, paymentMethod, paymentRef
      );

      // Log history
      await SettlementRepository.addHistory(settlement.id, 'created', userId, 'Settlement initiated');

      // Mark the relevant expense splits as paid in both directions for a mutual settlement
      await SettlementRepository.settleUpBetween(userId, toUser);
      await SettlementRepository.settleUpBetween(toUser, userId);

      try {
        await NotificationSys.notify(
          toUser,
          'settled',
          'Payment Recorded',
          `A payment of ${amount} ${currency || 'INR'} was recorded towards you.`,
          'settlement',
          settlement.id
        );

        await UnreadRepository.increment(toUser, groupId ? 'group' : 'friend', groupId || userId, 'payments');
        if (ioInstance) {
          ioInstance.to(toUser).emit('unread_update', {
            type: 'unread_update',
            entity_type: groupId ? 'group' : 'friend',
            entity_id: groupId || userId,
            section: 'payments',
            delta: 1
          });
        }
      } catch (e) {
        console.error('Failed to update unread counts or notify:', e);
      }

      if (groupId) {
        await invalidateCache('gb', groupId);
      }

      await AuditLogRepository.log(userId, 'settlement_create', 'settlement', settlement.id, req.ip || null, req.headers['user-agent'] || null);

      return res.status(201).json(settlement);
    } catch (err) {
      console.error('[SettlementController] createSettlement error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createRecurring(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { toUser, amount, currency, groupId, recurringInterval, nextDate, paymentMethod } = req.body;
      if (!toUser || !amount || !recurringInterval || !nextDate) {
        return res.status(400).json({ error: 'toUser, amount, recurringInterval and nextDate are required' });
      }

      const settlement = await SettlementRepository.createRecurring(
        userId, toUser, amount, currency || 'INR',
        recurringInterval, nextDate, groupId, paymentMethod
      );

      await SettlementRepository.addHistory(
        settlement.id, 'created', userId,
        `Recurring settlement setup (${recurringInterval}) — first due ${nextDate}`
      );

      if (groupId) {
        await invalidateCache('gb', groupId);
      }

      return res.status(201).json(settlement);
    } catch (err) {
      console.error('[SettlementController] createRecurring error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async settleAllMutual(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { friendId } = req.body;
      if (!friendId) return res.status(400).json({ error: 'friendId is required' });

      // Mark all debts in both directions as paid
      await SettlementRepository.settleUpBetween(userId, friendId);
      await SettlementRepository.settleUpBetween(friendId, userId);

      try {
        await NotificationSys.notify(
          friendId,
          'settled',
          'All Debts Settled',
          `All mutual debts between you have been marked as settled.`,
          'friend',
          userId
        );

        await UnreadRepository.increment(friendId, 'friend', userId, 'payments');
        if (ioInstance) {
          ioInstance.to(friendId).emit('unread_update', {
            type: 'unread_update',
            entity_type: 'friend',
            entity_id: userId,
            section: 'payments',
            delta: 1
          });
        }
      } catch (e) {
        console.error('Failed to update unread counts or notify:', e);
      }

      await AuditLogRepository.log(userId, 'settlement_all_mutual', 'friend', friendId, req.ip || null, req.headers['user-agent'] || null);

      return res.status(200).json({ message: 'All mutual debts settled successfully' });
    } catch (err) {
      console.error('[SettlementController] settleAllMutual error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async markSettled(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const settlement = await SettlementRepository.markSettled(id, userId);
      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

      // Log history
      await SettlementRepository.addHistory(id, 'confirmed', userId, 'Settlement marked as completed');

      return res.status(200).json(settlement);
    } catch (err) {
      console.error('[SettlementController] markSettled error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async disputeSettlement(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const { note } = req.body;
      
      const settlement = await SettlementRepository.disputeSettlement(id, userId, note);
      if (!settlement) return res.status(400).json({ error: 'Settlement cannot be disputed or not found' });

      await SettlementRepository.addHistory(id, 'disputed', userId, note);

      const targetUser = settlement.from_user === userId ? settlement.to_user : settlement.from_user;
      
      try {
        await NotificationSys.notify(
          targetUser,
          'settled',
          'Settlement Disputed',
          `A settlement was disputed. Note: ${note}`,
          'settlement',
          settlement.id
        );
      } catch (e) {
        console.error('Failed to notify about dispute:', e);
      }

      return res.status(200).json(settlement);
    } catch (err) {
      console.error('[SettlementController] disputeSettlement error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resolveDispute(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const settlement = await SettlementRepository.resolveDispute(id, userId);
      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

      await SettlementRepository.addHistory(id, 'resolved', userId, 'Dispute resolved and confirmed');

      return res.status(200).json(settlement);
    } catch (err) {
      console.error('[SettlementController] resolveDispute error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getSettlements(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const settlements = await SettlementRepository.getSettlements(userId);
      return res.status(200).json(settlements);
    } catch (err) {
      console.error('[SettlementController] getSettlements error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async settleSpecificExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const expenseId = req.params.id as string;
      await SettlementRepository.settleSpecificExpense(expenseId, userId);
      return res.status(200).json({ message: 'Expense settled successfully' });
    } catch (err) {
      console.error('[SettlementController] settleSpecificExpense error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async settleAllGroupMutual(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      await SettlementRepository.settleAllGroupMutual(groupId, userId);
      await invalidateCache('gb', groupId);
      return res.status(200).json({ message: 'All outstanding group debts settled successfully' });
    } catch (err) {
      console.error('[SettlementController] settleAllGroupMutual error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const history = await SettlementRepository.getHistory(id);

      return res.status(200).json(history);
    } catch (err) {
      console.error('[SettlementController] getHistory error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async uploadProof(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const file = req.file;
      
      if (!file) return res.status(400).json({ error: 'No image provided' });

      const proofUrl = `/uploads/${file.filename}`;
      const settlement = await SettlementRepository.uploadProof(id, userId, proofUrl);

      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
      await SettlementRepository.addHistory(id, 'proof_uploaded', userId, 'Payment proof uploaded');

      return res.status(200).json(settlement);
    } catch (err) {
      console.error('[SettlementController] uploadProof error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
