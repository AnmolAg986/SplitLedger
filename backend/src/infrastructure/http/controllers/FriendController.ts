import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { FriendRepository } from '../../persistence/FriendRepository';
import { UserRepository } from '../../persistence/UserRepository';

export class FriendController {

  static async addFriend(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { identifier } = req.body;
      if (!identifier) return res.status(400).json({ error: 'Identifier is required' });

      const friend = await UserRepository.findByIdentifier(identifier);
      if (!friend) {
        // Send actual invite if they don't exist
        const isPhone = /^\\+?\\d+$/.test(identifier);
        
        if (isPhone) {
          // Use dynamic import or existing SmsService to send invite
          const { sendVerificationSMS } = require('../../../shared/utils/smsService');
          await sendVerificationSMS(identifier, "Join me on SplitLedger!");
        } else {
          const { sendVerificationEmail } = require('../../../shared/utils/emailService');
          await sendVerificationEmail(identifier, "Join me on SplitLedger!");
        }

        return res.status(200).json({ message: 'User not found. Invite sent!' });
      }
      if (friend.id === userId) return res.status(400).json({ error: 'You cannot add yourself' });

      const existing = await FriendRepository.getFriendshipStatus(userId, friend.id);
      if (existing) {
        if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
        if (existing.status === 'pending') return res.status(400).json({ error: 'Friend request already pending' });
      }

      const friendship = await FriendRepository.addFriend(userId, friend.id);
      return res.status(201).json({ message: 'Friend request sent', friendship });
    } catch (err) {
      console.error('[FriendController] addFriend error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async acceptFriend(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friendId = req.params.friendId as string;
      const result = await FriendRepository.acceptFriend(userId, friendId);
      if (!result) return res.status(404).json({ error: 'No pending request found' });

      return res.status(200).json({ message: 'Friend request accepted', friendship: result });
    } catch (err) {
      console.error('[FriendController] acceptFriend error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async removeFriend(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friendId = req.params.friendId as string;
      await FriendRepository.removeFriend(userId, friendId);
      return res.status(200).json({ message: 'Friend removed' });
    } catch (err) {
      console.error('[FriendController] removeFriend error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFriends(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friends = await FriendRepository.getFriends(userId);

      // Enrich each friend with their net balance
      const enriched = await Promise.all(
        friends.map(async (f: { id: string; display_name: string; email: string; avatar_url: string; spending_streak: number; last_interaction: string }) => {
          const balance = await FriendRepository.getFriendBalance(userId, f.id);
          return { ...f, balance };
        })
      );

      return res.status(200).json(enriched);
    } catch (err) {
      console.error('[FriendController] getFriends error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPendingRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pending = await FriendRepository.getPendingRequests(userId);
      return res.status(200).json(pending);
    } catch (err) {
      console.error('[FriendController] getPendingRequests error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async searchUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const q = req.query.q as string;
      if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

      const results = await FriendRepository.searchUsers(q, userId);
      return res.status(200).json(results);
    } catch (err) {
      console.error('[FriendController] searchUsers error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFriendDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friendId = req.params.friendId as string;
      const friend = await UserRepository.findById(friendId);
      if (!friend) return res.status(404).json({ error: 'Friend not found' });

      const balance = await FriendRepository.getFriendBalance(userId, friendId);
      const expenses = await FriendRepository.getFriendExpenses(userId, friendId);
      const stats = await FriendRepository.getFriendshipStats(userId, friendId);
      const mutualGroups = await FriendRepository.getMutualGroups(userId, friendId);

      const friendship = await FriendRepository.getFriendshipStatus(userId, friendId);
      const nickname = friendship ? (friendship.user_id_1 === userId ? friendship.nickname_1 : friendship.nickname_2) : null;

      return res.status(200).json({ 
        friend: {
          id: friend.id,
          display_name: friend.displayName,
          email: friend.email,
          avatar_url: friend.avatarUrl,
          nickname
        },
        balance, 
        expenses,
        stats,
        mutualGroups
      });
    } catch (err) {
      console.error('[FriendController] getFriendDetail error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getInsights(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const mostGenerous = await FriendRepository.getMostGenerousFriend(userId);
      const streaks = await FriendRepository.getSpendingStreaks(userId);

      return res.status(200).json({ mostGenerous, streaks });
    } catch (err) {
      console.error('[FriendController] getInsights error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRecentFriends(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const friends = await FriendRepository.getRecentFriends(userId);
      return res.status(200).json(friends);
    } catch (err) {
      console.error('[FriendController] getRecentFriends error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async setNickname(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { friendId, nickname } = req.body;
      await FriendRepository.setNickname(userId, friendId, nickname || null);
      return res.status(200).json({ message: 'Nickname updated' });
    } catch (err) {
      console.error('[FriendController] setNickname error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async nudgeFriend(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { friendId } = req.params;
      // In a real app, this would send an SMS/Email/Push
      // For now, we simulate success
      return res.status(200).json({ message: 'Nudge sent successfully' });
    } catch (err) {
      console.error('[FriendController] nudgeFriend error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
