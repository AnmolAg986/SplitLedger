import { Response } from 'express';
import { AuthenticatedRequest } from '../types/Request';
import { PollRepository } from '../../persistence/PollRepository';
import { GroupRepository } from '../../persistence/GroupRepository';
import { GroupActivityRepository } from '../../persistence/GroupActivityRepository';
import crypto from 'crypto';

export class PollController {
  /**
   * POST /groups/:id/polls
   * Body: { question, options: string[], expiresInHours? }
   *
   * Also triggered by the /poll slash command from GroupChat:
   * the chat handler calls this logic after parsing the slash command.
   */
  static async createPoll(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });

      const { question, options, expiresInHours } = req.body;
      if (!question?.trim()) return res.status(400).json({ error: 'question is required' });
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'At least 2 options are required' });
      }
      if (options.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 options allowed' });
      }

      const pollOptions = (options as string[]).map(label => ({
        id: crypto.randomUUID(),
        label: label.trim(),
      }));

      const expiresAt = expiresInHours
        ? new Date(Date.now() + Number(expiresInHours) * 3600_000)
        : undefined;

      const poll = await PollRepository.createPoll(groupId, userId, question.trim(), pollOptions, expiresAt);

      // Log to group activity feed
      GroupActivityRepository.log(groupId, userId, 'expense_added' as any, {
        _type: 'poll_created',
        poll_id: poll.id,
        question: poll.question,
      });

      return res.status(201).json(poll);
    } catch (err) {
      console.error('[PollController] createPoll error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /groups/:id/polls/:pollId/vote
   * Body: { optionId }
   */
  static async vote(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id: groupId, pollId } = req.params as { id: string; pollId: string };
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });

      const { optionId } = req.body;
      if (!optionId) return res.status(400).json({ error: 'optionId is required' });

      const updated = await PollRepository.castVote(pollId, userId, optionId);
      return res.status(200).json(updated);
    } catch (err: any) {
      if (err.message === 'Poll has expired') return res.status(410).json({ error: err.message });
      if (err.message === 'Invalid option') return res.status(400).json({ error: err.message });
      console.error('[PollController] vote error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /groups/:id/polls?limit=10&cursor=<ISO>
   */
  static async getPolls(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const groupId = req.params.id as string;
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const cursor = req.query.cursor as string | undefined;
      const polls = await PollRepository.getGroupPolls(groupId, userId, limit, cursor);

      const nextCursor = polls.length === limit ? polls[polls.length - 1].created_at : null;
      return res.status(200).json({ polls, nextCursor });
    } catch (err) {
      console.error('[PollController] getPolls error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /groups/:id/polls/:pollId
   */
  static async getPoll(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id: groupId, pollId } = req.params as { id: string; pollId: string };
      const isMember = await GroupRepository.isGroupMember(groupId, userId);
      if (!isMember) return res.status(403).json({ error: 'Not a member' });

      const poll = await PollRepository.getPoll(pollId, userId);
      return res.status(200).json(poll);
    } catch (err: any) {
      if (err.message === 'Poll not found') return res.status(404).json({ error: err.message });
      console.error('[PollController] getPoll error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
