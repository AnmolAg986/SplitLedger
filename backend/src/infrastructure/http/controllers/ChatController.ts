import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { ChatRepository } from '../../persistence/ChatRepository';

export class ChatController {

  static async getConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friendId = req.params.friendId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = await ChatRepository.getConversation(userId, friendId, limit, offset);

      // Mark messages as read
      await ChatRepository.markAsRead(userId, friendId);

      return res.status(200).json(messages);
    } catch (err) {
      console.error('[ChatController] getConversation error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friendId = req.params.friendId as string;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const message = await ChatRepository.sendMessage(userId, friendId, content.trim());

      // Emit via Socket.IO if available
      const io = req.app.get('io');
      if (io) {
        const roomId = [userId, friendId].sort().join('_');
        io.to(roomId).emit('new_message', message);
      }

      return res.status(201).json(message);
    } catch (err) {
      console.error('[ChatController] sendMessage error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friendId = req.params.friendId as string;
      await ChatRepository.markAsRead(userId, friendId);

      return res.status(200).json({ message: 'Messages marked as read' });
    } catch (err) {
      console.error('[ChatController] markAsRead error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUnreadCounts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const counts = await ChatRepository.getUnreadCounts(userId);
      return res.status(200).json(counts);
    } catch (err) {
      console.error('[ChatController] getUnreadCounts error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
