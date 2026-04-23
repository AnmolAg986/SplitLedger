import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { onlineUsers } from '../../websocket/socketServer';
import { UserRepository } from '../../persistence/UserRepository';

export class UserController {
  static async getPresence(req: AuthenticatedRequest, res: Response) {
    try {
      const targetUserId = req.params.id as string;
      if (!targetUserId) return res.status(400).json({ error: 'User ID required' });

      const onlineData = onlineUsers.get(targetUserId);

      if (onlineData) {
        return res.status(200).json({
          online: true,
          lastSeen: onlineData.lastSeen.toISOString()
        });
      } else {
        // Fetch last seen from DB
        const user = await UserRepository.findById(targetUserId as string);
        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.status(200).json({
          online: false,
          lastSeen: user.lastSeenAt ? new Date(user.lastSeenAt).toISOString() : null
        });
      }
    } catch (err) {
      console.error('[UserController] getPresence error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
