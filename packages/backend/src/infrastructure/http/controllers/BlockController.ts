import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { BlockRepository } from '../../persistence/BlockRepository';

export class BlockController {
  static async blockUser(req: AuthenticatedRequest, res: Response) {
    try {
      const blockerId = req.user?.id;
      const blockedId = req.params.id as string;
      
      if (!blockerId) return res.status(401).json({ error: 'Unauthorized' });
      if (blockerId === blockedId) return res.status(400).json({ error: 'You cannot block yourself' });

      await BlockRepository.blockUser(blockerId, blockedId);
      return res.status(200).json({ message: 'User blocked successfully' });
    } catch (err) {
      console.error('[BlockController] blockUser error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async unblockUser(req: AuthenticatedRequest, res: Response) {
    try {
      const blockerId = req.user?.id;
      const blockedId = req.params.id as string;
      
      if (!blockerId) return res.status(401).json({ error: 'Unauthorized' });

      await BlockRepository.unblockUser(blockerId, blockedId);
      return res.status(200).json({ message: 'User unblocked successfully' });
    } catch (err) {
      console.error('[BlockController] unblockUser error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getBlockedUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const blockedUsers = await BlockRepository.getBlockedUsers(userId);
      return res.status(200).json(blockedUsers);
    } catch (err) {
      console.error('[BlockController] getBlockedUsers error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
