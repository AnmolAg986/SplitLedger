import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { SettlementRepository } from '../../persistence/SettlementRepository';
import { FriendRepository } from '../../persistence/FriendRepository';

export class SettlementController {

  static async createSettlement(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { toUser, amount, currency, groupId } = req.body;
      if (!toUser || !amount) {
        return res.status(400).json({ error: 'toUser and amount are required' });
      }

      // Create the settlement record
      const settlement = await SettlementRepository.createSettlement(
        userId, toUser, amount, currency || 'INR', groupId
      );

      // Mark the relevant expense splits as paid in both directions for a mutual settlement
      await SettlementRepository.settleUpBetween(userId, toUser);
      await SettlementRepository.settleUpBetween(toUser, userId);

      return res.status(201).json(settlement);
    } catch (err) {
      console.error('[SettlementController] createSettlement error:', err);
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

      return res.status(200).json(settlement);
    } catch (err) {
      console.error('[SettlementController] markSettled error:', err);
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
      return res.status(200).json({ message: 'All outstanding group debts settled successfully' });
    } catch (err) {
      console.error('[SettlementController] settleAllGroupMutual error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
