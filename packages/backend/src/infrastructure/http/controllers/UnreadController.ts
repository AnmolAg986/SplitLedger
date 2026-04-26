import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { UnreadRepository } from '../../persistence/UnreadRepository';

export class UnreadController {
  static async getUnreadCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const counts = await UnreadRepository.getUnreadCountsForUser(userId);
      return res.status(200).json(counts);
    } catch (err) {
      console.error('[UnreadController] getUnreadCounts error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { entityType, entityId, section } = req.body;
      if (!entityType || !section) {
        return res.status(400).json({ error: 'entityType and section are required' });
      }

      const updated = await UnreadRepository.markAsRead(userId, entityType, entityId || null, section);
      return res.status(200).json({ message: 'Marked as read', updated });
    } catch (err) {
      console.error('[UnreadController] markAsRead error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
